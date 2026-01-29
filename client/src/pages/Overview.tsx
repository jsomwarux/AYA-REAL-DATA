import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { checkHealth, fetchConstructionProgressData, RoomProgress } from "@/lib/api";
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
  Layers,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ChevronRight,
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
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const handleRefresh = async () => {
    await constructionProgressQuery.refetch();
    toastSuccess("Data Refreshed", "Dashboard data has been updated.");
  };

  const isLoading = constructionProgressQuery.isLoading;
  const sheetsConfigured = (healthQuery.data as any)?.sheetsConfigured;

  // Get rooms data
  const rooms = constructionProgressQuery.data?.rooms?.rows || [];
  const totalRooms = rooms.length;

  // Calculate overall stats
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

  // Get floor data for chart
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

  // Calculate task completions
  const bathroomTasks = calculateTaskCompletion(rooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(rooms, 'bedroom');

  // Find top 5 tasks needing attention (lowest completion)
  const allTasks = [
    ...Object.entries(bathroomTasks).map(([key, stats]) => ({
      key, // Keep the full key with prefix
      name: key.replace(/^Bathroom_/, ''), // Display name without prefix
      ...stats,
      type: 'Bathroom' as const
    })),
    ...Object.entries(bedroomTasks).map(([key, stats]) => ({
      key, // Keep the full key with prefix
      name: key.replace(/^Bedroom_/, ''), // Display name without prefix
      ...stats,
      type: 'Bedroom' as const
    })),
  ].sort((a, b) => a.percentage - b.percentage);

  const tasksNeedingAttention = allTasks.slice(0, 5);

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
      subtitle="Construction progress at a glance"
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
                Configure your credentials in the Settings page to sync live data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Progress"
          value={`${overallCompletion}%`}
          change={`${completedUnits}/${totalRooms} complete`}
          changeType={overallCompletion >= 50 ? "positive" : "neutral"}
          icon={<Building2 className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Bathrooms"
          value={`${bathroomCompletion}%`}
          change={`${Object.keys(bathroomTasks).length} tasks tracked`}
          changeType={bathroomCompletion >= 50 ? "positive" : "neutral"}
          icon={<Bath className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Bedrooms"
          value={`${bedroomCompletion}%`}
          change={`${Object.keys(bedroomTasks).length} tasks tracked`}
          changeType={bedroomCompletion >= 50 ? "positive" : "neutral"}
          icon={<BedDouble className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Total Units"
          value={totalRooms}
          change={`${floors.length} floors`}
          changeType="neutral"
          icon={<Layers className="h-5 w-5" />}
          accentColor="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Floor Progress Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-teal-400" />
              Progress by Floor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              {floorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={floorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="floor"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                    <Bar
                      dataKey="completion"
                      fill={COLORS.teal}
                      radius={[4, 4, 0, 0]}
                      name="Overall"
                    />
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
                      <Progress
                        value={task.percentage}
                        className="h-2 bg-white/10"
                      />
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

      {/* Quick Actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 group hover:border-blue-500/30 transition-colors">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-blue-400" />
              Construction Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-2 text-sm font-medium text-teal-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                  </span>
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className={`text-sm font-medium ${getCompletionColor(overallCompletion)}`}>
                  {overallCompletion}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Units Tracked</span>
                <span className="text-sm font-medium text-white">{totalRooms}</span>
              </div>
              <Link href="/construction">
                <Button className="w-full mt-2" variant="outline">
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 group hover:border-green-500/30 transition-colors">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Completion Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bathrooms</span>
                  <span className={getCompletionColor(bathroomCompletion)}>{bathroomCompletion}%</span>
                </div>
                <Progress value={bathroomCompletion} className="h-2 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bedrooms</span>
                  <span className={getCompletionColor(bedroomCompletion)}>{bedroomCompletion}%</span>
                </div>
                <Progress value={bedroomCompletion} className="h-2 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <span className={getCompletionColor(overallCompletion)}>{overallCompletion}%</span>
                </div>
                <Progress value={overallCompletion} className="h-2 bg-white/10" />
              </div>
            </div>
          </CardContent>
        </Card>
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
