import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shark, Scale, Cog } from "lucide-react";
import { DealRecord } from "./DealsTable";

interface ScoreComponentsRadarProps {
  deal: DealRecord;
  compareDeals?: DealRecord[];
}

const COMMITTEE_ROLES = {
  upside: {
    name: "The Shark",
    icon: "🦈",
    description: "Evaluates profit potential & market upside",
    color: "#10b981",
  },
  risk: {
    name: "The Lawyer",
    icon: "⚖️",
    description: "Assesses legal, financial & market risks",
    color: "#f59e0b",
  },
  execution: {
    name: "The Operator",
    icon: "⚙️",
    description: "Rates deal complexity & execution feasibility",
    color: "#3b82f6",
  },
};

export function ScoreComponentsRadar({ deal, compareDeals }: ScoreComponentsRadarProps) {
  const chartData = useMemo(() => {
    return [
      {
        metric: "Upside",
        fullName: "Upside Score",
        role: COMMITTEE_ROLES.upside.name,
        current: deal.upside_score,
        ...(compareDeals?.reduce((acc, d, i) => ({
          ...acc,
          [`compare${i}`]: d.upside_score,
        }), {})),
      },
      {
        metric: "Risk",
        fullName: "Risk Score",
        role: COMMITTEE_ROLES.risk.name,
        current: deal.risk_score,
        ...(compareDeals?.reduce((acc, d, i) => ({
          ...acc,
          [`compare${i}`]: d.risk_score,
        }), {})),
      },
      {
        metric: "Execution",
        fullName: "Execution Score",
        role: COMMITTEE_ROLES.execution.name,
        current: deal.execution_score,
        ...(compareDeals?.reduce((acc, d, i) => ({
          ...acc,
          [`compare${i}`]: d.execution_score,
        }), {})),
      },
    ];
  }, [deal, compareDeals]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const role = Object.values(COMMITTEE_ROLES).find(
        (r) => r.name === data.role
      );

      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{role?.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{data.fullName}</p>
              <p className="text-xs text-muted-foreground">{role?.name}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{role?.description}</p>
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Score</span>
              <span className="text-sm font-bold text-white">{data.current}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate composite score explanation
  const avgScore = Math.round((deal.upside_score + deal.risk_score + deal.execution_score) / 3);

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-teal-400" />
          Investment Committee Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="metric"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.2)"
                fontSize={10}
                tickCount={5}
              />
              <Tooltip content={<CustomTooltip />} />

              <Radar
                name={deal.address}
                dataKey="current"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={1000}
              />

              {compareDeals?.map((d, i) => (
                <Radar
                  key={d.bbl}
                  name={d.address}
                  dataKey={`compare${i}`}
                  stroke={`hsl(${(i + 1) * 60}, 70%, 50%)`}
                  fill={`hsl(${(i + 1) * 60}, 70%, 50%)`}
                  fillOpacity={0.2}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Committee Members */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
          {Object.entries(COMMITTEE_ROLES).map(([key, role]) => {
            const score = key === "upside"
              ? deal.upside_score
              : key === "risk"
              ? deal.risk_score
              : deal.execution_score;

            return (
              <div
                key={key}
                className="text-center p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-lg mb-1">{role.icon}</div>
                <p className="text-xs text-muted-foreground">{role.name}</p>
                <p
                  className="text-lg font-bold"
                  style={{ color: role.color }}
                >
                  {score}
                </p>
              </div>
            );
          })}
        </div>

        {/* Score Formula */}
        <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-center text-muted-foreground">
            <span className="text-purple-400 font-medium">Final Score ({deal.final_score})</span>
            {" = "}
            <span className="text-emerald-400">{deal.upside_score}</span>
            {" × 0.4 + "}
            <span className="text-amber-400">{deal.risk_score}</span>
            {" × 0.35 + "}
            <span className="text-blue-400">{deal.execution_score}</span>
            {" × 0.25"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
