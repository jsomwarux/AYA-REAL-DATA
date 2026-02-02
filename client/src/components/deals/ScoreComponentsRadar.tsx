import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { DealRecord } from "./DealsTable";

interface ScoreComponentsRadarProps {
  data: DealRecord[];
}

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  STRONG_BUY: { label: "Strong Buy", color: "#10b981", order: 0 },
  BUY: { label: "Buy", color: "#84cc16", order: 1 },
  HOLD: { label: "Hold", color: "#f59e0b", order: 2 },
  PASS: { label: "Pass", color: "#ef4444", order: 3 },
};

export function ScoreComponentsRadar({ data }: ScoreComponentsRadarProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    data.forEach((deal) => {
      const rec = deal.recommendation?.toUpperCase() || "UNKNOWN";
      counts[rec] = (counts[rec] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([key, count]) => {
        const config = RECOMMENDATION_CONFIG[key];
        return {
          name: config?.label || key,
          value: count,
          color: config?.color || "#6b7280",
          key,
          order: config?.order ?? 99,
          percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [data]);

  const buySignals = useMemo(() => {
    return data.filter(
      (d) => d.recommendation?.toUpperCase() === "STRONG_BUY" || d.recommendation?.toUpperCase() === "BUY"
    ).length;
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{d.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {d.value} deals ({d.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-white/10 h-full flex flex-col">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-teal-400" />
            Signal Breakdown
          </CardTitle>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
            {buySignals} buy signals
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                dataKey="value"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={2}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter: `drop-shadow(0 0 4px ${entry.color}40)`,
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{data.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
          {chartData.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                <span className="text-xs font-medium text-white ml-1">
                  {item.value}
                  <span className="text-muted-foreground ml-0.5">({item.percentage}%)</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
