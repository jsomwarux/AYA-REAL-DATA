import { useMemo } from "react";
import { RecapSection } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TrendingUp, Calendar, ArrowUpRight } from "lucide-react";

interface RecapTrackerProps {
  sections: RecapSection[];
}

// Color palette for chart lines
const LINE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  // Handle various date formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return dateStr;
}

function SectionCard({ section }: { section: RecapSection }) {
  const dataHeaders = section.headers.filter(
    (h) => h.toUpperCase() !== "DATE"
  );

  // Transform rows for Recharts
  const chartData = useMemo(() => {
    return section.rows
      .filter((row) => row.DATE)
      .map((row) => {
        const point: Record<string, string | number | null> = {
          date: formatDate(String(row.DATE)),
          rawDate: String(row.DATE),
        };
        for (const header of dataHeaders) {
          point[header] = typeof row[header] === "number" ? row[header] : null;
        }
        return point;
      });
  }, [section.rows, dataHeaders]);

  // Calculate latest values and changes
  const latestStats = useMemo(() => {
    if (section.rows.length === 0) return [];
    const latest = section.rows[section.rows.length - 1];
    const previous =
      section.rows.length > 1
        ? section.rows[section.rows.length - 2]
        : null;

    return dataHeaders.map((header) => {
      const current =
        typeof latest[header] === "number" ? (latest[header] as number) : 0;
      const prev =
        previous && typeof previous[header] === "number"
          ? (previous[header] as number)
          : null;
      const change = prev !== null ? current - prev : null;
      return { header, current, change };
    });
  }, [section.rows, dataHeaders]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {section.section.charAt(0) +
              section.section.slice(1).toLowerCase()}{" "}
            Progress Recap
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tracked over {chartData.length} update
            {chartData.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Latest Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {latestStats.map((stat, idx) => (
          <Card
            key={stat.header}
            className="bg-white/5 border-white/10 overflow-hidden"
          >
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate mb-1">
                {stat.header}
              </p>
              <div className="flex items-end gap-1.5">
                <span
                  className="text-lg sm:text-2xl font-bold"
                  style={{ color: LINE_COLORS[idx % LINE_COLORS.length] }}
                >
                  {stat.current}
                </span>
                {stat.change !== null && stat.change > 0 && (
                  <span className="text-[10px] sm:text-xs text-emerald-400 flex items-center mb-0.5">
                    <ArrowUpRight className="h-3 w-3" />+{stat.change}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Chart */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base font-medium text-white">
            Progress Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
          <div className="h-[240px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}
                  itemStyle={{ color: "#d1d5db", fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                {dataHeaders.map((header, idx) => (
                  <Line
                    key={header}
                    type="monotone"
                    dataKey={header}
                    name={header}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4, fill: LINE_COLORS[idx % LINE_COLORS.length] }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm sm:text-base font-medium text-white">
              Update History
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-4 sm:pb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 sm:px-4 text-muted-foreground font-medium">
                    Date
                  </th>
                  {dataHeaders.map((header) => (
                    <th
                      key={header}
                      className="text-right py-2 px-2 sm:px-4 text-muted-foreground font-medium whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...section.rows].reverse().map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 sm:px-4 text-white font-medium whitespace-nowrap">
                      {formatDate(String(row.DATE))}
                    </td>
                    {dataHeaders.map((header, hIdx) => {
                      const val = row[header];
                      // Find previous row's value for comparison
                      const rowIndex = section.rows.length - 1 - idx;
                      const prevRow =
                        rowIndex > 0 ? section.rows[rowIndex - 1] : null;
                      const prevVal = prevRow ? prevRow[header] : null;
                      const diff =
                        typeof val === "number" && typeof prevVal === "number"
                          ? val - prevVal
                          : null;

                      return (
                        <td
                          key={header}
                          className="py-2.5 px-2 sm:px-4 text-right"
                        >
                          <span className="text-white">
                            {val !== null && val !== undefined ? val : "—"}
                          </span>
                          {diff !== null && diff > 0 && (
                            <span className="text-emerald-400 text-[10px] sm:text-xs ml-1">
                              +{diff}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RecapTracker({ sections }: RecapTrackerProps) {
  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Recap Data</h3>
        <p className="text-muted-foreground max-w-md">
          No recap tracking data is available yet. Updates will appear here once
          the RECAP tab is populated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <SectionCard key={section.section} section={section} />
      ))}
    </div>
  );
}
