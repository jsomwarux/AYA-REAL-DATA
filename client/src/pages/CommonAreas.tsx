import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  fetchCommonArea,
  fetchLobby,
  type CommonAreaResponse,
  type CommonAreaFloor,
  type LobbyResponse,
  type LobbyTask,
  type StatusState,
} from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Check, Loader2, Flag } from "lucide-react";

// ---------------------------------------------------------------------------
// Status styling (§7.3 common-area states)
// ---------------------------------------------------------------------------
const STATUS: Record<StatusState, { cell: string; dot: string; label: string }> = {
  done: { cell: "bg-emerald-500/80", dot: "bg-emerald-500", label: "Done" },
  "in-progress": { cell: "bg-sky-500/70", dot: "bg-sky-500", label: "In progress" },
  blocker: { cell: "bg-red-500/80 ring-1 ring-red-300/60", dot: "bg-red-500", label: "Blocker" },
  "in-motion": { cell: "bg-amber-500/70", dot: "bg-amber-500", label: "Ordered" },
  "not-started": { cell: "bg-white/10", dot: "bg-white/30", label: "Not started" },
  other: { cell: "bg-fuchsia-500/40", dot: "bg-fuchsia-500", label: "Other" },
};
const LEGEND_ORDER: StatusState[] = ["done", "in-progress", "in-motion", "blocker", "not-started", "other"];

function Legend({ blockerLabel }: { blockerLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {LEGEND_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS[s].dot)} />
          {s === "blocker" ? blockerLabel : STATUS[s].label}
        </span>
      ))}
    </div>
  );
}

function CompletionBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {pct}% · {done}/{total} tasks done
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floor × task heatmap (Corridors + each Staircase section)
// ---------------------------------------------------------------------------
function Heatmap({
  floors,
  headers,
  section,
}: {
  floors: CommonAreaFloor[];
  headers: string[];
  section?: "A" | "B";
}) {
  const tasksFor = (f: CommonAreaFloor) => (section ? f.tasks.filter((t) => t.section === section) : f.tasks);
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background px-2 text-left text-[10px] font-medium text-muted-foreground">Floor</th>
            <th className="px-1 text-[10px] font-medium text-muted-foreground" title="WHITE BOX">WB</th>
            <th className="px-1 text-[10px] font-medium text-muted-foreground" title="FULLY COMPLETED / FULLY DONE">FC</th>
            {headers.map((h, i) => (
              <th key={i} className="w-6 px-0 text-[9px] font-normal text-muted-foreground" title={h}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {floors.map((f) => {
            const tasks = tasksFor(f);
            return (
              <tr key={f.floor}>
                <td className="sticky left-0 z-10 bg-background px-2 text-xs font-medium text-white">{f.floor}</td>
                <td className="px-1 text-center">{f.whiteBox && <Check className="mx-auto h-3 w-3 text-emerald-400" />}</td>
                <td className="px-1 text-center">
                  {f.mismatch ? (
                    <AlertTriangle className="mx-auto h-3 w-3 text-amber-400" aria-label="Marked complete but tasks aren't all done" />
                  ) : (
                    f.fullyComplete && <Check className="mx-auto h-3 w-3 text-emerald-400" />
                  )}
                </td>
                {tasks.map((t, i) => (
                  <td key={i} className="p-0">
                    <div
                      className={cn("h-6 w-6 rounded-sm", STATUS[t.status].cell)}
                      title={`${f.floor} · ${t.header}: ${t.rawValue || "(blank)"} [${STATUS[t.status].label}]`}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TaskKey({ headers }: { headers: string[] }) {
  return (
    <details className="mt-3 text-[11px] text-muted-foreground">
      <summary className="cursor-pointer select-none hover:text-white">Task key (1–{headers.length})</summary>
      <ol className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
        {headers.map((h, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="w-5 flex-shrink-0 text-right tabular-nums text-muted-foreground/60">{i + 1}.</span>
            <span>{h}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function tallyFloors(floors: CommonAreaFloor[], section?: "A" | "B") {
  let done = 0,
    total = 0;
  for (const f of floors) {
    for (const t of f.tasks) {
      if (section && t.section !== section) continue;
      total++;
      if (t.status === "done") done++;
    }
  }
  return { done, total };
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------
function CorridorsView({ data }: { data: CommonAreaResponse }) {
  const headers = data.floors[0]?.tasks.map((t) => t.header) ?? [];
  const tally = useMemo(() => tallyFloors(data.floors), [data.floors]);
  const mismatches = data.floors.filter((f) => f.mismatch);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompletionBar done={tally.done} total={tally.total} />
        <Legend blockerLabel="Waiting on product" />
      </div>
      {mismatches.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {mismatches.length} floor{mismatches.length > 1 ? "s" : ""} marked FULLY COMPLETED but tasks aren't all done: {mismatches.map((f) => f.floor).join(", ")}
        </p>
      )}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-3">
          <Heatmap floors={data.floors} headers={headers} />
          <TaskKey headers={headers} />
        </CardContent>
      </Card>
    </div>
  );
}

function StaircaseView({ data }: { data: CommonAreaResponse }) {
  const headersA = data.floors[0]?.tasks.filter((t) => t.section === "A").map((t) => t.header) ?? [];
  const headersB = data.floors[0]?.tasks.filter((t) => t.section === "B").map((t) => t.header) ?? [];
  const tally = useMemo(() => tallyFloors(data.floors), [data.floors]);
  const mismatches = data.floors.filter((f) => f.mismatch);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompletionBar done={tally.done} total={tally.total} />
        <Legend blockerLabel="Blocker" />
      </div>
      {mismatches.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {mismatches.length} floor{mismatches.length > 1 ? "s" : ""} marked FULLY DONE but tasks aren't all done: {mismatches.map((f) => f.floor).join(", ")}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardContent className="p-3">
            <h3 className="mb-2 text-sm font-semibold text-white">Section A <span className="text-xs font-normal text-muted-foreground">({headersA.length} tasks)</span></h3>
            <Heatmap floors={data.floors} headers={headersA} section="A" />
            <TaskKey headers={headersA} />
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardContent className="p-3">
            <h3 className="mb-2 text-sm font-semibold text-white">Section B <span className="text-xs font-normal text-muted-foreground">({headersB.length} tasks)</span></h3>
            <Heatmap floors={data.floors} headers={headersB} section="B" />
            <TaskKey headers={headersB} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const LOBBY_GROUP_ORDER: StatusState[] = ["blocker", "in-progress", "in-motion", "not-started", "done", "other"];

function LobbyView({ data }: { data: LobbyResponse }) {
  const groups = useMemo(() => {
    const byStatus = new Map<StatusState, LobbyTask[]>();
    for (const t of data.tasks) {
      const list = byStatus.get(t.status);
      if (list) list.push(t);
      else byStatus.set(t.status, [t]);
    }
    return LOBBY_GROUP_ORDER.filter((s) => byStatus.has(s)).map((s) => ({ status: s, tasks: byStatus.get(s)! }));
  }, [data.tasks]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompletionBar done={data.completion.done} total={data.completion.total} />
        <Legend blockerLabel="Need to order" />
      </div>
      <div className="space-y-3">
        {groups.map(({ status, tasks }) => (
          <Card key={status} className={cn("border-white/10 bg-white/[0.02]", status === "blocker" && "border-red-500/30 bg-red-500/[0.04]")}>
            <CardContent className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS[status].dot)} />
                <span className={status === "blocker" ? "text-red-300" : "text-white"}>{status === "blocker" ? "Need to order" : STATUS[status].label}</span>
                <span className="text-muted-foreground">({tasks.length})</span>
              </div>
              <ul className="space-y-1">
                {tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", STATUS[status].dot)} />
                    <span className="text-white/90">{t.task}</span>
                    {t.flagged && (
                      <span className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1 text-[10px] text-red-300">
                        <Flag className="h-2.5 w-2.5" /> flagged
                      </span>
                    )}
                    {t.rawValue && t.status !== "done" && <span className="text-muted-foreground/70">— {t.rawValue}</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
type View = "corridors" | "staircase" | "lobby";

export default function CommonAreas() {
  useDocumentTitle("Common Areas");
  const [view, setView] = useState<View>("corridors");

  const corridors = useQuery({ queryKey: ["expansion-corridors"], queryFn: () => fetchCommonArea("corridors"), retry: false, staleTime: 1000 * 60 * 2 });
  const staircase = useQuery({ queryKey: ["expansion-staircase"], queryFn: () => fetchCommonArea("staircase"), retry: false, staleTime: 1000 * 60 * 2 });
  const lobby = useQuery({ queryKey: ["expansion-lobby"], queryFn: fetchLobby, retry: false, staleTime: 1000 * 60 * 2 });

  const active = view === "corridors" ? corridors : view === "staircase" ? staircase : lobby;

  const handleRefresh = async () => {
    try {
      await Promise.all([corridors.refetch(), staircase.refetch(), lobby.refetch()]);
      toastSuccess("Refreshed", "Common-area data updated.");
    } catch {
      toastError("Refresh failed", "Could not refresh. Try again.");
    }
  };

  return (
    <DashboardLayout title="Common Areas" subtitle="Corridors · Staircase · Temp/Lobby" onRefresh={handleRefresh} isLoading={active.isLoading}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["corridors", "staircase", "lobby"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              view === v ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white",
            )}
          >
            {v === "lobby" ? "Temp / Lobby" : v}
          </button>
        ))}
      </div>

      {active.error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Couldn't load {view}</p>
              <p className="text-sm text-muted-foreground">{(active.error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {active.isLoading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading {view}…
        </div>
      )}

      {view === "corridors" && corridors.data && <CorridorsView data={corridors.data} />}
      {view === "staircase" && staircase.data && <StaircaseView data={staircase.data} />}
      {view === "lobby" && lobby.data && <LobbyView data={lobby.data} />}
    </DashboardLayout>
  );
}
