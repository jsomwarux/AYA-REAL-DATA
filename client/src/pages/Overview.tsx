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
  ListChecks,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
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
  });

  const timelineQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: () => fetchTimelineData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const handleRefresh = async () => {
    await Promise.all([
      constructionProgressQuery.refetch(),
      budgetQuery.refetch(),
      timelineQuery.refetch(),
    ]);
    toastSuccess("Data Refreshed", "Dashboard data has been updated.");
  };

  const isLoading = constructionProgressQuery.isLoading || budgetQuery.isLoading || timelineQuery.isLoading;
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
  const tasksNeedingAttention = allTasks.slice(0, 5);

  // ── Budget Data ──
  const budgetData = budgetQuery.data;
  const totalBudget = budgetData?.totals?.totalBudget || 0;
  const paidThusFar = budgetData?.totals?.paidThusFar || 0;
  const budgetSpentPercent = totalBudget > 0 ? Math.round((paidThusFar / totalBudget) * 100) : 0;

  // Top categories by spend for pie chart
  const topCategories = (budgetData?.categoryBreakdown || [])
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map(cat => ({
      name: cat.name,
      value: cat.total,
    }));

  // Status breakdown
  const statusBreakdown = budgetData?.statusBreakdown || [];

  // Top vendor by spend
  const vendors = budgetData?.vendorBreakdown || [];
  const topVendorRaw = vendors.length > 0 ? vendors[0] : null;
  // Count items for top vendor
  const topVendorItemCount = topVendorRaw
    ? (budgetData?.items || []).filter(item => item.vendor === topVendorRaw.name).length
    : 0;
  const topVendor = topVendorRaw ? { name: topVendorRaw.name, total: topVendorRaw.total, count: topVendorItemCount } : null;

  // ── Timeline Data ──
  const timelineData = timelineQuery.data;
  const totalTimelineTasks = timelineData?.tasks?.length || 0;
  const totalEvents = timelineData?.events?.length || 0;
  const totalCategories = timelineData?.categories ? Object.keys(timelineData.categories).length : 0;

  const now = new Date();
  // Use local date to avoid UTC timezone mismatch
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Active events (happening now)
  const activeEvents = (timelineData?.events || [])
    .filter(e => e.startDate <= nowStr && e.endDate >= nowStr);

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
  const allEvents = timelineData?.events || [];
  const completedEvents = allEvents.filter(e => e.endDate < nowStr).length;
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

      {/* ═══ TOP-LEVEL KPI STATS ═══ */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Construction Progress"
          value={`${overallCompletion}%`}
          change={`${completedUnits}/${totalRooms} units complete`}
          changeType={overallCompletion >= 50 ? "positive" : "neutral"}
          icon={<Building2 className="h-5 w-5" />}
          accentColor="teal"
        />
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
          value={`${totalCategories} Categories`}
          change={`${eventsThisWeek.length} events this week · ${totalEvents} total`}
          changeType={eventsThisWeek.length > 0 ? "positive" : "neutral"}
          icon={<Calendar className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Top Vendor"
          value={topVendor?.name ? (topVendor.name.length > 14 ? topVendor.name.slice(0, 14) + '…' : topVendor.name) : '—'}
          change={topVendor ? `${formatCurrencyCompact(topVendor.total)} across ${topVendor.count} items` : 'No vendor data'}
          changeType="neutral"
          icon={<ListChecks className="h-5 w-5" />}
          accentColor="amber"
        />
      </div>

      {/* ═══ 1. CONSTRUCTION COMPLETION + 2. TASKS NEEDING ATTENTION ═══ */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
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
                  <span className="text-muted-foreground">Overall</span>
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
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-amber-400">{totalRooms - completedUnits}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>

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
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
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
                  <p className="text-xs text-muted-foreground">Hard Costs</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(budgetData?.totals?.hardCosts || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Soft Costs</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(budgetData?.totals?.softCosts || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Contingency</p>
                  <p className="text-sm font-medium text-white">{formatCurrencyCompact(budgetData?.totals?.contingency || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-sm font-medium text-teal-400">{formatCurrencyCompact(totalBudget - paidThusFar)}</p>
                </div>
              </div>

              {/* Status breakdown */}
              {statusBreakdown.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">By Status</p>
                  <div className="space-y-2">
                    {statusBreakdown.map((s) => (
                      <div key={s.status} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-400" />
                          <span className="text-muted-foreground">{s.status}</span>
                        </div>
                        <span className="text-white">{s.count} items · {formatCurrencyCompact(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Breakdown Pie Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <PieChart className="h-5 w-5 text-blue-400" />
                Budget by Category
              </CardTitle>
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[280px]">
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={topCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {topCategories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No budget data available
                </div>
              )}
            </div>
            {/* Legend below chart */}
            {topCategories.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {topCategories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{cat.name}</span>
                    <span className="text-white ml-auto font-medium">{formatCurrencyCompact(cat.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ 5. TIMELINE ACTIVITY + 6. PROGRESS BY FLOOR ═══ */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Timeline Activity — redesigned */}
        <Card className="border-white/10">
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
            {/* Overall timeline progress */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className={getCompletionColor(timelineProgressPercent)}>{timelineProgressPercent}%</span>
              </div>
              <Progress value={timelineProgressPercent} className="h-3 bg-white/10" />
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
                <p className="text-sm text-muted-foreground py-2">No upcoming milestones</p>
              )}
            </div>
          </CardContent>
        </Card>

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
            <div className="h-[280px]">
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
      <div className="grid gap-4 md:grid-cols-3">
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

        <Link href="/budget">
          <Card className="border-white/10 group hover:border-blue-500/30 transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Budget</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Vendor spend & line items</p>
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
