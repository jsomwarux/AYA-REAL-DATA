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
import { AlertCircle, AlertTriangle, Check, Loader2, Flag, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Status styling (§7.3 common-area states)
// ---------------------------------------------------------------------------
// StatusState palette — used for the Temp/Lobby segmented bar + grouped list.
const STATUS: Record<StatusState, { cell: string; dot: string; label: string }> = {
  done: { cell: "bg-emerald-500/80", dot: "bg-emerald-500", label: "Done" },
  "in-progress": { cell: "bg-sky-500/70", dot: "bg-sky-500", label: "In progress" },
  blocker: { cell: "bg-red-500/80", dot: "bg-red-500", label: "Blocker" },
  "in-motion": { cell: "bg-amber-500/80", dot: "bg-amber-500", label: "Ordered" },
  "not-started": { cell: "bg-slate-500/70", dot: "bg-slate-500", label: "Not started" },
  other: { cell: "bg-fuchsia-500/60", dot: "bg-fuchsia-500", label: "Other" },
};

// Cell coloring is by the EXACT sheet value, so every distinct status gets its own
// FILLED color — "Not Started" (slate) is distinct from "Not Yet" (violet), and neither
// renders blank. Keyed by normalized value (lowercase, collapsed spaces).
const VALUE_STYLE: Record<string, { cell: string; dot: string; label: string }> = {
  "completed": { cell: "bg-emerald-500/80", dot: "bg-emerald-500", label: "Completed" },
  "done": { cell: "bg-emerald-500/80", dot: "bg-emerald-500", label: "Done" },
  "in progress": { cell: "bg-sky-500/70", dot: "bg-sky-500", label: "In progress" },
  "waiting on product": { cell: "bg-red-500/80", dot: "bg-red-500", label: "Waiting on product" },
  "need to order": { cell: "bg-red-500/80", dot: "bg-red-500", label: "Need to order" },
  "ordered": { cell: "bg-amber-500/80", dot: "bg-amber-500", label: "Ordered" },
  "not started": { cell: "bg-slate-500/70", dot: "bg-slate-500", label: "Not Started" },
  "not yet": { cell: "bg-violet-500/60", dot: "bg-violet-500", label: "Not Yet" },
};
// The ONLY blank-rendered state: a genuinely empty sheet cell (explicitly labeled).
const NO_DATA = { cell: "border border-dashed border-white/25", dot: "border border-dashed border-white/40", label: "No data (empty cell)" };
const OTHER_VAL = { cell: "bg-fuchsia-500/60", dot: "bg-fuchsia-500", label: "Other" };

function normVal(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}
function styleForValue(raw: string | null | undefined): { cell: string; dot: string; label: string; key: string } {
  const n = normVal(raw);
  if (n === "") return { ...NO_DATA, key: "" };
  const s = VALUE_STYLE[n];
  if (s) return { ...s, key: n };
  return { ...OTHER_VAL, label: (raw ?? "").trim() || "Other", key: n };
}

// Legend is built from the values ACTUALLY present in the grid, so it matches the
// cells cell-for-cell (empty always shown last if present).
const VALUE_ORDER = ["completed", "done", "in progress", "ordered", "waiting on product", "need to order", "not started", "not yet"];
function presentValues(floors: CommonAreaFloor[], section?: "A" | "B") {
  const seen = new Map<string, { key: string; label: string; dot: string }>();
  for (const f of floors) for (const t of f.tasks) {
    if (section && t.section !== section) continue;
    const st = styleForValue(t.rawValue);
    if (!seen.has(st.key)) seen.set(st.key, { key: st.key, label: st.label, dot: st.dot });
  }
  return [...seen.values()].sort((a, b) => {
    const rank = (k: string) => (k === "" ? 999 : VALUE_ORDER.indexOf(k) < 0 ? 998 : VALUE_ORDER.indexOf(k));
    return rank(a.key) - rank(b.key);
  });
}

function Legend({ floors, section }: { floors: CommonAreaFloor[]; section?: "A" | "B" }) {
  const items = presentValues(floors, section);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.key || "empty"} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", it.dot)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function statusLabel(s: StatusState, blockerLabel: string): string {
  return s === "blocker" ? blockerLabel : STATUS[s].label;
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
// Transposed grid: TASKS = rows (readable horizontal labels), FLOORS = columns.
// White Box / Fully completed are per-floor FLAGS → two indicator rows, not tasks.
// ---------------------------------------------------------------------------
function Heatmap({
  floors,
  headers,
  section,
  highlight,
  checkboxLabel,
}: {
  floors: CommonAreaFloor[];
  headers: string[];
  section?: "A" | "B";
  highlight?: string;
  checkboxLabel: string;
}) {
  const cellsFor = (f: CommonAreaFloor) => (section ? f.tasks.filter((t) => t.section === section) : f.tasks);
  return (
    <div className="overflow-auto">
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-background px-2 pb-1 text-left text-[10px] font-medium text-muted-foreground">
              Task <span className="text-muted-foreground/50">╲ Floor</span>
            </th>
            {floors.map((f) => (
              <th key={f.floor} className="px-0 pb-1 text-center text-[10px] font-semibold text-muted-foreground" title={`Floor ${f.floor}`}>
                <div className="w-9">{f.floor}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Per-floor flags (not tasks) — checkmark / blank, visually separated */}
          <IndicatorRow
            label="White Box"
            floors={floors}
            render={(f) => (f.whiteBox ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-400" /> : null)}
            titleFor={(f) => `Floor ${f.floor} · White Box: ${f.whiteBox ? "yes" : "no"}`}
          />
          <IndicatorRow
            label={checkboxLabel}
            floors={floors}
            separator
            render={(f) =>
              f.mismatch ? (
                <AlertTriangle className="mx-auto h-3.5 w-3.5 text-amber-400" />
              ) : f.fullyComplete ? (
                <Check className="mx-auto h-3.5 w-3.5 text-emerald-400" />
              ) : null
            }
            titleFor={(f) =>
              `Floor ${f.floor} · ${checkboxLabel}: ${f.mismatch ? "marked done but tasks aren't all complete" : f.fullyComplete ? "yes" : "no"}`
            }
          />
          {/* Task rows */}
          {headers.map((header, i) => {
            const hot = highlight === header;
            return (
              <tr key={header}>
                <td
                  className={cn(
                    "sticky left-0 z-10 whitespace-nowrap bg-background px-2 py-0.5 text-xs",
                    hot ? "rounded font-semibold text-white ring-1 ring-white/40" : "text-white/90",
                  )}
                  title={header}
                >
                  {header}
                </td>
                {floors.map((f) => {
                  const t = cellsFor(f)[i];
                  const st = styleForValue(t?.rawValue);
                  return (
                    <td key={f.floor} className="p-0">
                      <div
                        className={cn("mx-auto h-7 w-9 rounded-sm", st.cell, hot && "ring-2 ring-white")}
                        title={`Floor ${f.floor} · ${header} · ${t?.rawValue?.trim() || "(empty cell — no data)"}`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IndicatorRow({
  label,
  floors,
  render,
  titleFor,
  separator,
}: {
  label: string;
  floors: CommonAreaFloor[];
  render: (f: CommonAreaFloor) => React.ReactNode;
  titleFor: (f: CommonAreaFloor) => string;
  separator?: boolean;
}) {
  const cell = cn("bg-white/[0.03] text-center", separator && "border-b border-white/15");
  return (
    <tr>
      <td className={cn("sticky left-0 z-10 whitespace-nowrap bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground", separator && "border-b border-white/15")}>
        {label}
      </td>
      {floors.map((f) => (
        <td key={f.floor} className={cell} title={titleFor(f)}>
          {render(f) ?? <span className="text-muted-foreground/25">·</span>}
        </td>
      ))}
    </tr>
  );
}

// Blocker lead — reuse the status === "blocker" classification (don't re-derive).
function blockerGroups(floors: CommonAreaFloor[], section?: "A" | "B") {
  const m = new Map<string, string[]>();
  for (const f of floors) {
    for (const t of f.tasks) {
      if (section && t.section !== section) continue;
      if (t.status === "blocker") {
        const list = m.get(t.header) ?? [];
        list.push(f.floor);
        m.set(t.header, list);
      }
    }
  }
  return [...m.entries()].map(([task, fl]) => ({ task, floors: fl })).sort((a, b) => b.floors.length - a.floors.length);
}

function floorSpanLabel(floors: string[]): string {
  const nums = floors.map((f) => parseInt(f.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n)).sort((a, b) => b - a);
  if (nums.length === 0) return "";
  if (nums.length === 1) return `Floor ${nums[0]}`;
  return `${nums.length} floors (${nums[0]}–${nums[nums.length - 1]})`;
}

function BlockerLead({
  floors,
  section,
  blockerLabel,
  highlight,
  onPick,
}: {
  floors: CommonAreaFloor[];
  section?: "A" | "B";
  blockerLabel: string;
  highlight: string | null;
  onPick: (task: string | null) => void;
}) {
  const groups = blockerGroups(floors, section);
  const total = groups.reduce((n, g) => n + g.floors.length, 0);
  const [open, setOpen] = useState(true); // blocker summary defaults to expanded
  if (total === 0) return null;
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/[0.06] p-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-1.5 flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        <AlertCircle className="h-3.5 w-3.5" /> {blockerLabel}
        <span className="text-red-300/70">({total} blocked cell{total > 1 ? "s" : ""})</span>
      </button>
      {open && (
      <ul className="space-y-0.5">
        {groups.map((g) => (
          <li key={g.task}>
            <button
              onClick={() => onPick(highlight === g.task ? null : g.task)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-white/5",
                highlight === g.task && "bg-white/10 ring-1 ring-white/30",
              )}
              title="Click to highlight this task's row in the grid"
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
              <span className="text-white/90">{g.task}</span>
              <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">{floorSpanLabel(g.floors)}</span>
            </button>
          </li>
        ))}
      </ul>
      )}
    </div>
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
// Segmented status bar (Temp/Lobby — no floor dimension). ONE 100%-wide bar split
// into colored segments sized by task count per status — the whole lobby's work as a
// pipeline at a glance, matching the grid colour language better than a pie.
// ---------------------------------------------------------------------------
function SegmentedBar({ segments, total, done, blockerLabel }: { segments: { status: StatusState; count: number }[]; total: number; done: number; blockerLabel: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-emerald-300">{pct}%</span>
        <span className="text-sm text-muted-foreground">done · {done} of {total} tasks</span>
      </div>
      <div className="flex h-7 w-full overflow-hidden rounded-md bg-white/5">
        {segments.map((s) => (
          <div
            key={s.status}
            className={cn("flex h-full items-center justify-center", STATUS[s.status].cell)}
            style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
            title={`${statusLabel(s.status, blockerLabel)}: ${s.count}`}
          >
            {total > 0 && s.count / total >= 0.07 && <span className="px-1 text-[11px] font-semibold text-white">{s.count}</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.status} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS[s.status].dot)} />
            {statusLabel(s.status, blockerLabel)} <b className="text-white">{s.count}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------
function CorridorsView({ data }: { data: CommonAreaResponse }) {
  const headers = data.floors[0]?.tasks.map((t) => t.header) ?? [];
  const tally = useMemo(() => tallyFloors(data.floors), [data.floors]);
  const mismatches = data.floors.filter((f) => f.mismatch);
  const [highlight, setHighlight] = useState<string | null>(null);
  // Floors read 4 → 27 (ascending): leftmost column = 4TH, rightmost = 27TH.
  const displayFloors = useMemo(() => [...data.floors].reverse(), [data.floors]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompletionBar done={tally.done} total={tally.total} />
        <Legend floors={data.floors} />
      </div>
      {mismatches.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {mismatches.length} floor{mismatches.length > 1 ? "s" : ""} marked FULLY COMPLETED but tasks aren't all done: {mismatches.map((f) => f.floor).join(", ")}
        </p>
      )}
      <BlockerLead floors={data.floors} blockerLabel="Waiting on product" highlight={highlight} onPick={setHighlight} />
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-3">
          <Heatmap floors={displayFloors} headers={headers} highlight={highlight ?? undefined} checkboxLabel="Fully completed" />
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
  const [highlight, setHighlight] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompletionBar done={tally.done} total={tally.total} />
        <Legend floors={data.floors} />
      </div>
      {mismatches.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {mismatches.length} floor{mismatches.length > 1 ? "s" : ""} marked FULLY DONE but tasks aren't all done: {mismatches.map((f) => f.floor).join(", ")}
        </p>
      )}
      <BlockerLead floors={data.floors} blockerLabel="Blocked" highlight={highlight} onPick={setHighlight} />
      {/* Sections A and B stacked vertically — each is 19 floor-columns wide */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-3">
          <h3 className="mb-2 text-sm font-semibold text-white">Section A <span className="text-xs font-normal text-muted-foreground">({headersA.length} tasks)</span></h3>
          <Heatmap floors={data.floors} headers={headersA} section="A" highlight={highlight ?? undefined} checkboxLabel="Fully done" />
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-3">
          <h3 className="mb-2 text-sm font-semibold text-white">Section B <span className="text-xs font-normal text-muted-foreground">({headersB.length} tasks)</span></h3>
          <Heatmap floors={data.floors} headers={headersB} section="B" highlight={highlight ?? undefined} checkboxLabel="Fully done" />
        </CardContent>
      </Card>
    </div>
  );
}

const LOBBY_GROUP_ORDER: StatusState[] = ["blocker", "in-progress", "in-motion", "not-started", "done", "other"];
// Bar reads left→right as a pipeline: done first (green), … , not-started last (slate).
const SEGMENT_ORDER: StatusState[] = ["done", "in-progress", "in-motion", "blocker", "not-started", "other"];

function LobbyView({ data }: { data: LobbyResponse }) {
  const byStatus = useMemo(() => {
    const m = new Map<StatusState, LobbyTask[]>();
    for (const t of data.tasks) {
      const list = m.get(t.status);
      if (list) list.push(t);
      else m.set(t.status, [t]);
    }
    return m;
  }, [data.tasks]);

  const segments = SEGMENT_ORDER.filter((s) => byStatus.has(s)).map((s) => ({ status: s, count: byStatus.get(s)!.length }));
  const groups = LOBBY_GROUP_ORDER.filter((s) => byStatus.has(s)).map((s) => ({ status: s, tasks: byStatus.get(s)! }));

  return (
    <div className="space-y-3">
      {/* Segmented pipeline bar for the glance (replaces the pie) */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-4">
          <SegmentedBar segments={segments} total={data.completion.total} done={data.completion.done} blockerLabel="Need to order" />
        </CardContent>
      </Card>

      {/* Grouped list for the detail */}
      <div className="space-y-3">
        {groups.map(({ status, tasks }) => (
          <Card key={status} className={cn("border-white/10 bg-white/[0.02]", status === "blocker" && "border-red-500/30 bg-red-500/[0.04]")}>
            <CardContent className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS[status].dot)} />
                <span className={status === "blocker" ? "text-red-300" : "text-white"}>{statusLabel(status, "Need to order")}</span>
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

function AreaPct({ label, done, total, loading }: { label: string; done?: number; total?: number; loading: boolean }) {
  const pct = total && total > 0 ? Math.round((done! / total) * 100) : null;
  return (
    <span className="text-white/90">
      {label} <span className={cn("font-semibold", pct === null ? "text-muted-foreground" : "text-emerald-300")}>{loading || pct === null ? "…" : `${pct}%`}</span>
    </span>
  );
}

export default function CommonAreas() {
  useDocumentTitle("Common Areas");
  const [view, setView] = useState<View>("corridors");

  const corridors = useQuery({ queryKey: ["expansion-corridors"], queryFn: () => fetchCommonArea("corridors"), retry: false, staleTime: 1000 * 60 * 2 });
  const staircase = useQuery({ queryKey: ["expansion-staircase"], queryFn: () => fetchCommonArea("staircase"), retry: false, staleTime: 1000 * 60 * 2 });
  const lobby = useQuery({ queryKey: ["expansion-lobby"], queryFn: fetchLobby, retry: false, staleTime: 1000 * 60 * 2 });

  const active = view === "corridors" ? corridors : view === "staircase" ? staircase : lobby;

  const corridorsT = corridors.data ? tallyFloors(corridors.data.floors) : undefined;
  const staircaseT = staircase.data ? tallyFloors(staircase.data.floors) : undefined;
  const lobbyT = lobby.data?.completion;

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
      {/* Per-area completion summary — overall standing before drilling in */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
        <AreaPct label="Corridors" done={corridorsT?.done} total={corridorsT?.total} loading={corridors.isLoading} />
        <span className="text-muted-foreground/40">·</span>
        <AreaPct label="Staircase" done={staircaseT?.done} total={staircaseT?.total} loading={staircase.isLoading} />
        <span className="text-muted-foreground/40">·</span>
        <AreaPct label="Temp/Lobby" done={lobbyT?.done} total={lobbyT?.total} loading={lobby.isLoading} />
      </div>

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
