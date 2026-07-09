import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  checkHealth,
  fetchConstructionProgressData,
  fetchBudgetData,
  fetchTimelineData,
  fetchExpansionRollup,
  fetchExpansionExceptions,
  fetchCommonArea,
  fetchLobby,
  type RollupTower,
  RoomProgress,
} from "@/lib/api";
import {
  calculateRoomCompletion,
  calculateTaskCompletion,
  getUniqueFloors,
  groupRoomsByFloor,
  calculateFloorCompletion,
  getCompletionColor,
} from "@/components/construction-progress/utils";
// Reuse the Common Areas tab's EXACT completion math (no independent recompute).
import { tallyFloors } from "@/pages/CommonAreas";
import { TaskDetailModal } from "@/components/construction-progress/TaskDetailModal";
import { RoomDetailModal } from "@/components/construction-progress/RoomDetailModal";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Building2,
  Bath,
  BedDouble,
  DollarSign,
  Calendar,
  ChevronRight,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  BarChart3,
  Package,
  ShieldAlert,
  LayoutGrid,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Chart colors matching design system
const COLORS = {
  teal: "#14b8a6",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
  green: "#22c55e",
};

const PIE_COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#ec4899", "#6366f1"];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

interface SelectedTask {
  taskKey: string;
  displayName: string;
  type: "bathroom" | "bedroom";
}

