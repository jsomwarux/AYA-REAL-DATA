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
  TrendingUp,
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
  const costPerRoom = budgetData?.totals?.costPerRoom || 0;
  const budgetItemCount = budgetData?.itemCount || 0;
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

  // ── Timeline Data ──
  const timelineData = timelineQuery.data;
  const totalTimelineTasks = timelineData?.tasks?.length || 0;
  const totalEvents = timelineData?.events?.length || 0;
  const totalCategories = timelineData?.categories ? Object.keys(timelineData.categories).length : 0;

  // Calculate upcoming events (within next 2 weeks)
  const now = new Date();
  const twoWeeksFromNow = new Date(now);
  twoWeeksFromNow.setDate(now.getDate() + 14);
  const nowStr = now.toISOString().split('T')[0];
  const twoWeeksStr = twoWeeksFromNow.toISOString().split('T')[0];

  const upcomingEvents = (timelineData?.events || [])
    .filter(e => e.startDate >= nowStr && e.startDate <= twoWeeksStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  // Active events (happening now)
  const activeEvents = (timelineData?.events || [])
    .filter(e => e.startDate <= nowStr && e.endDate >= nowStr);

  // Event types distribution for chart
  const eventTypeCounts: Record<string, { count: number; color: string }> = {};
  for (const event of (timelineData?.events || [])) {
    const label = event.label || 'Unlabeled';
    if (!eventTypeCounts[label]) {
      eventTypeCounts[label] = { count: 0, color: event.color || '#6b7280' };
    }
    eventTypeCounts[label].count++;
  }
  const eventTypeData = Object.entries(eventTypeCounts)
    .map(([name, data]) => ({ name, value: data.count, color: data.color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

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
          title="Total Budget"
          value={formatCurrencyCompact(totalBudget)}
          change={`${budgetSpentPercent}% spent (${formatCurrencyCompact(paidThusFar)})`}
          changeType={budgetSpentPercent > 90 ? "negative" : budgetSpentPercent > 70 ? "neutral" : "positive"}
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Timeline Tasks"
          value={totalTimelineTasks}
          change={`${activeEvents.length} active · ${totalEvents} total events`}
          changeType="neutral"
          icon={<Calendar className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Cost Per Room"
          value={formatCurrencyCompact(costPerRoom)}
          change={`${budgetItemCount} line items`}
          changeType="neutral"
          icon={<Layers className="h-5 w-5" />}
          accentColor="amber"
        />
      </div>

      {/* ═══ CONSTRUCTION + BUDGET ROW ═══ */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Floor Progress Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-teal-400" />
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

      {/* ═══ TASKS NEEDING ATTENTION + TIMELINE UPCOMING ═══ */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
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

        {/* Timeline: Upcoming & Active Events */}
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
            {/* Active events */}
            {activeEvents.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Now</p>
                <div className="space-y-2">
                  {activeEvents.slice(0, 3).map((event) => {
                    const task = timelineData?.tasks.find(t => t.id === event.taskId);
                    return (
                      <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || '#6b7280' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{event.label || task?.task || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{task?.category}</p>
                        </div>
                        <span className="text-xs text-teal-400 flex-shrink-0">In Progress</span>
                      </div>
                    );
                  })}
                  {activeEvents.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-2">+{activeEvents.length - 3} more active</p>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming events */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Upcoming (Next 2 Weeks)
              </p>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => {
                    const task = timelineData?.tasks.find(t => t.id === event.taskId);
                    const startDate = new Date(event.startDate + 'T00:00:00');
                    return (
                      <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || '#6b7280' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{event.label || task?.task || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{task?.category}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
                  No upcoming events
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{totalCategories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{totalTimelineTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{totalEvents}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ BUDGET STATUS + CONSTRUCTION COMPLETION ═══ */}
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
