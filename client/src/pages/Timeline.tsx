import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimelineChart } from "@/components/timeline/TimelineChart";
import { EventModal } from "@/components/timeline/EventModal";
import { TaskModal } from "@/components/timeline/TaskModal";
import {
  fetchTimelineData,
  importTimelineFromSheet,
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
  createTimelineTask,
  updateTimelineTask,
  deleteTimelineTask,
  deleteTimelineCategory,
  fetchCustomEventTypes,
  createCustomEventType,
  updateCustomEventType,
  deleteCustomEventType,
  TimelineEvent,
  TimelineTask,
} from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  Calendar,
  ListChecks,
  Tags,
  Download,
  Loader2,
  Clock,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Target,
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
  Legend,
} from "recharts";

// Format date for display
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format date for longer display
function formatDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Check if a date is in the past
function isPastDate(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Check if a date is today or this week
function isCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

// Chart colors
const CHART_COLORS = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#22c55e', '#ec4899', '#06b6d4', '#f97316', '#6366f1',
];

export default function Timeline() {
  useDocumentTitle("Timeline");

  const queryClient = useQueryClient();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: TimelineEvent | null;
    taskId: number;
    weekDate: string;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const timelineQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimelineData,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  // Custom event types
  const customEventTypesQuery = useQuery({
    queryKey: ["customEventTypes"],
    queryFn: fetchCustomEventTypes,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const createEventTypeMutation = useMutation({
    mutationFn: createCustomEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customEventTypes"] });
      toastSuccess("Event Type Created", "New event type has been added.");
    },
    onError: (error: Error) => {
      toastError("Failed to Create Event Type", error.message);
    },
  });

  const updateEventTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label?: string; color?: string } }) =>
      updateCustomEventType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customEventTypes"] });
      toastSuccess("Event Type Updated", "Event type has been updated.");
    },
    onError: (error: Error) => {
      toastError("Failed to Update Event Type", error.message);
    },
  });

  const deleteEventTypeMutation = useMutation({
    mutationFn: deleteCustomEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customEventTypes"] });
      toastSuccess("Event Type Deleted", "Event type has been removed.");
    },
    onError: (error: Error) => {
      toastError("Failed to Delete Event Type", error.message);
    },
  });

  const importMutation = useMutation({
    mutationFn: importTimelineFromSheet,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Import Successful", data.message);
      setShowImportDialog(false);
    },
    onError: (error: Error) => {
      toastError("Import Failed", error.message);
    },
  });

  const createEventMutation = useMutation({
    mutationFn: createTimelineEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Event Created", "Timeline event has been created.");
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Create Event", error.message);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTimelineEvent>[1] }) =>
      updateTimelineEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Event Updated", "Timeline event has been updated.");
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Update Event", error.message);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteTimelineEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Event Deleted", "Timeline event has been deleted.");
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Delete Event", error.message);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: createTimelineTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Task Created", "Timeline task has been created.");
      setIsAddingTask(false);
    },
    onError: (error: Error) => {
      toastError("Failed to Create Task", error.message);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateTimelineTask>[1] }) =>
      updateTimelineTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Task Updated", "Timeline task has been updated.");
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Update Task", error.message);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTimelineTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Task Deleted", "Timeline task has been deleted.");
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Delete Task", error.message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteTimelineCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toastSuccess("Category Deleted", "Category and all its tasks have been removed.");
      setCategoryToDelete(null);
    },
    onError: (error: Error) => {
      toastError("Failed to Delete Category", error.message);
      setCategoryToDelete(null);
    },
  });

  const handleRefresh = async () => {
    await timelineQuery.refetch();
    toastSuccess("Data Refreshed", "Timeline data has been updated.");
  };

  const isLoading = timelineQuery.isLoading;
  const data = timelineQuery.data;

  // Calculate comprehensive stats and analytics
  const analytics = useMemo(() => {
    if (!data || !data.tasks || !data.events || !data.weekDates) {
      return {
        totalTasks: 0,
        totalEvents: 0,
        totalCategories: 0,
        timespan: '',
        completedEvents: 0,
        thisWeekEvents: 0,
        upcomingEvents: 0,
        progressPercent: 0,
        isProjectComplete: false,
        categoryBreakdown: [] as { name: string; tasks: number; events: number; color: string }[],
        upcomingMilestones: [] as { task: string; category: string; event: TimelineEvent; dateLabel: string }[],
        recentMilestones: [] as { task: string; category: string; event: TimelineEvent; dateLabel: string }[],
        eventTypeBreakdown: [] as { name: string; count: number; color: string }[],
        weeklyActivity: [] as { week: string; events: number }[],
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const categories = Object.keys(data.categories || {});

    // Determine if the project timeline is complete (all dates in the past)
    const firstDate = new Date(data.weekDates[0] + 'T00:00:00');
    const lastDate = new Date(data.weekDates[data.weekDates.length - 1] + 'T00:00:00');
    const isProjectComplete = now > lastDate;

    // Calculate current week boundaries (Sun to Sat)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Calculate event timing stats
    let completedEvents = 0;
    let thisWeekEvents = 0;
    let upcomingEvents = 0;
    const eventTypeCounts: Record<string, { count: number; color: string }> = {};

    for (const event of data.events) {
      const endDate = new Date(event.endDate + 'T00:00:00');
      const startDate = new Date(event.startDate + 'T00:00:00');

      if (endDate < now) {
        completedEvents++;
      } else if (startDate > now) {
        upcomingEvents++;
      }

      // Check if event overlaps with this week (start before week ends AND end on or after week starts)
      if (startDate < endOfWeek && endDate >= startOfWeek) {
        thisWeekEvents++;
      }

      // Track event types
      const label = event.label || 'Other';
      if (!eventTypeCounts[label]) {
        eventTypeCounts[label] = { count: 0, color: event.color || '#d1d5db' };
      }
      eventTypeCounts[label].count++;
    }

    // Calculate overall progress based on event completion ratio
    // This gives a meaningful percentage even when the project is in the past
    const totalDuration = lastDate.getTime() - firstDate.getTime();
    const elapsed = Math.max(0, Math.min(now.getTime(), lastDate.getTime()) - firstDate.getTime());
    const progressPercent = totalDuration > 0
      ? Math.min(100, Math.round((elapsed / totalDuration) * 100))
      : 0;

    // Category breakdown
    const categoryBreakdown = categories.map((cat, index) => {
      const catTasks = data.categories[cat] || [];
      const catEvents = data.events.filter(e =>
        catTasks.some(t => t.id === e.taskId)
      );
      return {
        name: cat,
        tasks: catTasks.length,
        events: catEvents.length,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).sort((a, b) => b.events - a.events);

    // Get task lookup
    const taskLookup: Record<number, TimelineTask> = {};
    for (const task of data.tasks) {
      taskLookup[task.id] = task;
    }

    // Upcoming milestones / Final milestones
    // If the project is still active, show events starting in the next 2 weeks
    // If the project is complete, show the last 5 events on the timeline (the final milestones)
    let upcomingMilestones: { task: string; category: string; event: TimelineEvent; dateLabel: string }[] = [];

    if (isProjectComplete) {
      // Show the final milestones (events with the latest end dates)
      upcomingMilestones = [...data.events]
        .sort((a, b) => b.endDate.localeCompare(a.endDate))
        .slice(0, 5)
        .map(e => {
          const task = taskLookup[e.taskId];
          return {
            task: task?.task || 'Unknown',
            category: task?.category || 'Unknown',
            event: e,
            dateLabel: formatDate(e.endDate),
          };
        });
    } else {
      const twoWeeksFromNow = new Date(now);
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      upcomingMilestones = data.events
        .filter(e => {
          const startDate = new Date(e.startDate + 'T00:00:00');
          return startDate >= now && startDate <= twoWeeksFromNow;
        })
        .map(e => {
          const task = taskLookup[e.taskId];
          const startDate = new Date(e.startDate + 'T00:00:00');
          const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            task: task?.task || 'Unknown',
            category: task?.category || 'Unknown',
            event: e,
            dateLabel: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`,
          };
        })
        .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))
        .slice(0, 5);
    }

    // Recent completions
    // If the project is complete, show the last 5 completed events
    // If active, show events completed in the past 2 weeks
    let recentMilestones: { task: string; category: string; event: TimelineEvent; dateLabel: string }[] = [];

    if (isProjectComplete) {
      // Show the most recently completed events
      recentMilestones = [...data.events]
        .sort((a, b) => b.endDate.localeCompare(a.endDate))
        // Skip the ones shown as "final milestones" — use a different slice
        .slice(5, 10)
        .map(e => {
          const task = taskLookup[e.taskId];
          return {
            task: task?.task || 'Unknown',
            category: task?.category || 'Unknown',
            event: e,
            dateLabel: formatDate(e.endDate),
          };
        });
      // If not enough events to fill both cards differently, just show latest
      if (recentMilestones.length === 0) {
        recentMilestones = [...data.events]
          .sort((a, b) => b.endDate.localeCompare(a.endDate))
          .slice(0, 5)
          .map(e => {
            const task = taskLookup[e.taskId];
            return {
              task: task?.task || 'Unknown',
              category: task?.category || 'Unknown',
              event: e,
              dateLabel: formatDate(e.endDate),
            };
          });
      }
    } else {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      recentMilestones = data.events
        .filter(e => {
          const endDate = new Date(e.endDate + 'T00:00:00');
          return endDate < now && endDate >= twoWeeksAgo;
        })
        .map(e => {
          const task = taskLookup[e.taskId];
          const endDate = new Date(e.endDate + 'T00:00:00');
          const daysAgo = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            task: task?.task || 'Unknown',
            category: task?.category || 'Unknown',
            event: e,
            dateLabel: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`,
          };
        })
        .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))
        .slice(0, 5);
    }

    // Event type breakdown for pie chart
    const eventTypeBreakdown = Object.entries(eventTypeCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Weekly activity (events per week)
    const weeklyActivity = data.weekDates.map(weekDate => {
      const eventsThisWeek = data.events.filter(e =>
        e.startDate <= weekDate && e.endDate >= weekDate
      ).length;
      return {
        week: formatDate(weekDate),
        events: eventsThisWeek,
      };
    });

    // Calculate timespan
    const timespan = data.weekDates.length > 0
      ? `${formatDate(data.weekDates[0])} - ${formatDate(data.weekDates[data.weekDates.length - 1])}`
      : 'No dates';

    return {
      totalTasks: data.tasks.length,
      totalEvents: data.events.length,
      totalCategories: categories.length,
      timespan,
      completedEvents,
      thisWeekEvents,
      upcomingEvents,
      progressPercent,
      isProjectComplete,
      categoryBreakdown,
      upcomingMilestones,
      recentMilestones,
      eventTypeBreakdown,
      weeklyActivity,
    };
  }, [data]);

  // Handle cell click (add/edit event)
  const handleCellClick = (taskId: number, weekDate: string, existingEvent: TimelineEvent | null) => {
    setSelectedEvent({ event: existingEvent, taskId, weekDate });
  };

  // Handle task click (edit task)
  const handleTaskClick = (task: TimelineTask) => {
    setSelectedTask(task);
  };

  // Handle category collapse toggle
  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Handle event save
  const handleEventSave = (eventData: { label: string; color: string; startDate: string; endDate: string }) => {
    if (!selectedEvent) return;

    if (selectedEvent.event) {
      // Update existing
      updateEventMutation.mutate({
        id: selectedEvent.event.id,
        data: {
          label: eventData.label,
          color: eventData.color,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
        },
      });
    } else {
      // Create new
      createEventMutation.mutate({
        taskId: selectedEvent.taskId,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        label: eventData.label,
        color: eventData.color,
      });
    }
  };

  // Handle event delete
  const handleEventDelete = () => {
    if (selectedEvent?.event) {
      deleteEventMutation.mutate(selectedEvent.event.id);
    }
  };

  // Handle task save
  const handleTaskSave = (taskData: { category: string; task: string }) => {
    if (selectedTask) {
      updateTaskMutation.mutate({
        id: selectedTask.id,
        data: taskData,
      });
    } else if (isAddingTask) {
      createTaskMutation.mutate(taskData);
    }
  };

  // Handle task delete
  const handleTaskDelete = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(selectedTask.id);
    }
  };

  // Get unique categories for the add task form
  const categories = useMemo(() => {
    if (!data?.categories) return [];
    return Object.keys(data.categories).sort();
  }, [data?.categories]);

  return (
    <DashboardLayout
      title="Project Timeline"
      subtitle="Track milestones and project phases"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => setIsAddingTask(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowImportDialog(true)}
          disabled={importMutation.isPending}
          className="gap-2"
        >
          {importMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Import from Google Sheet
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Tasks"
          value={analytics.totalTasks.toString()}
          change={`${analytics.totalCategories} categories`}
          changeType="neutral"
          icon={<ListChecks className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Total Events"
          value={analytics.totalEvents.toString()}
          change="Milestones & phases"
          changeType="neutral"
          icon={<Calendar className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Completed"
          value={analytics.completedEvents.toString()}
          change={`${analytics.totalEvents > 0 ? Math.round((analytics.completedEvents / analytics.totalEvents) * 100) : 0}% of events`}
          changeType="positive"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="This Week"
          value={analytics.thisWeekEvents.toString()}
          change="Events this week"
          changeType="neutral"
          icon={<PlayCircle className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Upcoming"
          value={analytics.upcomingEvents.toString()}
          change="Future events"
          changeType="neutral"
          icon={<Target className="h-5 w-5" />}
          accentColor="purple"
        />
      </div>

      {/* Timeline Progress Bar */}
      {data && data.weekDates?.length > 0 && (
        <Card className="border-white/10 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-white">Project Timeline Progress</span>
                {analytics.isProjectComplete && (
                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-[10px]">
                    Complete
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDateLong(data.weekDates[0])} → {formatDateLong(data.weekDates[data.weekDates.length - 1])}
              </span>
            </div>
            <Progress value={analytics.progressPercent} className="h-3 bg-white/10" />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground">{formatDate(data.weekDates[0])}</span>
              <span className="text-xs text-teal-400 font-medium">
                {analytics.isProjectComplete
                  ? `Timeline complete — ${analytics.completedEvents} of ${analytics.totalEvents} events finished`
                  : `${analytics.progressPercent}% through timeline`
                }
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(data.weekDates[data.weekDates.length - 1])}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Milestones Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Category Breakdown */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <Tags className="h-4 w-4 text-teal-400" />
              Events by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {analytics.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.categoryBreakdown.slice(0, 6).map((cat, index) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                      <span className="text-white font-medium">{cat.events} events</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${analytics.totalEvents > 0 ? (cat.events / analytics.totalEvents) * 100 : 0}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming / Final Milestones */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              {analytics.isProjectComplete ? 'Final Milestones' : 'Upcoming Milestones'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {analytics.upcomingMilestones.length > 0 ? (
              <div className="space-y-3">
                {analytics.upcomingMilestones.map((milestone, index) => {
                  const milestoneKey = `upcoming-${index}`;
                  const isExpanded = expandedMilestone === milestoneKey;
                  return (
                    <div
                      key={index}
                      className="rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setExpandedMilestone(isExpanded ? null : milestoneKey)}
                    >
                      <div className="flex items-start gap-3 p-2">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: milestone.event.color || '#d1d5db' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-white ${isExpanded ? '' : 'truncate'}`}>{milestone.task}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {milestone.event.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {milestone.dateLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-7 pb-3 pt-1 space-y-1.5 border-t border-white/5 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Category:</span>
                            <span className="text-[11px] text-white">{milestone.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Date Range:</span>
                            <span className="text-[11px] text-white">
                              {formatDateLong(milestone.event.startDate)}
                              {milestone.event.startDate !== milestone.event.endDate && ` — ${formatDateLong(milestone.event.endDate)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Task:</span>
                            <span className="text-[11px] text-white">{milestone.task}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {analytics.isProjectComplete ? 'No milestones recorded' : 'No upcoming milestones'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              {analytics.isProjectComplete ? 'Latest Completions' : 'Recent Completions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {analytics.recentMilestones.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentMilestones.map((milestone, index) => {
                  const milestoneKey = `recent-${index}`;
                  const isExpanded = expandedMilestone === milestoneKey;
                  return (
                    <div
                      key={index}
                      className="rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setExpandedMilestone(isExpanded ? null : milestoneKey)}
                    >
                      <div className="flex items-start gap-3 p-2">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: milestone.event.color || '#d1d5db' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-white ${isExpanded ? '' : 'truncate'}`}>{milestone.task}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {milestone.event.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {milestone.dateLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-7 pb-3 pt-1 space-y-1.5 border-t border-white/5 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Category:</span>
                            <span className="text-[11px] text-white">{milestone.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Date Range:</span>
                            <span className="text-[11px] text-white">
                              {formatDateLong(milestone.event.startDate)}
                              {milestone.event.startDate !== milestone.event.endDate && ` — ${formatDateLong(milestone.event.endDate)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Task:</span>
                            <span className="text-[11px] text-white">{milestone.task}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {analytics.isProjectComplete ? 'No completions recorded' : 'No recent completions'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart and Event Types */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Weekly Activity Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[200px]">
              {analytics.weeklyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="week"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      interval={3}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number) => [`${value} events`, 'Active']}
                    />
                    <Bar dataKey="events" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No activity data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Type Breakdown */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <Calendar className="h-4 w-4 text-purple-400" />
              Event Types
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[200px]">
              {analytics.eventTypeBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.eventTypeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {analytics.eventTypeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number, name: string) => [`${value} events`, name]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No event type data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card className="border-white/10">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-teal-400" />
              Project Schedule
            </CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: '#93c5fd' }}></span>
                <span className="text-muted-foreground">Begins/Start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: '#86efac' }}></span>
                <span className="text-muted-foreground">Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: '#fcd34d' }}></span>
                <span className="text-muted-foreground">Departs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: '#c4b5fd' }}></span>
                <span className="text-muted-foreground">Arrive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: '#5eead4' }}></span>
                <span className="text-muted-foreground">Installation</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data && data.tasks?.length > 0 ? (
            <TimelineChart
              tasks={data.tasks}
              events={data.events}
              eventsByTask={data.eventsByTask}
              categories={data.categories}
              weekDates={data.weekDates}
              collapsedCategories={collapsedCategories}
              onCellClick={handleCellClick}
              onTaskClick={handleTaskClick}
              onCategoryToggle={toggleCategory}
              onCategoryDelete={(cat) => setCategoryToDelete(cat)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">No timeline data yet</p>
              <p className="text-sm mb-4">Import data from Google Sheets to get started</p>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                disabled={importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import from Google Sheet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import from Google Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all existing timeline data with data from the Google Sheet.
              Any changes you've made locally will be overwritten. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Modal */}
      <EventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent?.event || null}
        weekDate={selectedEvent?.weekDate || ''}
        weekDates={data?.weekDates || []}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
        isLoading={createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending}
        customEventTypes={customEventTypesQuery.data || []}
        onCreateEventType={async (typeData) => {
          await createEventTypeMutation.mutateAsync(typeData);
        }}
        onUpdateEventType={async (id, typeData) => {
          await updateEventTypeMutation.mutateAsync({ id, data: typeData });
        }}
        onDeleteEventType={async (id) => {
          await deleteEventTypeMutation.mutateAsync(id);
        }}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={!!selectedTask || isAddingTask}
        onClose={() => {
          setSelectedTask(null);
          setIsAddingTask(false);
        }}
        task={selectedTask}
        categories={categories}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending}
      />

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>"{categoryToDelete}"</strong>? This will permanently remove all tasks and events within this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (categoryToDelete) {
                  deleteCategoryMutation.mutate(categoryToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCategoryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
