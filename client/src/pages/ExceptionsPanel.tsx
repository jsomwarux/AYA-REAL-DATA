import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { fetchExpansionExceptions, type ExceptionItem } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rollupByPart } from "@shared/lib/partRollup";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, ChevronRight, PackageSearch, Boxes } from "lucide-react";

// ---------------------------------------------------------------------------
// Tiers — grouped by the plain-language REASON, not "loud/attention" jargon.
// Damaged is split from Not Found (different action: replace vs re-order).
// Reasons must match the endpoint's exceptionReason() output exactly.
// ---------------------------------------------------------------------------

type Tone = "red" | "orange" | "amber";

interface TierDef {
  key: string;
  label: string;
  caption: string; // one-line plain-English "what to do"
  tone: Tone;
  reasons: string[];
}

const TIER_DEFS: TierDef[] = [
  {
    key: "not-found",
    label: "Not Found",
    caption: 'Marked "Not Found" in the sheet. Locate these parts, or re-order them.',
    tone: "red",
    reasons: ["Not Found"],
  },
  {
    key: "damaged",
    label: "Damaged",
    caption: 'Marked "Damaged". Replace these or claim warranty — a different job from Not Found.',
    tone: "orange",
    reasons: ["Damaged"],
  },
  {
    key: "missing-parts",
    label: "Missing Parts",
    caption: 'Marked "Missing Parts". Check which pieces are missing.',
    tone: "red",
    reasons: ["Missing Parts"],
  },
  {
    key: "unknown-location",
    label: "Unknown Location",
    caption: "Location unknown. Track these down.",
    tone: "red",
    reasons: ["Unknown Location"],
  },
  {
    key: "partial-china",
    label: "Partial — rest in China",
    caption: "One container arrived. The rest is still in China — expect a follow-up shipment.",
    tone: "amber",
    reasons: ["Partial — rest in China"],
  },
  {
    key: "needs-confirming",
    label: "Needs confirming",
    caption: "The sheet asks to confirm these on site. Check the item or its location.",
    tone: "amber",
    reasons: ["Confirm Item", "On-Site / Missing Other"],
  },
];

