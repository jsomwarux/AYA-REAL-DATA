import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import { InvoiceRecord } from "./InvoiceTable";

interface VerdictPieChartProps {
  data: InvoiceRecord[];
}

const COLORS = {
  APPROVE: "#14b8a6",
  HOLD_FOR_REVIEW: "#f59e0b",
  REJECT: "#ef4444",
};

const LABELS = {
  APPROVE: "Approved",
  HOLD_FOR_REVIEW: "Hold for Review",
  REJECT: "Rejected",
};

export function VerdictPieChart({ data }: VerdictPieChartProps) {
  const chartData = useMemo(() => {
    const counts = {
      APPROVE: 0,
      HOLD_FOR_REVIEW: 0,
      REJECT: 0,
    };

    data.forEach((invoice) => {
      const verdict = invoice.verdict?.toUpperCase().replace(/ /g, "_") as keyof typeof counts;
      if (counts[verdict] !== undefined) {
        counts[verdict]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: LABELS[key as keyof typeof LABELS],
        value: count,
        color: COLORS[key as keyof typeof COLORS],
        key,
      }));
  }, [data]);

  const total = data.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {item.value} invoices ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    value,
  }: any) => {
    if (percent < 0.05) return null; // Don't show labels for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {value}
      </text>
    );
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Scale className="h-5 w-5 text-purple-400" />
          Verdict Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
                animationBegin={0}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center total */}
          <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-3xl font-bold text-white">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-2">
          {chartData.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
