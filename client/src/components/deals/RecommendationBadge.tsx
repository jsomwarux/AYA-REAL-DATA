import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";

type Recommendation = "STRONG_BUY" | "BUY" | "HOLD" | "PASS";

interface RecommendationBadgeProps {
  recommendation: Recommendation | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const recommendationConfig: Record<Recommendation, {
  label: string;
  icon: typeof TrendingUp;
  className: string;
  pulseClass?: string;
}> = {
  STRONG_BUY: {
    label: "Strong Buy",
    icon: TrendingUp,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold shadow-lg shadow-emerald-500/20",
    pulseClass: "animate-pulse-glow",
  },
  BUY: {
    label: "Buy",
    icon: TrendingUp,
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  HOLD: {
    label: "Hold",
    icon: Minus,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  PASS: {
    label: "Pass",
    icon: X,
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
};

export function RecommendationBadge({
  recommendation,
  size = "md",
  showIcon = true
}: RecommendationBadgeProps) {
  const normalizedRec = (recommendation?.toUpperCase().replace(/ /g, "_") || "HOLD") as Recommendation;
  const config = recommendationConfig[normalizedRec] || recommendationConfig.HOLD;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all",
        config.className,
        sizeClasses[size],
        config.pulseClass
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}
