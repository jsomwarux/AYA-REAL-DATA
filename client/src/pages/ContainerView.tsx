import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  fetchExpansionContainers,
  type ContainersResponse,
  type StageGroup,
  type OutstandingPart,
  type ContainerGroup,
  type ContainerBlockedPart,
  type DeliveryStage,
} from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { rollupByPart } from "@shared/lib/partRollup";
import { AlertCircle, ChevronRight, Loader2, Container as ContainerIcon, Search, ArrowRight, ShieldAlert } from "lucide-react";

// Incoming stages, ordered closest-to-here → furthest (matches engine order).
const STAGE_META: Record<string, { label: string; dot: string; ring: string; desc: string }> = {
  "in-ny-port": { label: "In NY Port", dot: "bg-emerald-500", ring: "border-emerald-500/30", desc: "Stateside, awaiting pickup" },
  "in-transit": { label: "In transit", dot: "bg-teal-500", ring: "border-teal-500/30", desc: "En route / on the water" },
  "partial-china": { label: "Partial — rest in China", dot: "bg-amber-500", ring: "border-amber-500/40", desc: "Some here, rest still in China" },
  "in-china": { label: "In China / Remaining", dot: "bg-orange-500", ring: "border-orange-500/30", desc: "Still in China" },
  "in-production": { label: "In Production", dot: "bg-orange-600", ring: "border-orange-600/30", desc: "Being made in the factory" },
  "production-needed": { label: "Production Needed", dot: "bg-red-500", ring: "border-red-500/40", desc: "Not yet ordered to be made" },
  unrecorded: { label: "No status entered", dot: "bg-fuchsia-500", ring: "border-fuchsia-500/30", desc: "No delivery status filled in the sheet" },
};

type Tower = "all" | "HR" | "LR";
type View = "stage" | "partials" | "lens";

