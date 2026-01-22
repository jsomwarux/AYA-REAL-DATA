import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10b981"; // emerald-500
  if (score >= 40) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

function getScoreGradient(score: number): string {
  if (score >= 70) return "from-emerald-500 to-teal-400";
  if (score >= 40) return "from-amber-500 to-yellow-400";
  return "from-red-500 to-orange-400";
}

export function ScoreGauge({
  score,
  label,
  size = "md",
  showLabel = true,
  animated = true,
}: ScoreGaugeProps) {
  const sizeConfig = {
    sm: { width: 48, strokeWidth: 4, fontSize: "text-sm", labelSize: "text-[10px]" },
    md: { width: 72, strokeWidth: 6, fontSize: "text-xl", labelSize: "text-xs" },
    lg: { width: 100, strokeWidth: 8, fontSize: "text-2xl", labelSize: "text-sm" },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference - percent * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg
          className="transform -rotate-90"
          width={config.width}
          height={config.width}
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : offset}
            strokeLinecap="round"
            className={cn(
              animated && "transition-all duration-1000 ease-out"
            )}
            style={{
              filter: score >= 70 ? `drop-shadow(0 0 6px ${color})` : undefined,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-bold",
              config.fontSize,
              score >= 70 && "text-emerald-400",
              score >= 40 && score < 70 && "text-amber-400",
              score < 40 && "text-red-400"
            )}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className={cn("mt-1 text-muted-foreground", config.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

// Mini horizontal bar version for table display
export function ScoreBar({
  score,
  label,
  compact = false,
}: {
  score: number;
  label?: string;
  compact?: boolean;
}) {
  const color = getScoreColor(score);
  const gradient = getScoreGradient(score);

  return (
    <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
      {label && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className={cn(
          "relative bg-white/10 rounded-full overflow-hidden",
          compact ? "h-1.5 w-12" : "h-2 w-16"
        )}>
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r animate-score-fill",
              gradient
            )}
            style={{
              "--score-width": `${score}%`,
              width: `${score}%`,
            } as React.CSSProperties}
          />
        </div>
        <span
          className={cn(
            "font-medium",
            compact ? "text-[10px]" : "text-xs",
            score >= 70 && "text-emerald-400",
            score >= 40 && score < 70 && "text-amber-400",
            score < 40 && "text-red-400"
          )}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
