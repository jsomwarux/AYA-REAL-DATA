import { FileCheck, DollarSign, PiggyBank, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InvoiceData {
  invoice_amount?: number;
  potential_overcharge?: number;
  verdict?: string;
}

interface StatsCardsProps {
  data: InvoiceData[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  accentColor: "teal" | "blue" | "purple" | "amber";
}

function StatCard({ icon, label, value, trend, accentColor }: StatCardProps) {
  const accentColors = {
    teal: {
      bg: "bg-teal-500/20",
      text: "text-teal-400",
      gradient: "from-teal-500/20 to-teal-500/5",
    },
    blue: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      gradient: "from-blue-500/20 to-blue-500/5",
    },
    purple: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      gradient: "from-purple-500/20 to-purple-500/5",
    },
    amber: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      gradient: "from-amber-500/20 to-amber-500/5",
    },
  };

  const colors = accentColors[accentColor];

  return (
    <Card className="group relative overflow-hidden border-white/10 bg-card hover:border-white/20 transition-all duration-300">
      {/* Hover gradient */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
          colors.gradient
        )}
      />

      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5">
                {trend.direction === "up" && (
                  <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                )}
                {trend.direction === "down" && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.direction === "up" && "text-teal-400",
                    trend.direction === "down" && "text-red-400",
                    trend.direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {trend.value}
                </span>
              </div>
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

export function StatsCards({ data }: StatsCardsProps) {
  // Calculate statistics
  const totalInvoices = data.length;

  const totalValue = data.reduce(
    (sum, inv) => sum + (Number(inv.invoice_amount) || 0),
    0
  );

  const potentialSavings = data.reduce(
    (sum, inv) => sum + (Number(inv.potential_overcharge) || 0),
    0
  );

  const approvedCount = data.filter(
    (inv) => inv.verdict?.toUpperCase() === "APPROVE"
  ).length;

  const approvalRate = totalInvoices > 0
    ? Math.round((approvedCount / totalInvoices) * 100)
    : 0;

  // Format values
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<FileCheck className="h-5 w-5" />}
        label="Total Invoices Reviewed"
        value={totalInvoices.toString()}
        trend={{ value: "+12 this week", direction: "up" }}
        accentColor="blue"
      />
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Total Value Audited"
        value={formatCurrency(totalValue)}
        trend={{ value: "+$240K this month", direction: "up" }}
        accentColor="teal"
      />
      <StatCard
        icon={<PiggyBank className="h-5 w-5" />}
        label="Potential Savings Identified"
        value={formatCurrency(potentialSavings)}
        trend={{ value: "8.2% of total", direction: "neutral" }}
        accentColor="amber"
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Approval Rate"
        value={`${approvalRate}%`}
        trend={{
          value: approvalRate >= 70 ? "On track" : "Needs attention",
          direction: approvalRate >= 70 ? "up" : "down",
        }}
        accentColor="purple"
      />
    </div>
  );
}
