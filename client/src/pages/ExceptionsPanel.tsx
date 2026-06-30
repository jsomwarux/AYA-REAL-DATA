import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { fetchExpansionExceptions, type ExceptionItem, type ExceptionSeverity } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Loader2, MapPin } from "lucide-react";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

type TabFilter = "all" | string;
type TowerFilter = "all" | "HR" | "LR";

const SEVERITY_META: Record<
  ExceptionSeverity,
  { label: string; icon: typeof ShieldAlert; ring: string; chip: string; dot: string; header: string }
> = {
  loud: {
    label: "Loud — Lost / Damaged",
    icon: ShieldAlert,
    ring: "border-red-500/40 bg-red-500/10",
    chip: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-500",
    header: "text-red-300",
  },
  attention: {
    label: "Attention",
    icon: AlertTriangle,
    ring: "border-amber-500/40 bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    dot: "bg-amber-400",
    header: "text-amber-200",
  },
};

const SEVERITY_ORDER: ExceptionSeverity[] = ["loud", "attention"];

/** Shorten the full sheet name for chips/filters. */
function shortTab(sheetName: string): string {
  return sheetName
    .replace(/Distribution/i, "")
    .replace(/Progress/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function towerChipClass(tower: string): string {
  return tower === "HR"
    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
    : "bg-purple-500/15 text-purple-300 border-purple-500/30";
}

// ---------------------------------------------------------------------------
// Grouping: severity → tab → room → items
// ---------------------------------------------------------------------------

interface RoomGroup {
  roomNo: string;
  line: string;
  type: string;
  tower: string;
  items: ExceptionItem[];
}
interface TabGroup {
  tab: string;
  count: number;
  rooms: RoomGroup[];
}
interface SeverityGroup {
  severity: ExceptionSeverity;
  count: number;
  tabs: TabGroup[];
}

function groupExceptions(items: ExceptionItem[], tabOrder: string[]): SeverityGroup[] {
  return SEVERITY_ORDER.map((severity) => {
    const sevItems = items.filter((i) => i.severity === severity);

    // Group by tab, preserving the scanned tab order.
    const tabs: TabGroup[] = tabOrder
      .map((tab) => {
        const tabItems = sevItems.filter((i) => i.tab === tab);
        const roomMap = new Map<string, RoomGroup>();
        for (const item of tabItems) {
          let room = roomMap.get(item.roomNo);
          if (!room) {
            room = { roomNo: item.roomNo, line: item.line, type: item.type, tower: item.tower, items: [] };
            roomMap.set(item.roomNo, room);
          }
          room.items.push(item);
        }
        return { tab, count: tabItems.length, rooms: [...roomMap.values()] };
      })
      .filter((t) => t.count > 0);

    return { severity, count: sevItems.length, tabs };
  }).filter((g) => g.count > 0);
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

  const [tabFilter, setTabFilter] = useState<TabFilter>("all");
  const [towerFilter, setTowerFilter] = useState<TowerFilter>("all");

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Refreshed", "Exceptions re-scanned across all room tabs.");
    } catch {
      toastError("Refresh Failed", "Could not refresh exceptions. Please try again.");
    }
  };

  const allItems = data?.items ?? [];
  const tabsScanned = data?.tabsScanned ?? [];

  // Tab filter options are constrained by the active tower filter.
  const tabOptions = useMemo(
    () =>
      tabsScanned.filter((t) => {
        if (towerFilter === "all") return true;
        return allItems.some((i) => i.tab === t && i.tower === towerFilter);
      }),
    [tabsScanned, towerFilter, allItems],
  );

  const filtered = useMemo(
    () =>
      allItems.filter(
        (i) =>
          (towerFilter === "all" || i.tower === towerFilter) &&
          (tabFilter === "all" || i.tab === tabFilter),
      ),
    [allItems, towerFilter, tabFilter],
  );

  const loudCount = filtered.filter((i) => i.severity === "loud").length;
  const attentionCount = filtered.filter((i) => i.severity === "attention").length;

  const grouped = useMemo(() => groupExceptions(filtered, tabsScanned), [filtered, tabsScanned]);

  const lastUpdated = data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : null;

  return (
    <DashboardLayout
      title="Exceptions"
      subtitle={lastUpdated ? `Lost & flagged items · synced ${lastUpdated}` : "Lost & flagged items across all room tabs"}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Error */}
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

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Scanning all 4 room tabs…
        </div>
      )}

      {data && (
        <>
          {/* Severity count badges (live with filters) */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SeverityCountCard severity="loud" count={loudCount} />
            <SeverityCountCard severity="attention" count={attentionCount} />
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Total shown</p>
                  <p className="text-2xl font-bold text-white">{filtered.length}</p>
                </div>
                <ShieldAlert className="h-7 w-7 text-muted-foreground/50" />
              </CardContent>
            </Card>
          </div>

          {/* Missing-tab warning */}
          {data.missingTabs.length > 0 && (
            <Card className="mb-5 border-amber-500/30 bg-amber-500/10">
              <CardContent className="flex items-center gap-3 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <span className="text-amber-100">
                  Could not read: {data.missingTabs.join(", ")}. Those tabs are excluded from this view.
                </span>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="mb-6 space-y-3">
            <FilterRow label="Tower">
              <FilterButton active={towerFilter === "all"} onClick={() => setTowerFilter("all")}>
                All
              </FilterButton>
              {(["HR", "LR"] as const).map((t) => (
                <FilterButton
                  key={t}
                  active={towerFilter === t}
                  onClick={() => {
                    setTowerFilter(t);
                    setTabFilter("all");
                  }}
                >
                  {t}
                </FilterButton>
              ))}
            </FilterRow>

            <FilterRow label="Tab">
              <FilterButton active={tabFilter === "all"} onClick={() => setTabFilter("all")}>
                All
              </FilterButton>
              {tabOptions.map((t) => (
                <FilterButton key={t} active={tabFilter === t} onClick={() => setTabFilter(t)}>
                  {shortTab(t)}
                </FilterButton>
              ))}
            </FilterRow>
          </div>

          {/* Empty states */}
          {data.counts.total === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10 text-emerald-400" />}
              title="All clear"
              body="No Damaged, Not Found, Unknown Location, Missing Parts, or partial-arrival items across any room tab."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
              title="No exceptions match your filters"
              body="Try widening the tower or tab filter."
            />
          ) : (
            <div className="space-y-8">
              {grouped.map((sevGroup) => (
                <SeveritySection key={sevGroup.severity} group={sevGroup} />
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

function SeverityCountCard({ severity, count }: { severity: ExceptionSeverity; count: number }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <Card className={cn("border", meta.ring)}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{meta.label}</p>
          <p className="text-2xl font-bold text-white">{count}</p>
        </div>
        <Icon className={cn("h-7 w-7", meta.header)} />
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 border-white/10 px-3 text-xs",
        active ? "bg-white/15 text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </Button>
  );
}

function SeveritySection({ group }: { group: SeverityGroup }) {
  const meta = SEVERITY_META[group.severity];
  const Icon = meta.icon;
  return (
    <section>
      <div className={cn("mb-3 flex items-center gap-2 rounded-lg border px-4 py-2.5", meta.ring)}>
        <Icon className={cn("h-5 w-5", meta.header)} />
        <h2 className={cn("text-sm font-semibold uppercase tracking-wide", meta.header)}>{meta.label}</h2>
        <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold", meta.chip)}>
          {group.count}
        </span>
      </div>

      <div className="space-y-5 pl-1">
        {group.tabs.map((tabGroup) => (
          <div key={tabGroup.tab}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              {shortTab(tabGroup.tab)}
              <span className="text-xs font-normal text-muted-foreground">({tabGroup.count})</span>
            </h3>
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {tabGroup.rooms.map((room) => (
                <RoomCard key={`${tabGroup.tab}-${room.roomNo}`} room={room} severity={group.severity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoomCard({ room, severity }: { room: RoomGroup; severity: ExceptionSeverity }) {
  const meta = SEVERITY_META[severity];
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardContent className="p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-white">Room {room.roomNo}</span>
          <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", towerChipClass(room.tower))}>
            {room.tower}
          </span>
          {(room.line || room.type) && (
            <span className="truncate text-xs text-muted-foreground">
              {[room.line, room.type].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <ul className="space-y-1.5">
          {room.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", meta.dot)} />
              <span className="flex-1 min-w-0">
                <span className="text-muted-foreground">{item.package}</span>
                <span className="text-muted-foreground/50"> · </span>
                <span className="text-white">{item.part}</span>
              </span>
              <span className={cn("flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium", meta.chip)}>
                {item.reason}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
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