interface Filters {
  tower: Tower;
  floor: string;
  pkg: string;
  roomQ: string;
}
function matchPart(p: OutstandingPart, f: Filters): boolean {
  if (f.tower !== "all" && p.tower !== f.tower) return false;
  if (f.floor !== "all" && p.floor !== f.floor) return false;
  if (f.pkg !== "all" && p.package !== f.pkg) return false;
  if (f.roomQ.trim() && !p.roomNo.includes(f.roomQ.trim())) return false;
  return true;
}
function floorNum(s: string) {
  const n = parseInt((s || "").replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export default function ContainerView() {
  useDocumentTitle("Containers");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expansion-containers"],
    queryFn: fetchExpansionContainers,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const [view, setView] = useState<View>("stage");
  const [filters, setFilters] = useState<Filters>({ tower: "all", floor: "all", pkg: "all", roomQ: "" });
  const [containerQ, setContainerQ] = useState("");

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Refreshed", "Delivery data updated.");
    } catch {
      toastError("Refresh failed", "Could not refresh. Try again.");
    }
  };

  const allParts = useMemo(() => (data?.stages ?? []).flatMap((s) => s.parts), [data]);
  const floors = useMemo(
    () => [...new Set(allParts.map((p) => p.floor).filter(Boolean))].sort((a, b) => floorNum(b) - floorNum(a)),
    [allParts],
  );
  const packages = useMemo(() => [...new Set(allParts.map((p) => p.package))].sort(), [allParts]);

  const subtitle = data
    ? `${data.summary.incoming.toLocaleString()} parts still incoming · ${data.summary.received.toLocaleString()} on site / received`
    : "Outstanding parts by delivery stage";

  return (
    <DashboardLayout title="Containers" subtitle={subtitle} onRefresh={handleRefresh} isLoading={isLoading}>
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Couldn't load delivery data</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading delivery status…
        </div>
      )}

      {data && (
        <>
          {/* Header chips: incoming / received / problems (→ Exceptions) */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
              <span className="font-semibold">{data.summary.incoming.toLocaleString()}</span> still incoming
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
              <span className="font-semibold">{data.summary.received.toLocaleString()}</span> on site / received
            </span>
            <Link href="/exceptions" className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200 hover:bg-red-500/20">
              <ShieldAlert className="h-3 w-3" />
              <span className="font-semibold">{data.summary.problems.toLocaleString()}</span> Not Found / Damaged
              <ArrowRight className="h-3 w-3" />
            </Link>
            {data.missingTabs.length > 0 && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">unread: {data.missingTabs.join(", ")}</span>
            )}
          </div>

          {/* Convention caveat (§3.3) */}
          <p className="mb-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-white/80">Note:</span> "Received" assumes a <span className="font-mono">Container N</span> cell means the container has landed. If your team
            assigns container numbers <em>before</em> arrival, received will over-count — confirm the convention with the site team.
          </p>

          {/* View switcher */}
          <div className="mb-4 flex flex-wrap gap-2">
            {([["stage", "By stage"], ["partials", `Partials (${data.summary.partials})`], ["lens", "Container lens"]] as [View, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filters (stage + partials views) */}
          {view !== "lens" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              {(["all", "HR", "LR"] as Tower[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilters((f) => ({ ...f, tower: t }))}
                  className={cn("rounded-md border px-2.5 py-1.5 font-medium transition-colors", filters.tower === t ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white")}
                >
                  {t === "all" ? "All towers" : t}
                </button>
              ))}
              <SelectFilter label="Floor" value={filters.floor} onChange={(v) => setFilters((f) => ({ ...f, floor: v }))} options={floors} />
              <SelectFilter label="Package" value={filters.pkg} onChange={(v) => setFilters((f) => ({ ...f, pkg: v }))} options={packages} />
              <div className="relative ml-auto">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={filters.roomQ}
                  onChange={(e) => setFilters((f) => ({ ...f, roomQ: e.target.value }))}
                  placeholder="Jump to room #"
                  inputMode="numeric"
                  className="w-36 rounded-md border border-white/10 bg-white/5 py-1.5 pl-7 pr-2 text-white placeholder:text-muted-foreground focus:border-teal-500/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          {view === "stage" && <StageView stages={data.stages} filters={filters} />}
          {view === "partials" && <PartialsView stages={data.stages} filters={filters} />}
          {view === "lens" && <ContainerLens containers={data.containers} containerQ={containerQ} setContainerQ={setContainerQ} />}
        </>
      )}
    </DashboardLayout>
  );
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center gap-1.5 text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:border-teal-500/50 focus:outline-none"
      >
        <option value="all" className="bg-zinc-900">All</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-zinc-900">{o}</option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// By-stage view
// ---------------------------------------------------------------------------
function StageView({ stages, filters }: { stages: StageGroup[]; filters: Filters }) {
  const [open, setOpen] = useState<Set<DeliveryStage>>(new Set());
  const toggle = (s: DeliveryStage) => setOpen((p) => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const filtered = stages.map((g) => ({ ...g, shown: g.parts.filter((p) => matchPart(p, filters)) }));
  const totalShown = filtered.reduce((n, g) => n + g.shown.length, 0);
  const unrecordedTotal = stages.find((s) => s.stage === "unrecorded")?.parts.length ?? 0;

  if (totalShown === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No outstanding parts match these filters.</p>;

  return (
    <div className="space-y-2">
      {/* Data-quality banner: the blank bucket is the largest and drags every % down */}
      {unrecordedTotal > 0 && (
        <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/[0.07] p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-fuchsia-300" />
            <p className="text-xs leading-relaxed text-fuchsia-100">
              <span className="font-semibold">{unrecordedTotal.toLocaleString()} parts have no delivery status entered in the sheet.</span>{" "}
              They count as not-received and lower your progress numbers — this may just be a missing sheet entry, not parts truly missing.
              See the "No status entered" group below.
            </p>
          </div>
        </div>
      )}
      {filtered.map((g) =>
        g.shown.length === 0 ? null : (
          <div key={g.stage} className={cn("overflow-hidden rounded-lg border bg-white/[0.02]", STAGE_META[g.stage]?.ring ?? "border-white/10")}>
            <button onClick={() => toggle(g.stage)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open.has(g.stage) && "rotate-90")} />
              <span className={cn("h-2.5 w-2.5 rounded-sm", STAGE_META[g.stage]?.dot)} />
              <span className="font-semibold text-white">{STAGE_META[g.stage]?.label ?? g.stage}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{STAGE_META[g.stage]?.desc}</span>
              <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white">{g.shown.length}</span>
            </button>
            {open.has(g.stage) && <PartsList parts={g.shown} />}
          </div>
        ),
      )}
    </div>
  );
}

const PART_CAP = 40;
/** Part-first: one line per (package, part) with a room count, sorted desc; expand
 *  a part → its rooms. Collapses e.g. 126 identical Transformer Door rows to 1. */
function PartsList({ parts }: { parts: OutstandingPart[] }) {
  const groups = useMemo(() => rollupByPart(parts, (p) => p.package, (p) => p.part), [parts]);
  const [all, setAll] = useState(false);
  const shown = all ? groups : groups.slice(0, PART_CAP);
  return (
    <div className="border-t border-white/10 p-2">
      <ul className="space-y-0.5">
        {shown.map((g, i) => (
          <PartRollupRow key={i} pkg={g.package} part={g.part} rooms={g.items} />
        ))}
      </ul>
      {!all && groups.length > PART_CAP && (
        <button onClick={() => setAll(true)} className="mt-2 text-xs font-medium text-teal-300 hover:text-teal-200">
          Show all {groups.length} part types (+{groups.length - PART_CAP} more) — or narrow with filters
        </button>
      )}
    </div>
  );
}

function PartRollupRow({ pkg, part, rooms }: { pkg: string; part: string; rooms: OutstandingPart[] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-white/5">
        <ChevronRight className={cn("h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="text-xs text-muted-foreground">{pkg}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="min-w-0 truncate text-sm text-white/90">{part}</span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-white">{rooms.length}</span>
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">rooms</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
          {rooms
            .slice()
            .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
            .map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px]">
                <span className={cn("rounded px-1 text-[9px] font-medium", r.tower === "HR" ? "bg-blue-500/15 text-blue-200" : "bg-purple-500/15 text-purple-200")}>{r.tower}</span>
                <span className="text-white/90">{r.roomNo}</span>
                {r.rawValue?.trim() && <span className="font-mono text-[9px] text-muted-foreground">{r.rawValue}</span>}
              </span>
            ))}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Partials view (first-class — all "& In China")
// ---------------------------------------------------------------------------
function PartialsView({ stages, filters }: { stages: StageGroup[]; filters: Filters }) {
  const partials = stages.find((s) => s.stage === "partial-china");
  const shown = (partials?.parts ?? []).filter((p) => matchPart(p, filters));
  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.04]">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
          Partial arrivals — started, pieces still in China
          <span className="text-muted-foreground">({shown.length})</span>
        </div>
        {shown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No partial arrivals match these filters.</p>
        ) : (
          <PartsList parts={shown} />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Container lens (secondary, summary-first)
// ---------------------------------------------------------------------------
function ContainerLens({ containers, containerQ, setContainerQ }: { containers: ContainerGroup[]; containerQ: string; setContainerQ: (v: string) => void }) {
  const shown = useMemo(() => {
    const n = parseInt(containerQ.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? containers : containers.filter((c) => c.number === n);
  }, [containers, containerQ]);

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-2 text-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={containerQ}
            onChange={(e) => setContainerQ(e.target.value)}
            placeholder="Jump to container #"
            inputMode="numeric"
            className="w-44 rounded-md border border-white/10 bg-white/5 py-1.5 pl-7 pr-2 text-white placeholder:text-muted-foreground focus:border-teal-500/50 focus:outline-none"
          />
        </div>
        <span className="text-muted-foreground">Summary first — expand for the part breakdown.</span>
      </div>
      {shown.map((c) => (
        <ContainerCard key={c.number} c={c} />
      ))}
    </div>
  );
}

function floorSpan(entries: ContainerBlockedPart[]): string {
  const nums = entries.map((e) => floorNum(e.floor)).filter((n) => n > 0);
  if (nums.length === 0) return "—";
  const lo = Math.min(...nums), hi = Math.max(...nums);
  return lo === hi ? `Floor ${hi}` : `Floors ${hi}–${lo}`;
}

function ContainerCard({ c }: { c: ContainerGroup }) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState(false);

  const byPart = useMemo(() => {
    const m = new Map<string, { pkg: string; part: string; rooms: Set<string> }>();
    for (const e of c.entries) {
      const k = `${e.package}|${e.part}`;
      let g = m.get(k);
      if (!g) { g = { pkg: e.package, part: e.part, rooms: new Set() }; m.set(k, g); }
      g.rooms.add(`${e.tower}:${e.roomNo}`);
    }
    return [...m.values()].sort((a, b) => b.rooms.size - a.rooms.size);
  }, [c.entries]);

  const packages = useMemo(() => [...new Set(c.entries.map((e) => e.package))], [c.entries]);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-white/5">
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <ContainerIcon className="h-5 w-5 text-cyan-300" />
        <span className="font-semibold text-white">Container {c.number}</span>
        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
          {c.arrived ? "delivered" : "pending"}
        </span>
        <span className="text-xs text-muted-foreground">{c.roomCount} rooms · {c.partCount} parts · {floorSpan(c.entries)}</span>
        {c.partialCount > 0 && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">{c.partialCount} partial</span>}
        <span className="ml-auto flex flex-wrap gap-1">
          {packages.slice(0, 5).map((p) => (
            <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">{p}</span>
          ))}
          {packages.length > 5 && <span className="text-[10px] text-muted-foreground">+{packages.length - 5}</span>}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-3">
          {/* Grouped BY PART, not 1 row per room */}
          <ul className="space-y-1">
            {byPart.map((g, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
                <span className="text-muted-foreground">{g.pkg}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-white/90">{g.part}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">→ {g.rooms.size} room{g.rooms.size > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setManifest((v) => !v)} className="mt-3 text-xs font-medium text-teal-300 hover:text-teal-200">
            {manifest ? "Hide full manifest" : "View full manifest (room × part)"}
          </button>
          {manifest && (
            <ul className="mt-2 max-h-80 space-y-0.5 overflow-y-auto border-t border-white/10 pt-2">
              {c.entries.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={cn("rounded px-1 text-[10px]", e.tower === "HR" ? "bg-blue-500/15 text-blue-200" : "bg-purple-500/15 text-purple-200")}>{e.tower}</span>
                  <span className="font-medium text-white">{e.roomNo}</span>
                  <span className="text-muted-foreground">{e.package}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-white/90">{e.part}</span>
                  {e.partial && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 text-[10px] text-amber-200">partial</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
