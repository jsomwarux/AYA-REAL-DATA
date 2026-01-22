import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { InvoiceRecord } from "./InvoiceTable";

interface ComplianceTrendProps {
  data: InvoiceRecord[];
}

const COLORS = {
  contract: "#3b82f6",
  permit: "#8b5cf6",
};

export function ComplianceTrend({ data }: ComplianceTrendProps) {
  const chartData = useMemo(() => {
    // Group invoices by date and calculate compliance rates
    const dateMap = new Map<string, { contract: number[]; permit: number[] }>();

    // Sort by date
    const sorted = [...data].sort(
      (a, b) => new Date(a.retrieved_at).getTime() - new Date(b.retrieved_at).getTime()
    );

    sorted.forEach((invoice) => {
      const date = new Date(invoice.retrieved_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dateMap.has(date)) {
        dateMap.set(date, { contract: [], permit: [] });
      }

      const entry = dateMap.get(date)!;

      // Convert compliance to score
      const contractScore =
        invoice.contract_compliance?.toUpperCase() === "PASS"
          ? 100
          : invoice.contract_compliance?.toUpperCase() === "PARTIAL"
          ? 50
          : 0;
      const permitScore =
        invoice.permit_compliance?.toUpperCase() === "PASS"
          ? 100
          : invoice.permit_compliance?.toUpperCase() === "PARTIAL"
          ? 50
          : 0;

      entry.contract.push(contractScore);
      entry.permit.push(permitScore);
    });

    // Convert to chart data with averages
    return Array.from(dateMap.entries()).map(([date, scores]) => ({
      date,
      contractCompliance: Math.round(
        scores.contract.reduce((a, b) => a + b, 0) / scores.contract.length
      ),
      permitCompliance: Math.round(
        scores.permit.reduce((a, b) => a + b, 0) / scores.permit.length
      ),
      invoiceCount: scores.contract.length,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {data.invoiceCount} invoice{data.invoiceCount !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS.contract }}
                />
                <span className="text-xs text-muted-foreground">Contract</span>
              </div>
              <span className="text-xs font-medium text-blue-400">
                {data.contractCompliance}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS.permit }}
                />
                <span className="text-xs text-muted-foreground">Permit</span>
              </div>
              <span className="text-xs font-medium text-purple-400">
                {data.permitCompliance}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate overall compliance rates
  const avgContract = chartData.length
    ? Math.round(
        chartData.reduce((a, b) => a + b.contractCompliance, 0) / chartData.length
      )
    : 0;
  const avgPermit = chartData.length
    ? Math.round(
        chartData.reduce((a, b) => a + b.permitCompliance, 0) / chartData.length
      )
    : 0;

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-teal-400" />
            Compliance Trend
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Contract:</span>
              <span className="font-medium text-blue-400">{avgContract}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Permit:</span>
              <span className="font-medium text-purple-400">{avgPermit}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.5)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="contractCompliance"
                name="Contract Compliance"
                stroke={COLORS.contract}
                strokeWidth={2}
                dot={{ fill: COLORS.contract, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.contract, strokeWidth: 2, fill: "#0f172a" }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="permitCompliance"
                name="Permit Compliance"
                stroke={COLORS.permit}
                strokeWidth={2}
                dot={{ fill: COLORS.permit, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.permit, strokeWidth: 2, fill: "#0f172a" }}
                animationDuration={1500}
                animationBegin={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
