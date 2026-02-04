import { useState, useMemo } from "react";
import {
  Target,
  CheckCircle2,
  Clock,
  CircleSlash,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyGoal, WeeklyGoalsSummary } from "@/lib/api";

// Assignee color map
const ASSIGNEE_COLORS: Record<string, { bg: string; text: string }> = {
  Gil: { bg: "bg-teal-500/20", text: "text-teal-300" },
  Andrew: { bg: "bg-amber-500/20", text: "text-amber-300" },
  Fatima: { bg: "bg-pink-500/20", text: "text-pink-300" },
  Gilad: { bg: "bg-blue-500/20", text: "text-blue-300" },
  Mia: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  Daniel: { bg: "bg-orange-500/20", text: "text-orange-300" },
  Kobi: { bg: "bg-red-500/20", text: "text-red-300" },
  Libby: { bg: "bg-cyan-500/20", text: "text-cyan-300" },
  Liat: { bg: "bg-violet-500/20", text: "text-violet-300" },
};

const DEFAULT_ASSIGNEE_COLOR = { bg: "bg-gray-500/20", text: "text-gray-300" };

// Status color map
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Done": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "In progress": { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  "Partially Completed": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  "Did not start": { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  "Not done yet": { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" },
};

const DEFAULT_STATUS_STYLE = { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" };

type SortField = "weeklyGoal" | "assignee" | "target" | "deadline" | "result";
type SortDirection = "asc" | "desc";

function formatDeadline(dateStr: string): string {
  if (!dateStr) return "";
  // Handle formats like "2/6/2026" or "Feb 6"
  try {
    // Try parsing as a date
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

interface WeeklyGoalsDashboardProps {
  goals: WeeklyGoal[];
  summary: WeeklyGoalsSummary;
  isLoading: boolean;
}

export function WeeklyGoalsDashboard({ goals, summary, isLoading }: WeeklyGoalsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("weeklyGoal");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Unique assignees and statuses for filter dropdowns
  const assignees = useMemo(() => {
    const set = new Set(goals.map((g) => g.assignee).filter(Boolean));
    return Array.from(set).sort();
  }, [goals]);

  const statuses = useMemo(() => {
    const set = new Set(goals.map((g) => g.result).filter(Boolean));
    return Array.from(set).sort();
  }, [goals]);

  // Filtered and sorted goals
  const filteredGoals = useMemo(() => {
    let result = [...goals];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.weeklyGoal.toLowerCase().includes(q) ||
          g.target.toLowerCase().includes(q) ||
          g.comments.toLowerCase().includes(q)
      );
    }

    // Assignee filter
    if (assigneeFilter !== "all") {
      result = result.filter((g) => g.assignee === assigneeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((g) => g.result === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [goals, searchQuery, assigneeFilter, statusFilter, sortField, sortDirection]);

  // Summary stats
  const doneCount = summary.byStatus["Done"] || 0;
  const inProgressCount = summary.byStatus["In progress"] || 0;
  const notStartedCount =
    (summary.byStatus["Did not start"] || 0) + (summary.byStatus["Not done yet"] || 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-white/10 bg-[#12121a]">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Skeleton table */}
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-400/10">
                <Target className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Goals</p>
                <p className="text-2xl font-bold text-white">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Done</p>
                <p className="text-2xl font-bold text-emerald-400">{doneCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-400/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-400">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10">
                <CircleSlash className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold text-red-400">{notStartedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search goals or targets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50"
              />
            </div>

            {/* Assignee Filter */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Goals Table */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span>Goals ({filteredGoals.length})</span>
            {(searchQuery || assigneeFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setAssigneeFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs text-muted-foreground hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("weeklyGoal")}
                  >
                    <div className="flex items-center gap-1">
                      Goal
                      <SortIcon field="weeklyGoal" />
                    </div>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-white transition-colors w-[120px]"
                    onClick={() => handleSort("assignee")}
                  >
                    <div className="flex items-center gap-1">
                      Assignee
                      <SortIcon field="assignee" />
                    </div>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("target")}
                  >
                    <div className="flex items-center gap-1">
                      Target
                      <SortIcon field="target" />
                    </div>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-white transition-colors w-[120px]"
                    onClick={() => handleSort("deadline")}
                  >
                    <div className="flex items-center gap-1">
                      Deadline
                      <SortIcon field="deadline" />
                    </div>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer hover:text-white transition-colors w-[160px]"
                    onClick={() => handleSort("result")}
                  >
                    <div className="flex items-center gap-1">
                      Result
                      <SortIcon field="result" />
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[48px]">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGoals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No goals match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredGoals.map((goal) => {
                    const assigneeColor = ASSIGNEE_COLORS[goal.assignee] || DEFAULT_ASSIGNEE_COLOR;
                    const statusStyle = STATUS_STYLES[goal.result] || DEFAULT_STATUS_STYLE;

                    return (
                      <tr
                        key={goal.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm text-white">{goal.weeklyGoal}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${assigneeColor.bg} ${assigneeColor.text}`}
                          >
                            {goal.assignee}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{goal.target}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDeadline(goal.deadline)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {goal.result ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              {goal.result}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {goal.comments ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-white transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{goal.comments}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3 p-4">
            {filteredGoals.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No goals match your filters.
              </p>
            ) : (
              filteredGoals.map((goal) => {
                const assigneeColor = ASSIGNEE_COLORS[goal.assignee] || DEFAULT_ASSIGNEE_COLOR;
                const statusStyle = STATUS_STYLES[goal.result] || DEFAULT_STATUS_STYLE;

                return (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white flex-1">{goal.weeklyGoal}</p>
                      {goal.result && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {goal.result}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${assigneeColor.bg} ${assigneeColor.text}`}
                      >
                        {goal.assignee}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDeadline(goal.deadline)}
                      </span>
                    </div>
                    {goal.target && (
                      <p className="text-xs text-muted-foreground">{goal.target}</p>
                    )}
                    {goal.comments && (
                      <p className="text-xs text-muted-foreground/70 italic">{goal.comments}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
