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
import { MapPin } from "lucide-react";
import { DealRecord } from "./DealsTable";

interface BoroughBreakdownProps {
  data: DealRecord[];
}

const BOROUGH_COLORS: Record<string, string> = {
  MANHATTAN: "#8b5cf6",
  BROOKLYN: "#3b82f6",
  QUEENS: "#14b8a6",
  BRONX: "#f59e0b",
  STATEN_ISLAND: "#ec4899",
  UNKNOWN: "#6b7280",
};

const BOROUGH_LABELS: Record<string, string> = {
  MANHATTAN: "Manhattan",
  BROOKLYN: "Brooklyn",
  QUEENS: "Queens",
  BRONX: "Bronx",
  STATEN_ISLAND: "Staten Is.",
  UNKNOWN: "Unknown",
};

export function BoroughBreakdown({ data }: BoroughBreakdownProps) {
  const chartData = useMemo(() => {
    const boroughCounts: Record<string, { total: number; highScore: number }> = {};

    data.forEach((deal) => {
      const borough = deal.borough?.toUpperCase() || "UNKNOWN";
      if (!boroughCounts[borough]) {
        boroughCounts[borough] = { total: 0, highScore: 0 };
      }
      boroughCounts[borough].total++;
      if (deal.final_score >= 80) {
        boroughCounts[borough].highScore++;
      }
    });

    return Object.entries(boroughCounts)
      .map(([borough, counts]) => ({
        borough,
        label: BOROUGH_LABELS[borough] || borough,
        total: counts.total,
        highScore: counts.highScore,
        color: BOROUGH_COLORS[borough] || BOROUGH_COLORS.UNKNOWN,
        avgScore: Math.round(
          data
            .filter((d) => (d.borough?.toUpperCase() || "UNKNOWN") === borough)
            .reduce((sum, d) => sum + d.final_score, 0) / counts.total
        ),
      }))
      .sort((a, b) => b.highScore - a.highScore);
  }, [data]);

  const topBorough = chartData[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{item.label}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs text-muted-foreground">Total Deals</span>
              <span className="text-xs font-medium text-white">{item.total}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-muted-foreground">High Score (80+)</span>
              <span className="text-xs font-medium text-emerald-400">{item.highScore}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs text-muted-foreground">Avg Score</span>
              <span className="text-xs font-medium text-white">{item.avgScore}</span>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-purple-400" />
            High-Score Deals by Borough
          </CardTitle>
          {topBorough && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Top:</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${topBorough.color}20`,
                  color: topBorough.color,
                }}
              >
                {topBorough.label}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.5)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="rgba(255,255,255,0.5)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar
                dataKey="highScore"
                radius={[0, 4, 4, 0]}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter: entry.highScore > 0 ? `drop-shadow(0 0 6px ${entry.color}40)` : undefined,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Borough Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-white/10">
          {chartData.slice(0, 5).map((item) => (
            <div key={item.borough} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">
                {item.label} ({item.total})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
