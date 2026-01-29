import { useMemo, useRef, useEffect, useState } from "react";
import { TimelineTask, TimelineEvent } from "@/lib/api";
import { ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineChartProps {
  tasks: TimelineTask[];
  events: TimelineEvent[];
  eventsByTask: Record<number, TimelineEvent[]>;
  categories: Record<string, TimelineTask[]>;
  weekDates: string[];
  collapsedCategories: Set<string>;
  onCellClick: (taskId: number, weekDate: string, existingEvent: TimelineEvent | null) => void;
  onTaskClick: (task: TimelineTask) => void;
  onCategoryToggle: (category: string) => void;
  onCategoryDelete?: (category: string) => void;
  onCategoryRename?: (category: string) => void;
}

// Format date for header display
function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Check if a date is in the current week
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

// Check if a date is in the past
function isPastWeek(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return date < startOfWeek;
}

// Check if a date falls within an event's range
function isDateInEventRange(dateStr: string, event: TimelineEvent): boolean {
  return dateStr >= event.startDate && dateStr <= event.endDate;
}

// Check if a date is the start of an event
function isEventStart(dateStr: string, event: TimelineEvent): boolean {
  return dateStr === event.startDate;
}

// Check if a date is the end of an event
function isEventEnd(dateStr: string, event: TimelineEvent): boolean {
  return dateStr === event.endDate;
}

// Calculate how many weeks an event spans from a given date
function getEventSpanFromDate(dateStr: string, event: TimelineEvent, weekDates: string[]): number {
  const startIndex = weekDates.indexOf(dateStr);
  const endIndex = weekDates.indexOf(event.endDate);
  if (startIndex === -1 || endIndex === -1) return 1;
  return endIndex - startIndex + 1;
}

export function TimelineChart({
  tasks,
  events,
  eventsByTask,
  categories,
  weekDates,
  collapsedCategories,
  onCellClick,
  onTaskClick,
  onCategoryToggle,
  onCategoryDelete,
  onCategoryRename,
}: TimelineChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Build event lookup - for each task+date, find the event that covers it
  const eventLookup = useMemo(() => {
    const lookup: Record<string, { event: TimelineEvent; isStart: boolean; isEnd: boolean; span: number }> = {};

    for (const event of events) {
      // For each date in the range, mark it
      for (const date of weekDates) {
        if (isDateInEventRange(date, event)) {
          const key = `${event.taskId}-${date}`;
          const isStart = isEventStart(date, event);
          const isEnd = isEventEnd(date, event);
          const span = isStart ? getEventSpanFromDate(date, event, weekDates) : 0;
          lookup[key] = { event, isStart, isEnd, span };
        }
      }
    }

    return lookup;
  }, [events, weekDates]);

  // Scroll to current week on mount
  useEffect(() => {
    if (!scrollContainerRef.current || hasScrolled) return;

    const currentWeekIndex = weekDates.findIndex(date => isCurrentWeek(date));
    if (currentWeekIndex > 0) {
      const cellWidth = 80;
      const scrollPosition = (currentWeekIndex - 2) * cellWidth;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      setHasScrolled(true);
    }
  }, [weekDates, hasScrolled]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return Object.keys(categories).sort();
  }, [categories]);

  return (
    <div className="overflow-hidden">
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 400px)' }}
      >
        <div className="min-w-max">
          {/* Header row with dates */}
          <div className="flex sticky top-0 z-20 bg-background border-b border-white/10">
            {/* Fixed left column for task names */}
            <div className="sticky left-0 z-30 w-[250px] min-w-[250px] bg-background border-r border-white/10 p-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category / Task
              </span>
            </div>
            {/* Date columns */}
            {weekDates.map((date) => (
              <div
                key={date}
                className={cn(
                  "w-20 min-w-[80px] p-2 text-center text-xs font-medium border-r border-white/5",
                  isCurrentWeek(date) && "bg-teal-500/10 text-teal-400",
                  isPastWeek(date) && "text-muted-foreground"
                )}
              >
                {formatDateHeader(date)}
              </div>
            ))}
          </div>

          {/* Task rows grouped by category */}
          {sortedCategories.map((category) => {
            const categoryTasks = categories[category] || [];
            const isCollapsed = collapsedCategories.has(category);

            return (
              <div key={category}>
                {/* Category header row */}
                <div
                  className="flex bg-white/5 border-b border-white/10 cursor-pointer hover:bg-white/10 transition-colors group"
                  onClick={() => onCategoryToggle(category)}
                >
                  <div className="sticky left-0 z-10 w-[250px] min-w-[250px] bg-white/5 border-r border-white/10 p-3 flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-white truncate">
                      {category}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({categoryTasks.length})
                    </span>
                    {onCategoryRename && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryRename(category);
                        }}
                        title={`Rename category "${category}"`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onCategoryDelete && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryDelete(category);
                        }}
                        title={`Delete category "${category}"`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Empty cells for category row */}
                  {weekDates.map((date) => (
                    <div
                      key={date}
                      className={cn(
                        "w-20 min-w-[80px] border-r border-white/5",
                        isCurrentWeek(date) && "bg-teal-500/5"
                      )}
                    />
                  ))}
                </div>

                {/* Task rows (if not collapsed) */}
                {!isCollapsed && categoryTasks.map((task) => (
                  <div key={task.id} className="flex border-b border-white/5 hover:bg-white/[0.02] relative">
                    {/* Task name */}
                    <div
                      className="sticky left-0 z-10 w-[250px] min-w-[250px] bg-background border-r border-white/10 p-3 pl-9 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => onTaskClick(task)}
                    >
                      <span className="text-sm text-muted-foreground truncate block">
                        {task.task}
                      </span>
                    </div>
                    {/* Event cells */}
                    {weekDates.map((date, dateIndex) => {
                      const eventKey = `${task.id}-${date}`;
                      const eventInfo = eventLookup[eventKey];
                      const event = eventInfo?.event;
                      const isStart = eventInfo?.isStart;
                      const isEnd = eventInfo?.isEnd;
                      const span = eventInfo?.span || 0;

                      // For multi-week events, only render the bar at the start
                      const isMultiWeek = event && event.startDate !== event.endDate;

                      return (
                        <div
                          key={date}
                          className={cn(
                            "w-20 min-w-[80px] border-r border-white/5 cursor-pointer transition-colors relative h-10",
                            isCurrentWeek(date) && "bg-teal-500/5",
                            !event && "hover:bg-white/5"
                          )}
                          onClick={() => onCellClick(task.id, date, event || null)}
                        >
                          {/* Render event bar at start of multi-week event */}
                          {event && isStart && (
                            <div
                              className="absolute top-1 bottom-1 left-0 flex items-center justify-center overflow-hidden rounded"
                              style={{
                                width: isMultiWeek ? `calc(${span * 80}px - 4px)` : 'calc(100% - 4px)',
                                marginLeft: '2px',
                                backgroundColor: event.color || '#d1d5db',
                                zIndex: 5,
                              }}
                            >
                              <span
                                className="text-[10px] font-medium truncate px-2"
                                style={{ color: 'rgba(0,0,0,0.8)' }}
                              >
                                {event.label || ''}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
