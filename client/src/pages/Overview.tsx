import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCardsSkeleton, ChartSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorState } from "@/components/ui/error-state";
import { checkHealth, fetchConstructionData, fetchDealsData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess } from "@/hooks/use-toast";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Home,
  TrendingUp,
  CheckCircle,
  HardHat,
  Radar,
  Activity
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Chart colors matching design system
const COLORS = {
  teal: "#14b8a6",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "#3b82f6",
};

// Mock data for demonstration - will be replaced by Google Sheets data
const invoiceStatusData = [
  { name: "Approved", value: 45, color: COLORS.teal },
  { name: "Pending", value: 20, color: COLORS.amber },
  { name: "Flagged", value: 8, color: COLORS.red },
];

const monthlyDealsData = [
  { month: "Jan", deals: 4, value: 2.1 },
  { month: "Feb", deals: 6, value: 3.2 },
  { month: "Mar", deals: 5, value: 2.8 },
  { month: "Apr", deals: 8, value: 4.5 },
  { month: "May", deals: 7, value: 3.9 },
  { month: "Jun", deals: 10, value: 5.2 },
];

export default function Overview() {
  useDocumentTitle("Overview");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
  });

  const constructionQuery = useQuery({
    queryKey: ["construction"],
    queryFn: () => fetchConstructionData(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const dealsQuery = useQuery({
    queryKey: ["deals"],
    queryFn: () => fetchDealsData(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    await Promise.all([constructionQuery.refetch(), dealsQuery.refetch()]);
    toastSuccess("Data Refreshed", "All dashboard data has been updated.");
  };

  const isLoading = constructionQuery.isLoading || dealsQuery.isLoading;
  const sheetsConfigured = (healthQuery.data as any)?.sheetsConfigured;

  // Calculate stats from real data
  const constructionRows = constructionQuery.data?.rows || [];
  const dealsRows = dealsQuery.data?.rows || [];

  // Helper to get field with case-insensitive lookup
  const getField = (row: any, ...keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
      if (row[key.toUpperCase()] !== undefined && row[key.toUpperCase()] !== null) return row[key.toUpperCase()];
      if (row[key.toLowerCase()] !== undefined && row[key.toLowerCase()] !== null) return row[key.toLowerCase()];
    }
    return null;
  };

  const flaggedInvoices = constructionRows.filter((r: any) => {
    const verdict = getField(r, 'verdict', 'VERDICT', 'status');
    return verdict && (verdict.toUpperCase() === 'HOLD_FOR_REVIEW' || verdict.toUpperCase() === 'REJECT');
  }).length;

  const totalDeals = dealsRows.length;

  return (
    <DashboardLayout
      title="Dashboard Overview"
      subtitle="Real-time insights from your automated workflows"
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
          title="Active Projects"
          value="12"
          change="+2 this month"
          changeType="positive"
          icon={<Home className="h-5 w-5" />}
          accentColor="teal"
        />
        <StatCard
          title="Flagged Invoices"
          value={flaggedInvoices}
          change="Requires review"
          changeType="negative"
          icon={<AlertTriangle className="h-5 w-5" />}
          accentColor="red"
        />
        <StatCard
          title="Deals Analyzed"
          value={totalDeals}
          change="+8 this week"
          changeType="positive"
          icon={<FileText className="h-5 w-5" />}
          accentColor="purple"
        />
        <StatCard
          title="Portfolio Value"
          value="$24.5M"
          change="+12.3% YTD"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5" />}
          accentColor="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice Status Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-teal-400" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {invoiceStatusData.map((entry, index) => (
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
                  />
                  <Legend
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Deals Chart */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Monthly Deal Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDealsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(217 33% 17%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "white"
                    }}
                  />
                  <Bar
                    dataKey="deals"
                    fill={COLORS.purple}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Status */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 group hover:border-blue-500/30 transition-colors">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <HardHat className="h-5 w-5 text-blue-400" />
              Construction Oversight Engine
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
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium text-white">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoices Processed</span>
                <span className="text-sm font-medium text-white">73</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 group hover:border-purple-500/30 transition-colors">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-white">
              <Radar className="h-5 w-5 text-purple-400" />
              Deal Intelligence System
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
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium text-white">5 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Properties Scored</span>
                <span className="text-sm font-medium text-white">{totalDeals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