export default function Overview() {
  useDocumentTitle("Overview");

  // Check which tabs user has access to
  const tabAuthQuery = useQuery({
    queryKey: ["tab-auth"],
    queryFn: async () => {
      const res = await fetch("/api/auth/tab-check");
      if (!res.ok) throw new Error("Tab auth check failed");
      return res.json() as Promise<{ construction: boolean; management: boolean; deals: boolean; anyAuthenticated: boolean }>;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const isManagement = tabAuthQuery.data?.management ?? false;

  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomProgress | null>(null);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
  });

  const constructionProgressQuery = useQuery({
    queryKey: ["construction-progress"],
    queryFn: () => fetchConstructionProgressData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const budgetQuery = useQuery({
    queryKey: ["budget"],
    queryFn: () => fetchBudgetData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });

  const timelineQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: () => fetchTimelineData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });

  // Delivery roll-up (furniture parts) — construction-related, shown to all users.
  const rollupQuery = useQuery({
    queryKey: ["expansion-rollup"],
    queryFn: fetchExpansionRollup,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  // Procurement Issues + Common Areas glance tiles — gated to management tier (like
  // Budget/Timeline). Query keys MATCH those tabs' own queries, so the cache is shared
  // and the numbers are guaranteed identical to the detail tabs (no independent
  // recompute). enabled:isManagement means non-management users never fetch them.
  const exceptionsQuery = useQuery({
    queryKey: ["expansion-exceptions"],
    queryFn: fetchExpansionExceptions,
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });
  const corridorsQuery = useQuery({
    queryKey: ["expansion-corridors"],
    queryFn: () => fetchCommonArea("corridors"),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });
  const staircaseQuery = useQuery({
    queryKey: ["expansion-staircase"],
    queryFn: () => fetchCommonArea("staircase"),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });
  const lobbyQuery = useQuery({
    queryKey: ["expansion-lobby"],
    queryFn: fetchLobby,
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: isManagement,
  });

  const handleRefresh = async () => {
    const promises: Promise<any>[] = [constructionProgressQuery.refetch(), rollupQuery.refetch()];
    if (isManagement) {
      promises.push(
        budgetQuery.refetch(),
        timelineQuery.refetch(),
        exceptionsQuery.refetch(),
        corridorsQuery.refetch(),
        staircaseQuery.refetch(),
        lobbyQuery.refetch(),
      );
    }
    await Promise.all(promises);
    toastSuccess("Data Refreshed", "Dashboard data has been updated.");
  };

  const isLoading = constructionProgressQuery.isLoading || (isManagement && (budgetQuery.isLoading || timelineQuery.isLoading));
  const sheetsConfigured = (healthQuery.data as any)?.sheetsConfigured;

  // ── Construction Data ──
  const rooms = constructionProgressQuery.data?.rooms?.rows || [];
  const totalRooms = rooms.length;
  const roomCompletions = rooms.map((r: any) => calculateRoomCompletion(r));

  const overallCompletion = totalRooms > 0
    ? Math.round(roomCompletions.reduce((sum: number, c: any) => sum + c.overall.percentage, 0) / totalRooms)
    : 0;

  const bathroomCompletion = totalRooms > 0
    ? Math.round(roomCompletions.reduce((sum: number, c: any) => sum + c.bathroom.percentage, 0) / totalRooms)
    : 0;

  const bedroomCompletion = totalRooms > 0
    ? Math.round(roomCompletions.reduce((sum: number, c: any) => sum + c.bedroom.percentage, 0) / totalRooms)
    : 0;

  const completedUnits = roomCompletions.filter((c: any) => c.overall.percentage === 100).length;

  // ── Parts Delivered (furniture) — SAME count-summing as Floor→Room / Containers:
  //    delivered = Σ received-part weight; applicable = non-N/A received parts. ──
  const deliveredFor = (tower: RollupTower) => {
    let num = 0, den = 0;
    for (const f of tower.floors) for (const r of f.rooms) for (const pkg of r.packages) {
      for (const p of pkg.received?.parts ?? []) {
        if (p.bucket !== "excluded") { den++; num += p.weight; }
      }
    }
    return { num, den };
  };
  const towers = rollupQuery.data?.towers ?? [];
  const hrDelivered = towers.filter((t) => t.tower === "HR").reduce((a, t) => { const c = deliveredFor(t); return { num: a.num + c.num, den: a.den + c.den }; }, { num: 0, den: 0 });
  const lrDelivered = towers.filter((t) => t.tower === "LR").reduce((a, t) => { const c = deliveredFor(t); return { num: a.num + c.num, den: a.den + c.den }; }, { num: 0, den: 0 });
  const totalDelivered = { num: hrDelivered.num + lrDelivered.num, den: hrDelivered.den + lrDelivered.den };
  const dPct = (c: { num: number; den: number }) => (c.den > 0 ? Math.round((c.num / c.den) * 100) : 0);

  // Floor data for chart
  const floors = getUniqueFloors(rooms);
  const floorMap = groupRoomsByFloor(rooms);
  const floorChartData = floors.map(floor => {
    const floorRooms = floorMap.get(floor) || [];
    const completion = calculateFloorCompletion(floorRooms);
    return {
      floor: `F${floor}`,
      completion: completion.overall,
      bathroom: completion.bathroom,
      bedroom: completion.bedroom,
    };
  });

  // Tasks needing attention
  const bathroomTasks = calculateTaskCompletion(rooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(rooms, 'bedroom');
  const allTasks = [
    ...Object.entries(bathroomTasks).map(([key, stats]) => ({
      key,
      name: key.replace(/^Bathroom_/, ''),
      ...stats,
      type: 'Bathroom' as const
    })),
    ...Object.entries(bedroomTasks).map(([key, stats]) => ({
      key,
      name: key.replace(/^Bedroom_/, ''),
      ...stats,
      type: 'Bedroom' as const
    })),
  ].sort((a, b) => a.percentage - b.percentage);
  // Only genuinely-behind tasks (< 50% complete), up to 5 — NO padding with near-done
  // work. This keeps the "Needs Attention" header honest: over the current data it
  // surfaces just Bedroom Finish Paint (1%) and Bedroom HVAC+Thermostat (24%), not the
  // 72–75% items the old slice(0,5) pulled in. If none qualify, the panel shows an
  // "all on track" empty-state (handled in the render).
  const tasksNeedingAttention = allTasks.filter(t => t.percentage < 50).slice(0, 5);

  // ── Budget Data ──
  const budgetData = budgetQuery.data;
  const totalBudget = budgetData?.totals?.total || 0; // incl. 10% contingency
  const paidThusFar = budgetData?.totals?.paid || 0;
  const estimatedBefore = budgetData?.totals?.estimatedBeforeContingency || 0;
  const budgetSpentPercent = totalBudget > 0 ? Math.round((paidThusFar / totalBudget) * 100) : 0;

  // Top 6 categories by estimated cost (engine already sorts desc; pretty display names).
  // pct is each category's share of the BEFORE-contingency total — the same basis the
  // Budget tab uses, so the numbers reconcile. We render these as a ranked list (not a
  // pie) so the 6 shown honestly don't imply they're the whole 21-category total.
  const topCategories = (budgetData?.categories || [])
    .slice(0, 6)
    .map(cat => ({ name: cat.displayName, value: cat.total, pct: cat.pct }));

  // ── Procurement Issues — SAME derivation as the Procurement Issues tab ──
  // LEAD figure = "Needs attention" (severity "attention"); "Not Found" is shown only
  // as a muted secondary line ("flagged, pending review") — never headlined, because
  // the meaning of "Not Found" is an open client question (not necessarily lost).
  const excItems = exceptionsQuery.data?.items || [];
  const attentionCount = exceptionsQuery.data?.counts?.attention ?? excItems.filter(i => i.severity === "attention").length;
  const notFoundCount = excItems.filter(i => i.reason === "Not Found").length;

  // ── Common Areas completion — reuse the Common Areas tab's own tallyFloors math ──
  const areaPct = (done?: number, total?: number) => (total && total > 0 ? Math.round((done! / total) * 100) : null);
  const corridorsT = corridorsQuery.data ? tallyFloors(corridorsQuery.data.floors) : undefined;
  const staircaseT = staircaseQuery.data ? tallyFloors(staircaseQuery.data.floors) : undefined;
  const lobbyT = lobbyQuery.data?.completion;
  const corridorsPct = areaPct(corridorsT?.done, corridorsT?.total);
  const staircasePct = areaPct(staircaseT?.done, staircaseT?.total);
  const lobbyPct = areaPct(lobbyT?.done, lobbyT?.total);

  // ── Timeline Data ──
  const timelineData = timelineQuery.data;
  const totalTimelineTasks = timelineData?.tasks?.length || 0;
  const totalEvents = timelineData?.events?.length || 0;
  const totalCategories = timelineData?.categories ? Object.keys(timelineData.categories).length : 0;

  const now = new Date();
  // Use local date to avoid UTC timezone mismatch
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Active events (happening now)
  // Event dates represent week columns — an event with endDate '2026-01-23' covers the week of Jan 23–29.
  // So we add 6 days to endDate for a more accurate "active" check.
  const activeEvents = (timelineData?.events || [])
    .filter(e => {
      if (e.startDate > nowStr) return false;
      // Extend endDate by 6 days since it represents start-of-week
      const endDateObj = new Date(e.endDate + 'T00:00:00');
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endDateExtStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
      return endDateExtStr >= nowStr;
    });

  // Events this week (Sun–Sat)
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
  const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

  const eventsThisWeek = (timelineData?.events || [])
    .filter(e => e.startDate <= endOfWeekStr && e.endDate >= startOfWeekStr);

  // Upcoming milestones: next events per category (not yet started)
  const upcomingByCategory: Record<string, { category: string; event: any; task: any }> = {};
  for (const event of (timelineData?.events || []).filter(e => e.startDate > nowStr).sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const task = timelineData?.tasks.find(t => t.id === event.taskId);
    const cat = task?.category || 'Uncategorized';
    if (!upcomingByCategory[cat]) {
      upcomingByCategory[cat] = { category: cat, event, task };
    }
  }
  const upcomingMilestones = Object.values(upcomingByCategory).slice(0, 5);

  // Overall timeline progress
  // Account for week-based dates: endDate + 6 days = actual end of that week
  const allEvents = timelineData?.events || [];
  const completedEvents = allEvents.filter(e => {
    const endDateObj = new Date(e.endDate + 'T00:00:00');
    endDateObj.setDate(endDateObj.getDate() + 6);
    const endDateExtStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
    return endDateExtStr < nowStr;
  }).length;
  const timelineProgressPercent = allEvents.length > 0 ? Math.round((completedEvents / allEvents.length) * 100) : 0;

  const handleTaskClick = (task: typeof tasksNeedingAttention[0]) => {
    setSelectedTask({
      taskKey: task.key,
      displayName: task.name,
      type: task.type === 'Bathroom' ? 'bathroom' : 'bedroom',
    });
  };

  const handleRoomClick = (room: RoomProgress) => {
    setSelectedRoom(room);
  };

  return (
    <DashboardLayout
      title="Dashboard Overview"
      subtitle="Project intelligence at a glance"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Connection Status Banner */}
      {!sheetsConfigured && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-400">
                Google Sheets not connected
              </p>
              <p className="text-sm text-muted-foreground">
                Configure your credentials to sync live data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOP-LEVEL KPI STATS — one glance tile per main tab ═══ */}
      {/* Mgmt: 6 tiles (Construction · Delivery · Procurement · Common Areas · Budget · Timeline) → 2 rows of 3
          at lg (comfortable width for the 3-percentage Common Areas tile).
          Non-mgmt: just the 2 ungated tiles (Construction · Delivery) → one clean 2-col row, no empty cell.
          "Cost per unit" was dropped from here (vanity metric, still on the Budget tab). */}
      <div className={`mb-6 sm:mb-8 grid gap-3 sm:gap-4 grid-cols-2 ${isManagement ? 'lg:grid-cols-3' : 'lg:grid-cols-2 max-w-2xl'}`}>
        <StatCard
          title="Construction Progress"
          value={`${overallCompletion}%`}
          change="of all tasks completed"
          changeType={overallCompletion >= 50 ? "positive" : "neutral"}
          icon={<Building2 className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Parts Delivered"
          value={rollupQuery.data ? `${dPct(totalDelivered)}%` : rollupQuery.isLoading ? "…" : "—"}
          change={
            rollupQuery.data
              ? `${totalDelivered.num.toLocaleString()} of ${totalDelivered.den.toLocaleString()} parts · HR ${dPct(hrDelivered)}% · LR ${dPct(lrDelivered)}%`
              : rollupQuery.isLoading
                ? "Loading delivery…"
                : "Delivery data unavailable"
          }
          changeType={dPct(totalDelivered) >= 50 ? "positive" : "neutral"}
          icon={<Package className="h-5 w-5" />}
          accentColor="blue"
        />
        {/* Procurement Issues + Common Areas — management-tier glance tiles (gated like Budget/Timeline). */}
        {isManagement && (<>
        {/* Procurement Issues — leads with the actionable "needs attention" count.
            "Not Found" appears only as a muted secondary line, never headlined. */}
        <Link href="/exceptions">
          <Card className="group h-full cursor-pointer border-white/10 transition-all hover:border-red-500/30">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Procurement Issues</p>
                  <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    {exceptionsQuery.isLoading ? "…" : exceptionsQuery.isError ? "—" : attentionCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">parts flagged for follow-up</p>
                  {!exceptionsQuery.isLoading && !exceptionsQuery.isError && notFoundCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">{notFoundCount.toLocaleString()} flagged, pending review</p>
                  )}
                </div>
                <div className="rounded-xl bg-red-500/15 p-2.5 text-red-400 transition-transform group-hover:scale-110">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        {/* Common Areas — three area completions, read straight from that tab's tallyFloors. */}
        <Link href="/common-areas">
          <Card className="group h-full cursor-pointer border-white/10 transition-all hover:border-violet-500/30">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-2 flex items-start justify-between">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Common Areas</p>
                <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-400 transition-transform group-hover:scale-110">
                  <LayoutGrid className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-1">
                {[
                  { label: "Corridors", pct: corridorsPct, loading: corridorsQuery.isLoading },
                  { label: "Staircase", pct: staircasePct, loading: staircaseQuery.isLoading },
                  { label: "Temp/Lobby", pct: lobbyPct, loading: lobbyQuery.isLoading },
                ].map((a) => (
                  <div key={a.label} className="text-center">
                    <p className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                      {a.loading || a.pct === null ? "…" : `${a.pct}%`}
                    </p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{a.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
        </>)}
        {isManagement && (
          <>
            <StatCard
              title="Budget"
              value={formatCurrencyCompact(totalBudget)}
              change={`${formatCurrencyCompact(totalBudget - paidThusFar)} remaining (${100 - budgetSpentPercent}%)`}
              changeType={budgetSpentPercent > 90 ? "negative" : budgetSpentPercent > 70 ? "neutral" : "positive"}
              icon={<DollarSign className="h-5 w-5" />}
              accentColor="blue"
            />
            <StatCard
              title="Timeline"
              value={`${eventsThisWeek.length} This Week`}
              change={`${totalEvents - completedEvents} events remaining`}
              changeType={eventsThisWeek.length > 0 ? "positive" : "neutral"}
              icon={<Calendar className="h-5 w-5" />}
              accentColor="purple"
            />
          </>
        )}
      </div>

      {/* ═══ 1. CONSTRUCTION COMPLETION + 2. TASKS NEEDING ATTENTION ═══ */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-4 sm:mb-6">
        {/* Construction Completion Summary */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Construction Completion
              </CardTitle>
              <Link href="/construction">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed (all units)</span>
                  <span className={getCompletionColor(overallCompletion)}>{overallCompletion}%</span>
                </div>
                <Progress value={overallCompletion} className="h-3 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-blue-400" />
                    <span className="text-muted-foreground">Bathrooms</span>
                  </div>
                  <span className={getCompletionColor(bathroomCompletion)}>{bathroomCompletion}%</span>
                </div>
                <Progress value={bathroomCompletion} className="h-2 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-purple-400" />
                    <span className="text-muted-foreground">Bedrooms</span>
                  </div>
                  <span className={getCompletionColor(bedroomCompletion)}>{bedroomCompletion}%</span>
                </div>
                <Progress value={bedroomCompletion} className="h-2 bg-white/10" />
              </div>

              {/* Unit stats */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{totalRooms}</p>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-teal-400">{completedUnits}</p>
                  <p className="text-xs text-muted-foreground">Fully finished</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-amber-400">{totalRooms - completedUnits}</p>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </div>
              </div>

              {/* Plain-language note: the two numbers measure different things */}
              <p className="rounded-md bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {overallCompletion}% of all tasks are done, but {completedUnits === 0 ? "no unit is" : `only ${completedUnits} of ${totalRooms} units are`} 100% finished yet — the remaining work is spread across many units.
              </p>

              {/* Floors */}
              <div className="text-xs text-muted-foreground">
                Tracking {floors.length} floors · {Object.keys(bathroomTasks).length + Object.keys(bedroomTasks).length} task types
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Needing Attention */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Tasks Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {tasksNeedingAttention.length > 0 ? (
                tasksNeedingAttention.map((task, index) => (
                  <button
                    key={index}
                    onClick={() => handleTaskClick(task)}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted-foreground">
                            {task.type}
                          </span>
                          <span className="text-white group-hover:text-white/90">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={getCompletionColor(task.percentage)}>
                            {task.completed}/{task.total} ({task.percentage}%)
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <Progress value={task.percentage} className="h-2 bg-white/10" />
                    </div>
                  </button>
                ))
              ) : allTasks.length > 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-medium text-white">All tasks on track</p>
                  <p className="text-xs text-muted-foreground">Every tracked task is at least 50% complete.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No task data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ 3. BUDGET STATUS + 4. BUDGET BY CATEGORY ═══ */}
      {isManagement && <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-4 sm:mb-6">
        {/* Budget Status Summary */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-blue-400" />
                Budget Status
              </CardTitle>
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Budget progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget Spent</span>
                  <span className={budgetSpentPercent > 90 ? "text-red-400" : budgetSpentPercent > 70 ? "text-amber-400" : "text-teal-400"}>
                    {formatCurrency(paidThusFar)} / {formatCurrency(totalBudget)}
                  </span>
                </div>
                <Progress value={budgetSpentPercent} className="h-3 bg-white/10" />
              </div>

              {/* Key budget metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Estimated (before contingency)</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(budgetData?.totals?.estimatedBeforeContingency || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Contingency (10%)</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(budgetData?.totals?.contingency || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Paid ({budgetSpentPercent}% of total)</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(paidThusFar)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm font-medium text-teal-400">{formatCurrencyCompact(budgetData?.totals?.remaining || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget by Category — top 6 (ranked list, not a pie, to avoid implying 6 = whole) */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Budget by Category
              </CardTitle>
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View all in Budget <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map((cat, i) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate text-white">{cat.name}</span>
                      <span className="ml-auto flex-shrink-0 font-medium text-white">{formatCurrencyCompact(cat.value)}</span>
                      <span className="w-12 flex-shrink-0 text-right text-xs text-muted-foreground">{cat.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(1, cat.pct)}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Top 6 of {budgetData?.categories?.length ?? 0} categories · each shown as its share of the {formatCurrencyCompact(estimatedBefore)} estimated total (before contingency).
                </p>
              </div>
            ) : (
              <div className="flex h-[240px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {budgetQuery.isLoading ? "Loading budget…" : budgetQuery.isError ? "Couldn't load budget data." : "No budget categories to show."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>}

      {/* ═══ 5. TIMELINE ACTIVITY + 6. PROGRESS BY FLOOR ═══ */}
      <div className={`grid gap-4 sm:gap-6 mb-4 sm:mb-6 ${isManagement ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {/* Timeline Activity — redesigned (management only) */}
        {isManagement && <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-purple-400" />
                Timeline Activity
              </CardTitle>
              <Link href="/timeline">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Schedule elapsed — how much of the planned timeline window has passed
                (NOT work completion; this is why it can read 100% while work is partial). */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Schedule elapsed</span>
                <span className={getCompletionColor(timelineProgressPercent)}>{timelineProgressPercent}%</span>
              </div>
              <Progress value={timelineProgressPercent} className="h-3 bg-white/10" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Share of the planned timeline weeks that have passed — not work completed.
              </p>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-semibold text-teal-400">{eventsThisWeek.length}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-semibold text-purple-400">{activeEvents.length}</p>
                <p className="text-xs text-muted-foreground">Active Now</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <p className="text-lg font-semibold text-white">{totalCategories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>

            {/* Upcoming milestones — one per category, max 3 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Upcoming Milestones</p>
              {upcomingMilestones.length > 0 ? (
                <div className="space-y-2">
                  {upcomingMilestones.slice(0, 3).map((item, idx) => {
                    const startDate = new Date(item.event.startDate + 'T00:00:00');
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.event.color || '#6b7280' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.event.label || item.task?.task || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  {timelineQuery.isLoading ? "Loading timeline…" : "No upcoming milestones — every scheduled timeline item is already in the past."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Floor Progress Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Layers className="h-5 w-5 text-teal-400" />
                Progress by Floor
              </CardTitle>
              <Link href="/construction">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[220px] sm:h-[280px]">
              {floorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={floorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="floor" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                    <Bar dataKey="completion" fill={COLORS.teal} radius={[4, 4, 0, 0]} name="Overall" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No floor data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ QUICK NAVIGATION ═══ */}
      <div className={`grid gap-3 sm:gap-4 ${isManagement ? 'sm:grid-cols-2 md:grid-cols-3' : 'md:grid-cols-1 max-w-md'}`}>
        <Link href="/construction">
          <Card className="border-white/10 group hover:border-teal-500/30 transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Construction Progress</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Room-by-room tracking</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-400 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {isManagement && (
          <>
            <Link href="/budget">
              <Card className="border-white/10 group hover:border-blue-500/30 transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl p-3 bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">Budget</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cost by category, paid & remaining</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/timeline">
              <Card className="border-white/10 group hover:border-purple-500/30 transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl p-3 bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">Timeline</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Gantt chart & scheduling</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskName={selectedTask.displayName}
          taskKey={selectedTask.taskKey}
          taskType={selectedTask.type}
          rooms={rooms}
          onRoomClick={handleRoomClick}
        />
      )}

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </DashboardLayout>
  );
}
