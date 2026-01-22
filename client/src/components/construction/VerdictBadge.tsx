import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Verdict = "APPROVE" | "HOLD_FOR_REVIEW" | "REJECT";

interface VerdictBadgeProps {
  verdict: Verdict | string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const verdictConfig: Record<Verdict, {
  label: string;
  icon: typeof CheckCircle;
  className: string;
}> = {
  APPROVE: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
  HOLD_FOR_REVIEW: {
    label: "Hold for Review",
    icon: AlertTriangle,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  REJECT: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function VerdictBadge({ verdict, showIcon = true, size = "md" }: VerdictBadgeProps) {
  const normalizedVerdict = (verdict?.toUpperCase().replace(/ /g, "_") || "HOLD_FOR_REVIEW") as Verdict;
  const config = verdictConfig[normalizedVerdict] || verdictConfig.HOLD_FOR_REVIEW;
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
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}
