import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fetchDealsData } from "@/lib/api";
import {
  Building2,
  MapPin,
  Target,
  TrendingUp,
  DollarSign,
  Star
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

// Mock data for demonstration
const mockDeals = [
  { id: "DEAL-001", address: "1234 Elm Street", city: "Austin", price: 450000, score: 87, arv: 580000, priority: "High" },
  { id: "DEAL-002", address: "567 Oak Drive", city: "Dallas", price: 320000, score: 72, arv: 420000, priority: "Medium" },
  { id: "DEAL-003", address: "890 Pine Ave", city: "Houston", price: 275000, score: 91, arv: 375000, priority: "High" },
  { id: "DEAL-004", address: "123 Maple Ln", city: "San Antonio", price: 198000, score: 65, arv: 250000, priority: "Low" },
  { id: "DEAL-005", address: "456 Cedar Rd", city: "Austin", price: 525000, score: 78, arv: 680000, priority: "Medium" },
  { id: "DEAL-006", address: "789 Birch Blvd", city: "Dallas", price: 410000, score: 85, arv: 530000, priority: "High" },
];

const scatterData = mockDeals.map((deal) => ({
  x: deal.price / 1000,
  y: deal.score,
  name: deal.address,
}));

const radarData = [
  { metric: "Location", A: 85 },
  { metric: "Price", A: 78 },
  { metric: "Condition", A: 65 },
  { metric: "Market", A: 90 },
  { metric: "ROI Potential", A: 88 },
  { metric: "Risk", A: 72 },
];

export default function Deals() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["deals"],
    queryFn: () => fetchDealsData(),
    retry: false,
  });

  // Use real data if available, otherwise use mock data
  const deals = (data?.rows.length ? data.rows : mockDeals) as Record<string, any>[];

  // Calculate stats
  const totalDeals = deals.length;
  const highPriorityCount = deals.filter(
    (d) => String(d.priority || d.Priority || "").toLowerCase() === "high"
  ).length;
  const avgScore = Math.round(
    deals.reduce((sum, d) => sum + (Number(d.score || d.Score) || 0), 0) / totalDeals
  );
  const totalValue = deals.reduce(
    (sum, d) => sum + (Number(d.price || d.Price) || 0),
    0
  );

  const columns = [
    { key: "id", header: "Deal ID" },
    { key: "address", header: "Address" },
    { key: "city", header: "City" },
    {
      key: "price",
      header: "Price",
      render: (value: number) =>
        value ? `$${value.toLocaleString()}` : "-"
    },
    {
      key: "arv",
      header: "ARV",
      render: (value: number) =>
        value ? `$${value.toLocaleString()}` : "-"
    },
    {
      key: "score",
      header: "Score",
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Progress value={value} className="w-16 h-2" />
          <span className="text-sm font-medium">{value}</span>
        </div>
      )
    },
    {
      key: "priority",
      header: "Priority",
      render: (value: string) => <StatusBadge status={value} />
    },
  ];

  return (
    <DashboardLayout
      title="Deal Intelligence"
      subtitle="Score and analyze distressed properties for acquisition"
      onRefresh={() => refetch()}
      isLoading={isLoading}
    >
      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Properties Analyzed"
          value={totalDeals}
          change="+8 this week"
          changeType="positive"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount}
          change="Ready for review"
          changeType="positive"
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Average Score"
          value={avgScore}
          change="Out of 100"
          changeType="neutral"
          icon={<Star className="h-5 w-5" />}
        />
        <StatCard
          title="Total Value"
          value={`$${(totalValue / 1000000).toFixed(1)}M`}
          change="Pipeline value"
          changeType="neutral"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Scatter Plot - Price vs Score */}
        <Card>
          <CardHeader>
            <CardTitle>Price vs Deal Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Price"
                    unit="K"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Score"
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number, name: string) => {
                      if (name === "Price") return [`$${value}K`, name];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Scatter
                    name="Properties"
                    data={scatterData}
                    fill="hsl(var(--primary))"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart - Deal Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Analysis Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="metric" className="text-muted-foreground" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Average Score"
                    dataKey="A"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Deals Summary */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {deals
                .sort((a: any, b: any) => (Number(b.score || b.Score) || 0) - (Number(a.score || a.Score) || 0))
                .slice(0, 3)
                .map((deal: any, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{deal.address || deal.Address}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {deal.city || deal.City}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {deal.score || deal.Score}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium">
                          ${Number(deal.price || deal.Price || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ARV</p>
                        <p className="font-medium">
                          ${Number(deal.arv || deal.ARV || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deals Table */}
      <DataTable
        title="All Properties"
        columns={columns}
        data={deals}
        emptyMessage="No deals found. Connect your Google Sheet to see data."
      />
    </DashboardLayout>
  );
}
