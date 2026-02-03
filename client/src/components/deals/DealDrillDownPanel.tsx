import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Hotel,
  Home,
  Building2,
  Shuffle,
  Clock,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreGauge } from "./ScoreGauge";
import { cn } from "@/lib/utils";
import type {
  DealRecord,
  DrillDownTab,
  UpsideKeyFactor,
  RiskCriticalRisk,
  ExecutionWorkstream,
  ExecutionChallenge,
} from "./types";

interface DealDrillDownPanelProps {
  deal: DealRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: DrillDownTab;
}

// ============================================
// Shared sub-components
// ============================================

function ConfidenceBadge({ confidence }: { confidence: string }) {
  if (!confidence) return null;
  const level = confidence.toUpperCase();
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        level === "HIGH" && "bg-emerald-500/20 text-emerald-400",
        level === "MEDIUM" && "bg-amber-500/20 text-amber-400",
        level === "LOW" && "bg-red-500/20 text-red-400"
      )}
    >
      {confidence} confidence
    </span>
  );
}

function LabelBadge({ label, variant }: { label: string; variant: "upside" | "risk" | "execution" }) {
  if (!label) return null;
  const colorMap = {
    upside: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    risk: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    execution: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", colorMap[variant])}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const level = (severity || "").toUpperCase();
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium",
        (level === "CRITICAL" || level === "EXTREME") && "bg-red-500/20 text-red-400",
        level === "HIGH" && "bg-orange-500/20 text-orange-400",
        level === "MEDIUM" && "bg-amber-500/20 text-amber-400",
        level === "LOW" && "bg-green-500/20 text-green-400",
        level === "MINIMAL" && "bg-emerald-500/20 text-emerald-400"
      )}
    >
      {severity || "N/A"}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const level = (impact || "").toUpperCase();
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium",
        level === "HIGH" && "bg-emerald-500/20 text-emerald-400",
        level === "MEDIUM" && "bg-amber-500/20 text-amber-400",
        level === "LOW" && "bg-gray-500/20 text-gray-400"
      )}
    >
      {impact || "N/A"}
    </span>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value || "N/A"}</p>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
      {icon}
      {children}
    </h4>
  );
}

