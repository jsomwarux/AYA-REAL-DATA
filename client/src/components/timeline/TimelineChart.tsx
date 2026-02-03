import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { TimelineTask, TimelineEvent } from "@/lib/api";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
  Maximize2,
  Minimize2,
  ChevronsDown,
  ChevronsUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get month label from date
function getMonthLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Check if a date is in the current week
function isCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
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
  const date = new Date(dateStr + "T00:00:00");
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

// Calculate how many weeks an event spans from a given date
function getEventSpanFromDate(
  dateStr: string,
  event: TimelineEvent,
  weekDates: string[]
): number {
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Build event lookup - for each task+date, find the event that covers it
  const eventLookup = useMemo(() => {
    const lookup: Record<
      string,
      { event: TimelineEvent; isStart: boolean; isEnd: boolean; span: number }
    > = {};

    for (const event of events) {
      for (const date of weekDates) {
        if (isDateInEventRange(date, event)) {
          const key = `${event.taskId}-${date}`;
          const isStart = isEventStart(date, event);
          const span = isStart
            ? getEventSpanFromDate(date, event, weekDates)
            : 0;
          lookup[key] = {
            event,
            isStart,
            isEnd: date === event.endDate,
            span,
          };
        }
      }
    }

    return lookup;
  }, [events, weekDates]);

  // Month groups for the top header
  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    let currentMonth = "";
    let currentSpan = 0;

    for (const date of weekDates) {
      const month = getMonthLabel(date);
      if (month !== currentMonth) {
        if (currentMonth) {
          groups.push({ label: currentMonth, span: currentSpan });
        }
        currentMonth = month;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    }
    if (currentMonth) {
      groups.push({ label: currentMonth, span: currentSpan });
    }
    return groups;
  }, [weekDates]);

  // Scroll to current week on mount
  useEffect(() => {
    if (!scrollContainerRef.current || hasScrolled) return;

    const currentWeekIndex = weekDates.findIndex((date) =>
      isCurrentWeek(date)
    );
    if (currentWeekIndex > 0) {
      const cellWidth = 80;
      const scrollPosition = (currentWeekIndex - 2) * cellWidth;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      setHasScrolled(true);
    }
  }, [weekDates, hasScrolled]);

  // Scroll to today button handler
  const scrollToToday = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const currentWeekIndex = weekDates.findIndex((date) =>
      isCurrentWeek(date)
    );
    if (currentWeekIndex >= 0) {
      const cellWidth = 80;
      const scrollPosition = (currentWeekIndex - 2) * cellWidth;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }
  }, [weekDates]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return Object.keys(categories).sort();
  }, [categories]);

  // Expand/collapse all
  const allCollapsed = sortedCategories.every((cat) =>
    collapsedCategories.has(cat)
  );

  const toggleAll = () => {
    if (allCollapsed) {
      // Expand all
      for (const cat of sortedCategories) {
        if (collapsedCategories.has(cat)) {
          onCategoryToggle(cat);
        }
      }
    } else {
      // Collapse all
      for (const cat of sortedCategories) {
        if (!collapsedCategories.has(cat)) {
          onCategoryToggle(cat);
        }
      }
    }
  };

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Lock body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const chartInner = (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-white gap-1.5 h-7 px-2"
          >
            {allCollapsed ? (
              <>
                <ChevronsDown className="h-3.5 w-3.5" />
                Expand All
              </>
            ) : (
              <>
                <ChevronsUp className="h-3.5 w-3.5" />
                Collapse All
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToToday}
            className="text-xs text-teal-400 hover:text-teal-300 gap-1.5 h-7 px-2"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            {sortedCategories.length} categories · {tasks.length} tasks ·{" "}
            {events.length} events
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-white gap-1.5 h-7 px-2"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto flex-1"
      >
        <div className="min-w-max">
          {/* Month header row */}
          <div className="flex sticky top-0 z-30 bg-background border-b border-white/10">
            <div className="sticky left-0 z-40 w-[180px] sm:w-[250px] min-w-[180px] sm:min-w-[250px] bg-background border-r border-white/10" />
            {monthGroups.map((group, idx) => (
              <div
                key={`${group.label}-${idx}`}
                className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1 border-r border-white/10"
                style={{ width: `${group.span * 80}px`, minWidth: `${group.span * 80}px` }}
              >
                {group.label}
              </div>
            ))}
          </div>

          {/* Week date header row */}
          <div className="flex sticky top-[25px] z-20 bg-background border-b border-white/10">
            {/* Fixed left column for task names */}
            <div className="sticky left-0 z-30 w-[180px] sm:w-[250px] min-w-[180px] sm:min-w-[250px] bg-background border-r border-white/10 p-2 pl-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Category / Task
              </span>
            </div>
            {/* Date columns */}
            {weekDates.map((date) => (
              <div
                key={date}
                className={cn(
                  "w-20 min-w-[80px] py-1.5 px-1 text-center text-[11px] font-medium border-r border-white/5",
                  isCurrentWeek(date) &&
                    "bg-teal-500/15 text-teal-400 font-semibold",
                  isPastWeek(date) && !isCurrentWeek(date) && "text-muted-foreground/60"
                )}
              >
                {formatDateHeader(date)}
                {isCurrentWeek(date) && (
                  <div className="w-1 h-1 rounded-full bg-teal-400 mx-auto mt-0.5" />
                )}
              </div>
            ))}
          </div>

          {/* Task rows grouped by category */}
          {sortedCategories.map((category) => {
            const categoryTasks = categories[category] || [];
            const isCollapsed = collapsedCategories.has(category);

            // Count events for this category
            const categoryEventCount = categoryTasks.reduce((sum, t) => {
              return sum + (eventsByTask[t.id]?.length || 0);
            }, 0);

            return (
              <div key={category}>
                {/* Category header row */}
                <div
                  className="flex bg-white/[0.04] border-b border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors group"
                  onClick={() => onCategoryToggle(category)}
                >
                  <div className="sticky left-0 z-10 w-[180px] sm:w-[250px] min-w-[180px] sm:min-w-[250px] bg-white/[0.04] group-hover:bg-white/[0.07] border-r border-white/10 p-2.5 pl-3 flex items-center gap-2 transition-colors">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-white truncate">
                      {category}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                      {categoryTasks.length} tasks · {categoryEventCount} events
                    </span>
                    {onCategoryRename && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryRename(category);
                        }}
                        title={`Rename category "${category}"`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onCategoryDelete && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryDelete(category);
                        }}
                        title={`Delete category "${category}"`}
                      >
                        <Trash2 className="h-3 w-3" />
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
                {!isCollapsed &&
                  categoryTasks.map((task) => {
                    const taskEvents = eventsByTask[task.id] || [];

                    return (
                      <div
                        key={task.id}
                        className="flex border-b border-white/5 hover:bg-white/[0.02] relative"
                      >
                        {/* Task name */}
                        <div
                          className="sticky left-0 z-10 w-[180px] sm:w-[250px] min-w-[180px] sm:min-w-[250px] bg-background border-r border-white/10 p-2.5 pl-9 cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-2"
                          onClick={() => onTaskClick(task)}
                        >
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {task.task}
                          </span>
                          {taskEvents.length > 0 && (
                            <span className="text-[9px] text-muted-foreground/50 flex-shrink-0">
                              {taskEvents.length}
                            </span>
                          )}
                        </div>
                        {/* Event cells */}
                        {weekDates.map((date) => {
                          const eventKey = `${task.id}-${date}`;
                          const eventInfo = eventLookup[eventKey];
                          const event = eventInfo?.event;
                          const isStart = eventInfo?.isStart;
                          const span = eventInfo?.span || 0;

                          const isMultiWeek =
                            event && event.startDate !== event.endDate;

                          return (
                            <div
                              key={date}
                              className={cn(
                                "w-20 min-w-[80px] border-r border-white/5 cursor-pointer transition-colors relative h-10",
                                isCurrentWeek(date) && "bg-teal-500/5",
                                !event && "hover:bg-white/5"
                              )}
                              onClick={() =>
                                onCellClick(task.id, date, event || null)
                              }
                            >
                              {event && isStart && (
                                <div
                                  className="absolute top-1 bottom-1 left-0 flex items-center justify-center overflow-hidden rounded"
                                  style={{
                                    width: isMultiWeek
                                      ? `calc(${span * 80}px - 4px)`
                                      : "calc(100% - 4px)",
                                    marginLeft: "2px",
                                    backgroundColor: event.color || "#d1d5db",
                                    zIndex: 5,
                                  }}
                                >
                                  <span
                                    className="text-[10px] font-medium truncate px-2"
                                    style={{ color: "rgba(0,0,0,0.8)" }}
                                  >
                                    {event.label || ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Fullscreen overlay mode
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {chartInner}
      </div>
    );
  }

  // Normal inline mode with reasonable height
  return (
    <div style={{ height: "clamp(400px, 60vh, 700px)" }}>
      {chartInner}
    </div>
  );
}
