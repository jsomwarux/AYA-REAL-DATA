import { Building2, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DealData {
  final_score?: number;
  recommendation?: string;
}

interface DealsStatsCardsProps {
  data: DealData[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  accentColor: "emerald" | "purple" | "amber" | "blue";
  highlight?: boolean;
}

function StatCard({ icon, label, value, subtext, accentColor, highlight }: StatCardProps) {
  const accentColors = {
    emerald: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      gradient: "from-emerald-500/20 to-emerald-500/5",
      glow: "shadow-emerald-500/20",
    },
    purple: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      gradient: "from-purple-500/20 to-purple-500/5",
      glow: "shadow-purple-500/20",
    },
    amber: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      gradient: "from-amber-500/20 to-amber-500/5",
      glow: "shadow-amber-500/20",
    },
    blue: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      gradient: "from-blue-500/20 to-blue-500/5",
      glow: "shadow-blue-500/20",
    },
  };

  const colors = accentColors[accentColor];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-white/10 bg-card hover:border-white/20 transition-all duration-300",
        highlight && `ring-1 ring-${accentColor}-500/30 ${colors.glow} shadow-lg`
      )}
    >
      {/* Hover gradient */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
          colors.gradient
        )}
      />

      {/* Highlight pulse for high-score items */}
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent animate-pulse" />
      )}

      <CardContent className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1 mr-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn(
              "text-2xl sm:text-3xl font-semibold tracking-tight",
              highlight ? colors.text : "text-white"
            )}>
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-transform duration-300 group-hover:scale-110",
              colors.bg,
              colors.text
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DealsStatsCards({ data }: DealsStatsCardsProps) {
  // Calculate statistics
  const totalProperties = data.length;

  const highScoreCount = data.filter(
    (d) => (d.final_score || 0) >= 80
  ).length;

  const avgScore = totalProperties > 0
    ? Math.round(
        data.reduce((sum, d) => sum + (d.final_score || 0), 0) / totalProperties
      )
    : 0;

  const strongBuyCount = data.filter(
    (d) => d.recommendation?.toUpperCase() === "STRONG_BUY"
  ).length;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Building2 className="h-5 w-5" />}
        label="Properties Analyzed"
        value={totalProperties}
        subtext={`${data.filter(d => (d.final_score || 0) >= 70).length} above threshold`}
        accentColor="purple"
      />
      <StatCard
        icon={<Target className="h-5 w-5" />}
        label="High-Score Opportunities"
        value={highScoreCount}
        subtext="Score 80+"
        accentColor="emerald"
        highlight={highScoreCount > 0}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Avg Deal Score"
        value={avgScore}
        subtext="Out of 100"
        accentColor="amber"
      />
      <StatCard
        icon={<Zap className="h-5 w-5" />}
        label="Strong Buy Signals"
        value={strongBuyCount}
        subtext="Immediate action recommended"
        accentColor="blue"
        highlight={strongBuyCount > 0}
      />
    </div>
  );
}