const TONE: Record<Tone, { border: string; bg: string; text: string; chip: string; dot: string }> = {
  red: { border: "border-red-500/40", bg: "bg-red-500/10", text: "text-red-300", chip: "border-red-500/30 bg-red-500/15 text-red-200", dot: "bg-red-500" },
  orange: { border: "border-orange-500/40", bg: "bg-orange-500/10", text: "text-orange-300", chip: "border-orange-500/30 bg-orange-500/15 text-orange-200", dot: "bg-orange-500" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-200", chip: "border-amber-500/30 bg-amber-500/15 text-amber-200", dot: "bg-amber-400" },
};

/** Plain-language status label for a part row (drops write-implying "Confirm Item"). */
function statusLabel(reason: string): string {
  if (reason === "Confirm Item") return "Needs confirming";
  if (reason === "On-Site / Missing Other") return "On-site / missing";
  return reason;
}

function shortTab(sheetName: string): string {
  return sheetName.replace(/Distribution/i, "").replace(/Progress/i, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function towerChipClass(tower: string): string {
  return tower === "HR"
    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
    : "bg-purple-500/15 text-purple-300 border-purple-500/30";
}

// ---------------------------------------------------------------------------
// Grouping: tier → tab → PART TYPE (sorted by room count desc) → rooms
// ---------------------------------------------------------------------------

interface PartGroup {
  package: string;
  part: string;
  status: string; // status label(s) for this part
  rooms: { roomNo: string; tower: string; line: string; type: string }[];
}
interface TabPartGroup {
  tab: string;
  count: number; // total rooms (items) in this tab within the tier
  parts: PartGroup[];
}
interface Tier extends TierDef {
  tabs: TabPartGroup[];
  totalItems: number;
  distinctParts: number;
}

function buildTiers(items: ExceptionItem[], tabOrder: string[]): Tier[] {
  return TIER_DEFS.map((def) => {
    const tierItems = items.filter((i) => def.reasons.includes(i.reason));

    const tabs: TabPartGroup[] = tabOrder
      .map((tab) => {
        const ti = tierItems.filter((i) => i.tab === tab);
        // Same shared part-first rollup the Containers view uses.
        const parts: PartGroup[] = rollupByPart(ti, (i) => i.package, (i) => i.part).map((g) => ({
          package: g.package,
          part: g.part,
          status: [...new Set(g.items.map((i) => statusLabel(i.reason)))].join(" / "),
          rooms: g.items
            .map((i) => ({ roomNo: i.roomNo, tower: i.tower, line: i.line, type: i.type }))
            .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })),
        }));
        return { tab, count: ti.length, parts };
      })
      .filter((t) => t.count > 0);

    const totalItems = tierItems.length;
    const distinctParts = tabs.reduce((n, t) => n + t.parts.length, 0);
    return { ...def, tabs, totalItems, distinctParts };
  }).filter((tier) => tier.totalItems > 0);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExceptionsPanel() {
  useDocumentTitle("Exceptions");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expansion-exceptions"],
    queryFn: fetchExpansionExceptions,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const [tabFilter, setTabFilter] = useState<"all" | string>("all");
  const [towerFilter, setTowerFilter] = useState<"all" | "HR" | "LR">("all");

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Refreshed", "Re-scanned all room tabs for problem parts.");
    } catch {
      toastError("Refresh Failed", "Could not refresh. Please try again.");
    }
  };

  const allItems = data?.items ?? [];
  const tabsScanned = data?.tabsScanned ?? [];

  const tabOptions = useMemo(
    () => tabsScanned.filter((t) => towerFilter === "all" || allItems.some((i) => i.tab === t && i.tower === towerFilter)),
    [tabsScanned, towerFilter, allItems],
  );

  const filtered = useMemo(
    () => allItems.filter((i) => (towerFilter === "all" || i.tower === towerFilter) && (tabFilter === "all" || i.tab === tabFilter)),
    [allItems, towerFilter, tabFilter],
  );

  const tiers = useMemo(() => buildTiers(filtered, tabsScanned), [filtered, tabsScanned]);

  const notFoundCount = filtered.filter((i) => i.reason === "Not Found").length;
  const attentionCount = filtered.filter((i) => i.severity === "attention").length;
  const partTypes = useMemo(() => new Set(filtered.map((i) => `${i.tab}||${i.package}||${i.part}`)).size, [filtered]);

  const lastUpdated = data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : null;

  return (
    <DashboardLayout
      title="Exceptions"
      subtitle={lastUpdated ? `Problem parts across all room tabs · synced ${lastUpdated}` : "Problem parts across all room tabs"}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Couldn't load exceptions</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Scanning all 4 room tabs…
        </div>
      )}

      {data && (
        <>
          {/* Count cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CountCard label="Not Found" value={notFoundCount} tone="red" icon={PackageSearch} />
            <CountCard label="Needs attention" value={attentionCount} tone="amber" icon={AlertTriangle} />
            <CountCard label="Part types affected" value={partTypes} tone="slate" icon={Boxes} />
          </div>

          {data.missingTabs.length > 0 && (
            <Card className="mb-5 border-amber-500/30 bg-amber-500/10">
              <CardContent className="flex items-center gap-3 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <span className="text-amber-100">Could not read: {data.missingTabs.join(", ")}. Those tabs are excluded.</span>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="mb-6 space-y-3">
            <FilterRow label="Tower">
              <FilterButton active={towerFilter === "all"} onClick={() => setTowerFilter("all")}>All</FilterButton>
              {(["HR", "LR"] as const).map((t) => (
                <FilterButton key={t} active={towerFilter === t} onClick={() => { setTowerFilter(t); setTabFilter("all"); }}>{t}</FilterButton>
              ))}
            </FilterRow>
            <FilterRow label="Tab">
              <FilterButton active={tabFilter === "all"} onClick={() => setTabFilter("all")}>All</FilterButton>
              {tabOptions.map((t) => (
                <FilterButton key={t} active={tabFilter === t} onClick={() => setTabFilter(t)}>{shortTab(t)}</FilterButton>
              ))}
            </FilterRow>
          </div>

          {data.counts.total === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10 text-emerald-400" />} title="All clear" body="No Not Found, Damaged, Missing Parts, Unknown Location, or partial-arrival items on any room tab." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />} title="Nothing matches your filters" body="Try widening the tower or tab filter." />
          ) : (
            <div className="space-y-6">
              {/* Visual priority ranking of the worst Not Found gaps (respects filters) */}
              <NotFoundChart items={filtered.filter((i) => i.reason === "Not Found")} />
              {tiers.map((tier) => (
                <TierSection key={tier.key} tier={tier} />
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal bar chart of the top ~12 most-missing part types by room count —
 *  the worst procurement gaps at a glance. Reflects the passed (filtered) items. */
const CHART_TOP = 12;
function NotFoundChart({ items }: { items: ExceptionItem[] }) {
  const bars = useMemo(() => {
    const groups = rollupByPart(items, (i) => i.package, (i) => i.part);
    return groups
      .map((g) => ({ package: g.package, part: g.part, count: new Set(g.items.map((i) => `${i.tower}:${i.roomNo}`)).size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_TOP);
  }, [items]);

  if (bars.length === 0) return null;
  const max = bars[0].count || 1;

  return (
    <Card className="border-red-500/30 bg-red-500/[0.05]">
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PackageSearch className="h-4 w-4 text-red-300" />
          <h3 className="text-sm font-semibold text-red-200">Biggest procurement gaps — most-missing parts</h3>
          <span className="text-xs text-muted-foreground">top {bars.length} Not Found, by rooms</span>
        </div>
        <ul className="space-y-1.5">
          {bars.map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="w-32 flex-shrink-0 truncate text-right text-white/90 sm:w-44" title={`${b.package} · ${b.part}`}>{b.part}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
                <div className="flex h-full items-center justify-end rounded bg-red-500/70 pr-1.5" style={{ width: `${Math.max((b.count / max) * 100, 6)}%` }}>
                  <span className="text-[10px] font-semibold tabular-nums text-white">{b.count}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CountCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: Tone | "slate"; icon: typeof PackageSearch }) {
  const cls = tone === "slate" ? { border: "border-white/10", bg: "bg-white/5", text: "text-muted-foreground" } : TONE[tone];
  return (
    <Card className={cn("border", cls.border, cls.bg)}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className={cn("h-7 w-7", cls.text)} />
      </CardContent>
    </Card>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("h-8 border-white/10 px-3 text-xs", active ? "bg-white/15 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white")}
    >
      {children}
    </Button>
  );
}

function TierSection({ tier }: { tier: Tier }) {
  const tone = TONE[tier.tone];
  return (
    <section>
      <div className={cn("mb-1 flex items-center gap-2 rounded-lg border px-4 py-2.5", tone.border, tone.bg)}>
        <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
        <h2 className={cn("text-sm font-semibold uppercase tracking-wide", tone.text)}>{tier.label}</h2>
        <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold", tone.chip)}>
          {tier.totalItems} in {tier.distinctParts} part type{tier.distinctParts > 1 ? "s" : ""}
        </span>
      </div>
      <p className="mb-3 pl-1 text-xs text-muted-foreground">{tier.caption}</p>

      <div className="space-y-4 pl-1">
        {tier.tabs.map((tabGroup) => (
          <div key={tabGroup.tab}>
            <h3 className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
              {shortTab(tabGroup.tab)}
              <span className="text-xs font-normal text-muted-foreground">({tabGroup.parts.length} part types · {tabGroup.count} rooms)</span>
            </h3>
            <div className="space-y-1">
              {tabGroup.parts.map((pg) => (
                <PartRow key={`${pg.package}||${pg.part}`} pg={pg} tone={tier.tone} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PartRow({ pg, tone }: { pg: PartGroup; tone: Tone }) {
  const [open, setOpen] = useState(false);
  const t = TONE[tone];
  return (
    <div className="rounded border border-white/10 bg-white/[0.02]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
        <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">{pg.package}</span>
          <span className="text-muted-foreground/40"> · </span>
          <span className="text-sm font-medium text-white">{pg.part}</span>
        </span>
        <span className={cn("flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium", t.chip)}>{pg.status}</span>
        <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-white">{pg.rooms.length}</span>
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">rooms</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 p-2.5">
          {pg.rooms.map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px]">
              <span className={cn("rounded border px-1 text-[9px] font-medium", towerChipClass(r.tower))}>{r.tower}</span>
              <span className="text-white/90">{r.roomNo}</span>
              {r.type && <span className="text-muted-foreground/70">{r.type}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      {icon}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