function ScoreHeader({
  score,
  label,
  headline,
  confidence,
  variant,
  color,
}: {
  score: number;
  label: string;
  headline: string;
  confidence: string;
  variant: "upside" | "risk" | "execution";
  color: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="text-3xl font-bold"
            style={{ color }}
          >
            {score}
          </div>
          <div className="flex flex-col gap-1">
            <LabelBadge label={label} variant={variant} />
          </div>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      {/* Score progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`,
          }}
        />
      </div>
      {headline && (
        <p className="text-sm text-muted-foreground italic">{headline}</p>
      )}
    </div>
  );
}

// ============================================
// Tab Content Components
// ============================================

function UpsideTab({ deal }: { deal: DealRecord }) {
  return (
    <div className="space-y-6 py-4">
      <ScoreHeader
        score={deal.upside_score}
        label={deal.upside_label}
        headline={deal.upside_headline}
        confidence={deal.upside_confidence}
        variant="upside"
        color="#10b981"
      />

      {/* Bull Case */}
      {deal.upside_bull_case && (
        <div>
          <SectionTitle icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}>
            Bull Case
          </SectionTitle>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{deal.upside_bull_case}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Discount Potential" value={deal.upside_discount_potential} />
        <MetricCard label="Exit Strategy" value={deal.upside_exit_strategy} />
        <MetricCard label="Confidence" value={deal.upside_confidence} />
      </div>

      {/* Value Add Opportunities */}
      {deal.upside_value_add_opportunities.length > 0 && (
        <div>
          <SectionTitle icon={<Sparkles className="h-4 w-4 text-emerald-400" />}>
            Value Add Opportunities
          </SectionTitle>
          <div className="space-y-2">
            {deal.upside_value_add_opportunities.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{typeof item === "string" ? item : JSON.stringify(item)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Upside Factors */}
      {deal.upside_key_factors.length > 0 && (
        <div>
          <SectionTitle icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
            Key Upside Factors
          </SectionTitle>
          <div className="space-y-2">
            {deal.upside_key_factors.map((factor: UpsideKeyFactor | string, i: number) => {
              if (typeof factor === "string") {
                return (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-muted-foreground">{factor}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <ImpactBadge impact={factor.impact} />
                    <span className="text-sm font-medium text-white">{factor.factor}</span>
                  </div>
                  {factor.explanation && (
                    <p className="text-xs text-muted-foreground mt-1">{factor.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskTab({ deal }: { deal: DealRecord }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  return (
    <div className="space-y-6 py-4">
      <ScoreHeader
        score={deal.risk_score}
        label={deal.risk_label}
        headline={deal.risk_headline}
        confidence={deal.risk_confidence}
        variant="risk"
        color="#f59e0b"
      />

      {/* Deal Breakers */}
      {deal.risk_deal_breakers.length > 0 && (
        <div>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                  Deal Breakers
                </span>
              </div>
              <div className="space-y-2">
                {deal.risk_deal_breakers.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-red-300">{typeof item === "string" ? item : JSON.stringify(item)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bear Case */}
      {deal.risk_bear_case && (
        <div>
          <SectionTitle icon={<Shield className="h-4 w-4 text-amber-400" />}>
            Bear Case
          </SectionTitle>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{deal.risk_bear_case}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Rent Stabilized?"
          value={deal.risk_rent_stabilized ? "LIKELY" : "UNLIKELY"}
        />
        <MetricCard label="Est. Legal Costs" value={deal.risk_legal_costs} />
        <MetricCard label="Confidence" value={deal.risk_confidence} />
      </div>

      {/* Critical Risks Table */}
      {deal.risk_critical_risks.length > 0 && (
        <div>
          <SectionTitle icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}>
            Critical Risks
          </SectionTitle>
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Risk</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Severity</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Mitigation</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {deal.risk_critical_risks.map((risk: RiskCriticalRisk | string, i: number) => {
                  if (typeof risk === "string") {
                    return (
                      <tr key={i} className="border-b border-white/10">
                        <td className="p-2 text-white" colSpan={4}>{risk}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className="border-b border-white/10">
                      <td className="p-2 text-white">{risk.risk}</td>
                      <td className="p-2"><SeverityBadge severity={risk.severity} /></td>
                      <td className="p-2 text-muted-foreground">{risk.mitigation || "—"}</td>
                      <td className="p-2 text-muted-foreground">{risk.estimated_cost_to_resolve || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Due Diligence Checklist */}
      {deal.risk_due_diligence.length > 0 && (
        <div>
          <SectionTitle icon={<CheckCircle2 className="h-4 w-4 text-amber-400" />}>
            Due Diligence Checklist
          </SectionTitle>
          <div className="space-y-2">
            {deal.risk_due_diligence.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => toggleCheck(i)}
              >
                <Checkbox
                  checked={checkedItems.has(i)}
                  className="mt-0.5 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span
                  className={cn(
                    "text-sm transition-all",
                    checkedItems.has(i)
                      ? "text-muted-foreground line-through"
                      : "text-white group-hover:text-amber-400"
                  )}
                >
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionTab({ deal }: { deal: DealRecord }) {
  const useIcon = () => {
    switch (deal.execution_recommended_use) {
      case "hotel": return <Hotel className="h-4 w-4" />;
      case "co-living": return <Home className="h-4 w-4" />;
      case "traditional_rental": return <Building2 className="h-4 w-4" />;
      case "mixed": return <Shuffle className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 py-4">
      <ScoreHeader
        score={deal.execution_score}
        label={deal.execution_label}
        headline={deal.execution_headline}
        confidence={deal.execution_confidence}
        variant="execution"
        color="#3b82f6"
      />

      {/* Aya Fit */}
      {deal.execution_aya_fit && (
        <div>
          <Card className="border-teal-500/30 bg-teal-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-semibold text-teal-400">Aya Fit Assessment</span>
                </div>
                {deal.execution_recommended_use && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    {useIcon()}
                    {deal.execution_recommended_use.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{deal.execution_aya_fit}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Renovation Cost"
          value={deal.execution_renovation_cost}
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Timeline"
          value={deal.execution_timeline_months ? `${deal.execution_timeline_months} months` : "N/A"}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Total Capital"
          value={deal.execution_total_capital}
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Confidence"
          value={deal.execution_confidence}
        />
      </div>

      {/* Workstreams Table */}
      {deal.execution_workstreams.length > 0 && (
        <div>
          <SectionTitle icon={<Settings className="h-4 w-4 text-blue-400" />}>
            Key Workstreams
          </SectionTitle>
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Workstream</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Duration</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Est. Cost</th>
                  <th className="text-left p-2 text-xs text-muted-foreground font-medium">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {deal.execution_workstreams.map((ws: ExecutionWorkstream | string, i: number) => {
                  if (typeof ws === "string") {
                    return (
                      <tr key={i} className="border-b border-white/10">
                        <td className="p-2 text-white" colSpan={4}>{ws}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className="border-b border-white/10">
                      <td className="p-2 text-white">{ws.workstream}</td>
                      <td className="p-2 text-muted-foreground">{ws.estimated_duration || "—"}</td>
                      <td className="p-2 text-muted-foreground">{ws.estimated_cost || "—"}</td>
                      <td className="p-2"><SeverityBadge severity={ws.complexity} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Challenges */}
      {deal.execution_challenges.length > 0 && (
        <div>
          <SectionTitle icon={<AlertTriangle className="h-4 w-4 text-blue-400" />}>
            Operational Challenges
          </SectionTitle>
          <div className="space-y-2">
            {deal.execution_challenges.map((ch: ExecutionChallenge | string, i: number) => {
              if (typeof ch === "string") {
                return (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-muted-foreground">{ch}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={ch.severity} />
                    <span className="text-sm font-medium text-white">{ch.challenge}</span>
                  </div>
                  {ch.mitigation_strategy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-blue-400">Mitigation:</span> {ch.mitigation_strategy}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Panel Component
// ============================================

export function DealDrillDownPanel({
  deal,
  open,
  onOpenChange,
  initialTab = "upside",
}: DealDrillDownPanelProps) {
  const [activeTab, setActiveTab] = useState<DrillDownTab>(initialTab);

  // Sync tab when initialTab changes (e.g., clicking different badge)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="bg-background border-white/10 sm:!max-w-2xl w-full overflow-y-auto p-0"
        side="right"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-white/10 p-6 pb-4">
          <SheetHeader>
            <div className="flex items-start gap-4">
              <ScoreGauge score={deal.final_score} size="sm" showLabel={false} />
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-white text-lg truncate">{deal.address}</SheetTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{deal.borough}</span>
                  <span className="text-white/20">|</span>
                  <span className="font-mono text-xs">BBL: {deal.bbl}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <RecommendationBadge recommendation={deal.recommendation} size="sm" />
                  {deal.alert_priority && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        deal.alert_priority.toUpperCase() === "HIGH" && "bg-red-500/20 text-red-400",
                        deal.alert_priority.toUpperCase() === "MEDIUM" && "bg-amber-500/20 text-amber-400",
                        deal.alert_priority.toUpperCase() === "LOW" && "bg-gray-500/20 text-gray-400"
                      )}
                    >
                      {deal.alert_priority} priority
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <div className="p-6 pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DrillDownTab)}>
            <TabsList className="w-full bg-white/5 border border-white/10 h-auto p-1">
              <TabsTrigger
                value="upside"
                className="flex-1 text-xs sm:text-sm data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Upside ({deal.upside_score})
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="flex-1 text-xs sm:text-sm data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Risk ({deal.risk_score})
              </TabsTrigger>
              <TabsTrigger
                value="execution"
                className="flex-1 text-xs sm:text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Execution ({deal.execution_score})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upside" className="mt-0">
              <UpsideTab deal={deal} />
            </TabsContent>
            <TabsContent value="risk" className="mt-0">
              <RiskTab deal={deal} />
            </TabsContent>
            <TabsContent value="execution" className="mt-0">
              <ExecutionTab deal={deal} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
