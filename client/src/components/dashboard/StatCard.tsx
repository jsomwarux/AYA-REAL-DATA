import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  className?: string;
  accentColor?: "teal" | "purple" | "blue" | "amber" | "red";
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  accentColor = "teal"
}: StatCardProps) {
  const accentColors = {
    teal: "from-teal-500/20 to-teal-500/5 text-teal-400",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400",
    red: "from-red-500/20 to-red-500/5 text-red-400",
  };

  const iconColors = {
    teal: "bg-teal-500/20 text-teal-400",
    purple: "bg-purple-500/20 text-purple-400",
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    red: "bg-red-500/20 text-red-400",
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden border-white/10 bg-card hover:border-white/20 transition-all duration-300",
      className
    )}>
      {/* Subtle gradient accent */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
        accentColors[accentColor]
      )} />

      <CardContent className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1 mr-3">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white truncate">{value}</p>
            {change && (
              <p className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-teal-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}>
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "rounded-xl p-3 transition-transform duration-300 group-hover:scale-110",
              iconColors[accentColor]
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
