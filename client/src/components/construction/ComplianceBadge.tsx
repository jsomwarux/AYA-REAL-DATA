import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ComplianceStatus = "PASS" | "PARTIAL" | "FAIL";

interface ComplianceBadgeProps {
  status: ComplianceStatus | string;
  showIcon?: boolean;
  compact?: boolean;
}

const complianceConfig: Record<ComplianceStatus, {
  label: string;
  compactLabel: string;
  icon: typeof CheckCircle;
  className: string;
  dotColor: string;
}> = {
  PASS: {
    label: "Pass",
    compactLabel: "Pass",
    icon: CheckCircle,
    className: "text-teal-400",
    dotColor: "bg-teal-400",
  },
  PARTIAL: {
    label: "Partial",
    compactLabel: "Partial",
    icon: AlertTriangle,
    className: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  FAIL: {
    label: "Fail",
    compactLabel: "Fail",
    icon: XCircle,
    className: "text-red-400",
    dotColor: "bg-red-400",
  },
};

export function ComplianceBadge({ status, showIcon = true, compact = false }: ComplianceBadgeProps) {
  const normalizedStatus = (status?.toUpperCase() || "FAIL") as ComplianceStatus;
  const config = complianceConfig[normalizedStatus] || complianceConfig.FAIL;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
        <span className={cn("text-xs font-medium", config.className)}>
          {config.compactLabel}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", config.className)}>
      {showIcon && <Icon className="h-4 w-4" />}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
