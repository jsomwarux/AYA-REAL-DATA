import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { DealRecord } from "./DealsTable";

interface ScoreComponentsRadarProps {
  data: DealRecord[];
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

export function ScoreComponentsRadar({ data }: ScoreComponentsRadarProps) {
  const averages = useMemo(() => {
    if (data.length === 0) {
      return { upside: 0, risk: 0, execution: 0, final: 0 };
    }
    const sum = data.reduce(
      (acc, d) => ({
        upside: acc.upside + (d.upside_score || 0),
        risk: acc.risk + (d.risk_score || 0),
        execution: acc.execution + (d.execution_score || 0),
        final: acc.final + (d.final_score || 0),
      }),
      { upside: 0, risk: 0, execution: 0, final: 0 }
    );
    const n = data.length;
    return {
      upside: Math.round((sum.upside / n) * 10) / 10,
      risk: Math.round((sum.risk / n) * 10) / 10,
      execution: Math.round((sum.execution / n) * 10) / 10,
      final: Math.round((sum.final / n) * 10) / 10,
    };
  }, [data]);

  const chartData = useMemo(() => {
    return [
      {
        metric: "Upside",
        fullName: "Avg Upside Score",
        role: COMMITTEE_ROLES.upside.name,
        value: averages.upside,
      },
      {
        metric: "Risk",
        fullName: "Avg Risk Score",
        role: COMMITTEE_ROLES.risk.name,
        value: averages.risk,
      },
      {
        metric: "Execution",
        fullName: "Avg Execution Score",
        role: COMMITTEE_ROLES.execution.name,
        value: averages.execution,
      },
    ];
  }, [averages]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const role = Object.values(COMMITTEE_ROLES).find(
        (r) => r.name === d.role
      );

      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-lg max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{role?.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{d.fullName}</p>
              <p className="text-xs text-muted-foreground">{role?.name}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{role?.description}</p>
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Avg Score</span>
              <span className="text-sm font-bold text-white">{d.value}</span>
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
            <Target className="h-5 w-5 text-teal-400" />
            Investment Committee Scores
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Avg across {data.length} deals
          </span>
        </div>
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
                name="Portfolio Average"
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={1000}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Committee Members */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
          {Object.entries(COMMITTEE_ROLES).map(([key, role]) => {
            const score = key === "upside"
              ? averages.upside
              : key === "risk"
              ? averages.risk
              : averages.execution;

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

        {/* Average Score Formula */}
        <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-center text-muted-foreground">
            <span className="text-purple-400 font-medium">Avg Final Score ({averages.final})</span>
            {" = "}
            <span className="text-emerald-400">{averages.upside}</span>
            {" × 0.4 + "}
            <span className="text-amber-400">{averages.risk}</span>
            {" × 0.35 + "}
            <span className="text-blue-400">{averages.execution}</span>
            {" × 0.25"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
