import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { InvoiceRecord } from "./InvoiceTable";

interface OverchargeChartProps {
  data: InvoiceRecord[];
}

const COLORS = {
  invoiceAmount: "#3b82f6",
  overcharge: "#ef4444",
  fairValue: "#14b8a6",
};

export function OverchargeChart({ data }: OverchargeChartProps) {
  const chartData = useMemo(() => {
    // Sort by date and take last 10
    const sorted = [...data]
      .sort((a, b) => new Date(b.retrieved_at).getTime() - new Date(a.retrieved_at).getTime())
      .slice(0, 10)
      .reverse();

    return sorted.map((invoice) => ({
      name: invoice.invoice_number.replace("INV-2026-", "#"),
      vendor: invoice.vendor_name,
      invoiceAmount: invoice.invoice_amount,
      overcharge: invoice.potential_overcharge,
      fairValue: invoice.invoice_amount - invoice.potential_overcharge,
      fullNumber: invoice.invoice_number,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{data.fullNumber}</p>
          <p className="text-xs text-muted-foreground mb-2 max-w-[200px] truncate">
            {data.vendor}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Invoice Amount</span>
              <span className="text-xs font-medium text-blue-400">
                ${data.invoiceAmount.toLocaleString()}
              </span>
            </div>
            {data.overcharge > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Overcharge</span>
                <span className="text-xs font-medium text-red-400">
                  ${data.overcharge.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1 mt-1">
              <span className="text-xs text-muted-foreground">Fair Value</span>
              <span className="text-xs font-medium text-teal-400">
                ${data.fairValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-blue-400" />
          Invoice Amount vs Overcharge
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
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
                tickFormatter={(value) =>
                  value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Bar
                dataKey="fairValue"
                name="Fair Value"
                stackId="a"
                fill={COLORS.fairValue}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="overcharge"
                name="Potential Overcharge"
                stackId="a"
                fill={COLORS.overcharge}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
