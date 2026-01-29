import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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

  const timelineQuery = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimelineData,
    retry: false,
    staleTime: 1000 * 60 * 2,
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

  const handleRefresh = async () => {
    await timelineQuery.refetch();
    toastSuccess("Data Refreshed", "Timeline data has been updated.");
  };

  const isLoading = timelineQuery.isLoading;
  const data = timelineQuery.data;

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return { tasks: 0, events: 0, categories: 0, timespan: '' };

    const categories = Object.keys(data.categories || {}).length;
    const tasks = data.tasks?.length || 0;
    const events = data.events?.length || 0;

    // Calculate timespan
    const dates = data.weekDates || [];
    const timespan = dates.length > 0
      ? `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`
      : 'No dates';

    return { tasks, events, categories, timespan };
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
  const handleEventSave = (eventData: { label: string; color: string }) => {
    if (!selectedEvent) return;

    if (selectedEvent.event) {
      // Update existing
      updateEventMutation.mutate({
        id: selectedEvent.event.id,
        data: {
          label: eventData.label,
          color: eventData.color,
        },
      });
    } else {
      // Create new
      createEventMutation.mutate({
        taskId: selectedEvent.taskId,
        weekDate: selectedEvent.weekDate,
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
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats.tasks.toString()}
          change="Project milestones"
          changeType="neutral"
          icon={<ListChecks className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Events"
          value={stats.events.toString()}
          change="Timeline markers"
          changeType="neutral"
          icon={<Calendar className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Categories"
          value={stats.categories.toString()}
          change="Work streams"
          changeType="neutral"
          icon={<Tags className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Timeline Span"
          value={stats.timespan}
          change="Project duration"
          changeType="neutral"
          icon={<Clock className="h-5 w-5" />}
          accentColor="amber"
        />
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
        onSave={handleEventSave}
        onDelete={handleEventDelete}
        isLoading={createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending}
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
    </DashboardLayout>
  );
}
