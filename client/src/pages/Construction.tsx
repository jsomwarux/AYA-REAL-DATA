import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchConstructionData } from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  HardHat
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// Mock data for demonstration
const mockInvoices = [
  { id: "INV-001", contractor: "ABC Construction", amount: 45000, status: "Approved", date: "2024-01-15", project: "123 Main St" },
  { id: "INV-002", contractor: "XYZ Plumbing", amount: 12500, status: "Flagged", date: "2024-01-16", project: "456 Oak Ave", flag: "Amount exceeds estimate by 25%" },
  { id: "INV-003", contractor: "Elite Electric", amount: 8900, status: "Pending", date: "2024-01-17", project: "789 Pine Rd" },
  { id: "INV-004", contractor: "Metro HVAC", amount: 22000, status: "Approved", date: "2024-01-18", project: "123 Main St" },
  { id: "INV-005", contractor: "Quick Roofing", amount: 35000, status: "Flagged", date: "2024-01-19", project: "456 Oak Ave", flag: "Missing permit documentation" },
  { id: "INV-006", contractor: "Pro Painters", amount: 6500, status: "Approved", date: "2024-01-20", project: "789 Pine Rd" },
];

const spendingTrend = [
  { month: "Jul", actual: 120000, budget: 130000 },
  { month: "Aug", actual: 145000, budget: 140000 },
  { month: "Sep", actual: 135000, budget: 150000 },
  { month: "Oct", actual: 160000, budget: 155000 },
  { month: "Nov", actual: 155000, budget: 160000 },
  { month: "Dec", actual: 170000, budget: 165000 },
];

export default function Construction() {
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["construction"],
    queryFn: () => fetchConstructionData(),
    retry: false,
  });

  // Use real data if available, otherwise use mock data
  const invoices = (data?.rows.length ? data.rows : mockInvoices) as Record<string, any>[];

  // Calculate stats
  const totalInvoices = invoices.length;
  const flaggedCount = invoices.filter(
    (inv) => String(inv.status || inv.Status || "").toLowerCase() === "flagged"
  ).length;
  const pendingCount = invoices.filter(
    (inv) => String(inv.status || inv.Status || "").toLowerCase() === "pending"
  ).length;
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + (Number(inv.amount || inv.Amount) || 0),
    0
  );

  const columns = [
    { key: "id", header: "Invoice ID" },
    { key: "contractor", header: "Contractor" },
    { key: "project", header: "Project" },
    {
      key: "amount",
      header: "Amount",
      render: (value: number) =>
        value ? `$${value.toLocaleString()}` : "-"
    },
    { key: "date", header: "Date" },
    {
      key: "status",
      header: "Status",
      render: (value: string) => <StatusBadge status={value} />
    },
  ];

  return (
    <DashboardLayout
      title="Construction Oversight"
      subtitle="Monitor contractor invoices and flag potential issues"
      onRefresh={() => refetch()}
      isLoading={isLoading}
    >
      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={totalInvoices}
          change="This month"
          changeType="neutral"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Flagged Issues"
          value={flaggedCount}
          change="Requires attention"
          changeType="negative"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          change="Awaiting approval"
          changeType="neutral"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Total Spend"
          value={`$${(totalAmount / 1000).toFixed(0)}K`}
          change="This month"
          changeType="neutral"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis
                    className="text-muted-foreground"
                    tickFormatter={(value) => `$${value / 1000}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    stackId="1"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.3}
                    name="Budget"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stackId="2"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Actual"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Flagged Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices
                .filter((inv: any) => String(inv.status || inv.Status || "").toLowerCase() === "flagged")
                .slice(0, 4)
                .map((inv: any, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{inv.id || inv.ID}</span>
                      <span className="text-sm text-muted-foreground">
                        ${Number(inv.amount || inv.Amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inv.contractor || inv.Contractor}
                    </p>
                    {inv.flag && (
                      <p className="mt-2 text-sm text-destructive">
                        {inv.flag}
                      </p>
                    )}
                  </div>
                ))}
              {flaggedCount === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No flagged items
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <DataTable
        title="Recent Invoices"
        columns={columns}
        data={invoices}
        emptyMessage="No invoices found. Connect your Google Sheet to see data."
      />
    </DashboardLayout>
  );
}
