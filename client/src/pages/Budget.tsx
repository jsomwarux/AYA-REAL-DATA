import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchBudgetData, type BudgetLineItem } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Calculator,
  Percent,
  Home,
  Search,
  BarChart3,
  ChevronDown,
  ChevronUp,
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
  LabelList,
} from "recharts";

// Whole-dollar currency.
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Compact currency ($1.2M / $340K).
function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatCurrency(value);
}

// Recharts palette (categorical).
const CHART_COLORS = [
  "#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#22c55e", "#ec4899", "#06b6d4", "#f97316", "#6366f1",
  "#84cc16", "#a855f7", "#0ea5e9", "#eab308", "#f43f5e",
  "#10b981", "#d946ef", "#38bdf8", "#fb923c", "#4f46e5", "#94a3b8",
];

export default function Budget() {
  useDocumentTitle("Budget");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof BudgetLineItem>("estimatedCost");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const budgetQuery = useQuery({
    queryKey: ["budget"],
    queryFn: fetchBudgetData,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const handleRefresh = async () => {
    await budgetQuery.refetch();
    toastSuccess("Data Refreshed", "Budget data has been updated.");
  };

  const isLoading = budgetQuery.isLoading;
  const data = budgetQuery.data;
  const totals = data?.totals;

  // Category filter options — the pretty display names, in the chart's descending order.
  const categoryOptions = useMemo(
    () => (data?.categories || []).map((c) => c.displayName),
    [data?.categories],
  );

  // Horizontal bar-chart data (descending). Each bar carries a precomputed "$X · Y%" label.
  const categoryChartData = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.map((cat, index) => ({
      name: cat.displayName,
      value: cat.total,
      pct: cat.pct,
      label: `${formatCurrencyCompact(cat.total)} · ${cat.pct.toFixed(1)}%`,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data?.categories]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = [...data.items];
    if (categoryFilter !== "all") {
      items = items.filter((it) => it.displayCategory === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.displayCategory.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });
    return items;
  }, [data?.items, categoryFilter, searchQuery, sortField, sortDirection]);

  const filteredTotal = useMemo(
    () => filteredItems.reduce((s, it) => s + it.estimatedCost, 0),
    [filteredItems],
  );

  const handleSort = (field: keyof BudgetLineItem) => {
    if (sortField === field) {
      setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  const SortIcon = ({ field }: { field: keyof BudgetLineItem }) =>
    sortField !== field ? null : sortDirection === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );

  return (
    <DashboardLayout
      title="Budget"
      subtitle={
        data?.lastUpdated
          ? `From the "Schedule Summary" tab · ${data.meta.lineItemCount} line items`
          : "Project budget from the Schedule Summary tab"
      }
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Money-first cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-3">
        <StatCard
          title="Total Budget"
          value={formatCurrency(totals?.total || 0)}
          change="Including 10% contingency"
          changeType="neutral"
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Paid Thus Far"
          value={formatCurrency(totals?.paid || 0)}
          change={totals ? `${Math.round(totals.paidPct)}% of total budget` : "—"}
          changeType="positive"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Remaining to Complete"
          value={formatCurrency(totals?.remaining || 0)}
          change="Total budget minus paid"
          changeType="neutral"
          icon={<Wallet className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Estimated Cost"
          value={formatCurrency(totals?.estimatedBeforeContingency || 0)}
          change="Before contingency"
          changeType="neutral"
          icon={<Calculator className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Contingency (10%)"
          value={formatCurrency(totals?.contingency || 0)}
          change="On the estimated cost"
          changeType="neutral"
          icon={<Percent className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Cost per unit (166 units)"
          value={formatCurrency(totals?.costPerUnit || 0)}
          change="Total budget ÷ 166"
          changeType="neutral"
          icon={<Home className="h-5 w-5" />}
          accentColor="blue"
        />
      </div>

      {/* Estimated cost by category (before contingency) */}
      <Card className="mb-6 border-white/10 sm:mb-8">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex flex-wrap items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5 text-teal-400" />
            Estimated cost by category (before contingency)
            <span className="text-xs font-normal text-muted-foreground">
              sums to {formatCurrency(totals?.estimatedBeforeContingency || 0)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {categoryChartData.length > 0 ? (
            <div style={{ height: Math.max(320, categoryChartData.length * 26) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 96, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={11}
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={11}
                    width={150}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(217 33% 17%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                    formatter={(value: number, _name, props: any) => [
                      `${formatCurrency(value)} · ${props.payload.pct.toFixed(1)}% of estimated`,
                      props.payload.name,
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList dataKey="label" position="right" fill="rgba(255,255,255,0.75)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-muted-foreground">
              {isLoading ? "Loading…" : "No category data available"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="border-white/10">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base text-white sm:text-lg">
            <BarChart3 className="h-5 w-5 text-teal-400" />
            Line Items
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {filteredItems.length}
            </Badge>
            {filteredItems.length !== (data?.items?.length || 0) && (
              <span className="text-xs text-muted-foreground sm:text-sm">
                ({formatCurrencyCompact(filteredTotal)})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 flex flex-wrap gap-2 sm:mb-6 sm:gap-4">
            <div className="relative min-w-[160px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search line items…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-white/10 bg-white/5 pl-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[150px] border-white/10 bg-white/5 text-xs sm:w-[200px] sm:text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border border-white/10">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer text-xs text-muted-foreground hover:text-white sm:text-sm"
                      onClick={() => handleSort("name")}
                    >
                      Line Item <SortIcon field="name" />
                    </TableHead>
                    <TableHead
                      className="hidden cursor-pointer text-xs text-muted-foreground hover:text-white sm:table-cell sm:text-sm"
                      onClick={() => handleSort("displayCategory")}
                    >
                      Category <SortIcon field="displayCategory" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right text-xs text-muted-foreground hover:text-white sm:text-sm"
                      onClick={() => handleSort("estimatedCost")}
                    >
                      Estimated <SortIcon field="estimatedCost" />
                    </TableHead>
                    <TableHead
                      className="hidden cursor-pointer text-right text-xs text-muted-foreground hover:text-white md:table-cell sm:text-sm"
                      onClick={() => handleSort("paid")}
                    >
                      Paid <SortIcon field="paid" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="py-2.5 text-xs text-white sm:py-4 sm:text-sm">
                          <div className="max-w-[220px] truncate font-medium sm:max-w-[380px]" title={item.name}>
                            {item.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">
                            {item.displayCategory}
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2.5 sm:table-cell sm:py-4">
                          <Badge className="bg-white/10 text-[10px] text-muted-foreground sm:text-xs">
                            {item.displayCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-2.5 text-right text-xs font-medium text-teal-400 sm:py-4 sm:text-sm">
                          {formatCurrency(item.estimatedCost)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap py-2.5 text-right text-xs text-muted-foreground md:table-cell sm:py-4 sm:text-sm">
                          {item.paid > 0 ? formatCurrency(item.paid) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No items match your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
