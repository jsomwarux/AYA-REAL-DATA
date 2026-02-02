import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { DealRecord } from "./DealsTable";

interface ScoreDistributionChartProps {
  data: DealRecord[];
  highlightScore?: number;
}

const SCORE_RANGES = [
  { range: "0-20", min: 0, max: 20, color: "#ef4444" },
  { range: "20-40", min: 20, max: 40, color: "#f97316" },
  { range: "40-60", min: 40, max: 60, color: "#f59e0b" },
  { range: "60-80", min: 60, max: 80, color: "#84cc16" },
  { range: "80-100", min: 80, max: 100, color: "#10b981" },
];

export function ScoreDistributionChart({ data, highlightScore }: ScoreDistributionChartProps) {
  const chartData = useMemo(() => {
    return SCORE_RANGES.map(({ range, min, max, color }) => {
      const count = data.filter(
        (d) => d.final_score >= min && d.final_score < (max === 100 ? 101 : max)
      ).length;

      const isHighlighted = highlightScore !== undefined &&
        highlightScore >= min &&
        highlightScore < (max === 100 ? 101 : max);

      return {
        range,
        count,
        color,
        isHighlighted,
        isHighZone: min >= 80,
      };
    });
  }, [data, highlightScore]);

  const totalHighScore = data.filter((d) => d.final_score >= 80).length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = data.length > 0
        ? ((item.count / data.length) * 100).toFixed(1)
        : 0;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">Score {item.range}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {item.count} properties ({percentage}%)
          </p>
          {item.isHighZone && (
            <p className="text-xs text-emerald-400 mt-1 font-medium">
              High Opportunity Zone
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Score Distribution
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">80+ Zone:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              {totalHighScore} deals
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="range"
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
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />

              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={entry.isHighlighted ? "#fff" : "transparent"}
                    strokeWidth={entry.isHighlighted ? 2 : 0}
                    style={{
                      filter: entry.isHighZone ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))" : undefined,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-xs text-muted-foreground">Hold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Buy Zone</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
