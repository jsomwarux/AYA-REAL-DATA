import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkHealth, fetchConstructionData, fetchDealsData } from "@/lib/api";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Home,
  TrendingUp,
  CheckCircle
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

// Mock data for demonstration - will be replaced by Google Sheets data
const invoiceStatusData = [
  { name: "Approved", value: 45, color: "#22c55e" },
  { name: "Pending", value: 20, color: "#eab308" },
  { name: "Flagged", value: 8, color: "#ef4444" },
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
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
  });

  const constructionQuery = useQuery({
    queryKey: ["construction"],
    queryFn: () => fetchConstructionData(),
    retry: false,
  });

  const dealsQuery = useQuery({
    queryKey: ["deals"],
    queryFn: () => fetchDealsData(),
    retry: false,
  });

  const handleRefresh = () => {
    constructionQuery.refetch();
    dealsQuery.refetch();
  };

  const isLoading = constructionQuery.isLoading || dealsQuery.isLoading;
  const sheetsConfigured = (healthQuery.data as any)?.sheetsConfigured;

  // Calculate stats from real data or use placeholders
  const constructionRows = constructionQuery.data?.rows || [];
  const dealsRows = dealsQuery.data?.rows || [];

  const flaggedInvoices = constructionRows.filter(
    (r) => String(r.status || r.Status || "").toLowerCase() === "flagged"
  ).length || 8;

  const totalDeals = dealsRows.length || 32;

  return (
    <DashboardLayout
      title="Dashboard Overview"
      subtitle="Real-time insights from your automated workflows"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Connection Status Banner */}
      {!sheetsConfigured && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Google Sheets not connected
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
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
        />
        <StatCard
          title="Flagged Invoices"
          value={flaggedInvoices}
          change="Requires review"
          changeType="negative"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Deals Analyzed"
          value={totalDeals}
          change="+8 this week"
          changeType="positive"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Portfolio Value"
          value="$24.5M"
          change="+12.3% YTD"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Deals Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Deal Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDealsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar
                    dataKey="deals"
                    fill="hsl(var(--primary))"
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
        <Card>
          <CardHeader>
            <CardTitle>Construction Oversight Engine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoices Processed</span>
                <span className="text-sm font-medium">73</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal Intelligence System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium">5 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Properties Scored</span>
                <span className="text-sm font-medium">{totalDeals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
