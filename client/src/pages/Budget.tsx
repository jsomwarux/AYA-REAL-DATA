import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { fetchBudgetData, BudgetItem } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  Building2,
  FileText,
  Search,
  Users,
  PieChart,
  ChevronDown,
  ChevronUp,
  Home,
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

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format currency compact
function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

// Status badge colors
function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('contract') || s.includes('signed')) return 'bg-green-500/20 text-green-400';
  if (s.includes('realistic')) return 'bg-blue-500/20 text-blue-400';
  if (s.includes('rough')) return 'bg-amber-500/20 text-amber-400';
  if (s.includes('awaiting')) return 'bg-purple-500/20 text-purple-400';
  if (s === 'n/a' || s === 'n.a') return 'bg-gray-500/20 text-gray-400';
  return 'bg-white/10 text-muted-foreground';
}

// Chart colors
const CHART_COLORS = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#22c55e', '#ec4899', '#06b6d4', '#f97316', '#6366f1',
];

export default function Budget() {
  useDocumentTitle("Budget");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof BudgetItem>("subtotal");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showAllVendors, setShowAllVendors] = useState(false);

  const budgetQuery = useQuery({
    queryKey: ["budget"],
    queryFn: fetchBudgetData,
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const handleRefresh = async () => {
    await budgetQuery.refetch();
    toastSuccess("Data Refreshed", "Budget data has been updated.");
  };

  const isLoading = budgetQuery.isLoading;
  const data = budgetQuery.data;

  // Get unique values for filters
  const categories = useMemo(() => {
    if (!data?.items) return [];
    return [...new Set(data.items.map(item => item.category))].sort();
  }, [data?.items]);

  const statuses = useMemo(() => {
    if (!data?.items) return [];
    return [...new Set(data.items.map(item => item.status))].sort();
  }, [data?.items]);

  const vendors = useMemo(() => {
    if (!data?.items) return [];
    return [...new Set(data.items.map(item => item.vendor).filter(v => v))].sort();
  }, [data?.items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    let items = [...data.items];

    // Apply filters
    if (categoryFilter !== "all") {
      items = items.filter(item => item.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      items = items.filter(item => item.status === statusFilter);
    }
    if (vendorFilter !== "all") {
      items = items.filter(item => item.vendor === vendorFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.project.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.vendor.toLowerCase().includes(query)
      );
    }

    // Sort
    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return items;
  }, [data?.items, categoryFilter, statusFilter, vendorFilter, searchQuery, sortField, sortDirection]);

  // Calculate filtered totals
  const filteredTotal = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [filteredItems]);

  const handleSort = (field: keyof BudgetItem) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: keyof BudgetItem }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 inline ml-1" /> :
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  // Prepare chart data for categories (top 8)
  const categoryChartData = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return data.categoryBreakdown.slice(0, 8).map((cat, index) => ({
      name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
      fullName: cat.name,
      value: cat.total,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data?.categoryBreakdown]);

  // Prepare pie chart data for paid vs remaining
  const paidVsRemainingData = useMemo(() => {
    if (!data?.totals) return [];
    const remaining = data.totals.totalBudget - data.totals.paidThusFar;
    return [
      { name: 'Paid', value: data.totals.paidThusFar, color: '#22c55e' },
      { name: 'Remaining', value: remaining > 0 ? remaining : 0, color: '#3b82f6' },
    ];
  }, [data?.totals]);

  // Vendors to show (top 10 or all)
  const displayedVendors = useMemo(() => {
    if (!data?.vendorBreakdown) return [];
    return showAllVendors ? data.vendorBreakdown : data.vendorBreakdown.slice(0, 10);
  }, [data?.vendorBreakdown, showAllVendors]);

  return (
    <DashboardLayout
      title="Budget Overview"
      subtitle="Project budget tracking and analysis"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Budget"
          value={formatCurrencyCompact(data?.totals?.totalBudget || 0)}
          change="Including contingency"
          changeType="neutral"
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Paid Thus Far"
          value={formatCurrencyCompact(data?.totals?.paidThusFar || 0)}
          change={data?.totals?.totalBudget ? `${Math.round((data.totals.paidThusFar / data.totals.totalBudget) * 100)}% of budget` : '0%'}
          changeType="positive"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Hard Costs"
          value={formatCurrencyCompact(data?.totals?.hardCosts || 0)}
          change={`${data?.categoryBreakdown?.filter(c => c.name.toLowerCase() !== 'soft costs').length || 0} categories`}
          changeType="neutral"
          icon={<Building2 className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Soft Costs"
          value={formatCurrencyCompact(data?.totals?.softCosts || 0)}
          change="Non-construction"
          changeType="neutral"
          icon={<FileText className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Cost Per Room"
          value={formatCurrencyCompact(data?.totals?.costPerRoom || 0)}
          change={`${data?.totals?.totalRooms || 166} rooms`}
          changeType="neutral"
          icon={<Home className="h-5 w-5" />}
          accentColor="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Category Breakdown Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="h-5 w-5 text-teal-400" />
              Budget by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      type="number"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                      tickFormatter={(value) => formatCurrencyCompact(value)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={11}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(217 33% 17%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white"
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        formatCurrency(value),
                        props.payload.fullName
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paid vs Remaining Pie Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-400" />
              Paid vs Remaining
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              {paidVsRemainingData.length > 0 && data?.totals?.totalBudget ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={paidVsRemainingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paidVsRemainingData.map((entry, index) => (
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
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown & Vendor Summary Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Status Breakdown */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-blue-400" />
              Budget by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {data?.statusBreakdown?.map((status, index) => {
              const percentage = data.totals.total > 0
                ? Math.round((status.total / data.totals.total) * 100)
                : 0;
              return (
                <div key={status.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(status.status)}>
                        {status.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        ({status.count} items)
                      </span>
                    </div>
                    <span className="font-medium text-white">
                      {formatCurrency(status.total)}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2 bg-white/10"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Vendor Summary */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-amber-400" />
              Top Vendors by Spend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {displayedVendors.map((vendor, index) => (
                <div
                  key={vendor.name}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-white truncate max-w-[180px]">
                      {vendor.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-teal-400">
                    {formatCurrency(vendor.total)}
                  </span>
                </div>
              ))}
            </div>
            {data?.vendorBreakdown && data.vendorBreakdown.length > 10 && (
              <button
                onClick={() => setShowAllVendors(!showAllVendors)}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-white transition-colors"
              >
                {showAllVendors
                  ? 'Show less'
                  : `Show all ${data.vendorBreakdown.length} vendors`}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border-white/10">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-teal-400" />
              Budget Line Items
              <Badge variant="outline" className="ml-2">
                {filteredItems.length} items
              </Badge>
              {filteredItems.length !== data?.items?.length && (
                <span className="text-sm text-muted-foreground">
                  (Total: {formatCurrency(filteredTotal)})
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, categories, vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border border-white/10 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead
                      className="text-muted-foreground cursor-pointer hover:text-white"
                      onClick={() => handleSort('category')}
                    >
                      Category <SortIcon field="category" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer hover:text-white"
                      onClick={() => handleSort('vendor')}
                    >
                      Vendor <SortIcon field="vendor" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer hover:text-white max-w-[300px]"
                      onClick={() => handleSort('project')}
                    >
                      Project <SortIcon field="project" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground cursor-pointer hover:text-white"
                      onClick={() => handleSort('status')}
                    >
                      Status <SortIcon field="status" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground text-right cursor-pointer hover:text-white"
                      onClick={() => handleSort('subtotal')}
                    >
                      Subtotal <SortIcon field="subtotal" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="border-white/10 hover:bg-white/5"
                      >
                        <TableCell className="font-medium text-white">
                          {item.category}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.vendor || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {item.project}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-teal-400">
                          {item.subtotal > 0 ? formatCurrency(item.subtotal) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
