import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Building2,
  ExternalLink,
  Bookmark,
  Map,
  FileBarChart,
  X,
  CheckCircle2,
  Quote,
  Clock,
} from "lucide-react";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreGauge } from "./ScoreGauge";
import type { DealRecord, DrillDownTab } from "./types";
import { cn } from "@/lib/utils";

interface DealDetailModalProps {
  deal: DealRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveDeal?: (deal: DealRecord) => void;
  onOpenDrillDown?: (deal: DealRecord, tab: DrillDownTab) => void;
}

const COMMITTEE_MEMBERS = [
  {
    key: "upside" as DrillDownTab,
    name: "The Shark",
    icon: "🦈",
    title: "Upside Score",
    description: "Evaluates profit potential, market appreciation, and value-add opportunities",
    color: "#10b981",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    key: "risk" as DrillDownTab,
    name: "The Lawyer",
    icon: "⚖️",
    title: "Risk Score",
    description: "Assesses legal exposure, title issues, tenant risks, and market volatility",
    color: "#f59e0b",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    key: "execution" as DrillDownTab,
    name: "The Operator",
    icon: "⚙️",
    title: "Execution Score",
    description: "Rates deal complexity, timeline feasibility, and operational requirements",
    color: "#3b82f6",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
];

export function DealDetailModal({
  deal,
  open,
  onOpenChange,
  onSaveDeal,
  onOpenDrillDown,
}: DealDetailModalProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  if (!deal) return null;

  const getScore = (key: string) => {
    if (key === "upside") return deal.upside_score;
    if (key === "risk") return deal.risk_score;
    return deal.execution_score;
  };

  const getHeadline = (key: string) => {
    if (key === "upside") return deal.upside_headline;
    if (key === "risk") return deal.risk_headline;
    return deal.execution_headline;
  };

  const getLabel = (key: string) => {
    if (key === "upside") return deal.upside_label;
    if (key === "risk") return deal.risk_label;
    return deal.execution_label;
  };

  const dueDiligenceItems = deal.key_due_diligence
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const toggleCheck = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  // Construct Google Maps URL
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${deal.address}, ${deal.borough}, New York, NY`
  )}`;

  // Construct ACRIS URL (NYC property records)
  const bbl = deal.bbl.toString().padStart(10, "0");
  const borough = bbl.charAt(0);
  const block = bbl.slice(1, 6);
  const lot = bbl.slice(6);
  const acrisUrl = `https://a836-acris.nyc.gov/DS/DocumentSearch/BBLResult?borough=${borough}&block=${block}&lot=${lot}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-hidden bg-background border-white/10 p-0 modal-content"
        aria-labelledby="deal-modal-title"
        aria-describedby="deal-modal-description"
      >
        {/* HEADER */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 via-transparent to-emerald-500/10">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            aria-label="Close deal details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-6 animate-fade-in">
            {/* Large Score Circle */}
            <div className="relative">
              <ScoreGauge score={deal.final_score} size="lg" showLabel={false} />
              {deal.final_score >= 80 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 id="deal-modal-title" className="text-2xl font-bold text-white mb-1">
                    {deal.address}
                  </h2>
                  <div id="deal-modal-description" className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{deal.borough}</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <span className="font-mono text-sm">BBL: {deal.bbl}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RecommendationBadge recommendation={deal.recommendation} size="lg" />
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

              {/* Quick Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Price</p>
                  <p className="text-lg font-semibold text-white">{deal.estimated_price_range}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-400 uppercase tracking-wider">Est. ROI</p>
                  <p className="text-lg font-semibold text-emerald-400">{deal.estimated_roi}</p>
                </div>
                {deal.stabilized_value && (
                  <div>
                    <p className="text-xs text-purple-400 uppercase tracking-wider">Stabilized Value</p>
                    <p className="text-lg font-semibold text-purple-400">{deal.stabilized_value}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN - Investment Committee Scores */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-400" />
                Investment Committee Scores
              </h3>

              {COMMITTEE_MEMBERS.map((member) => {
                const score = getScore(member.key);
                const headline = getHeadline(member.key);
                const label = getLabel(member.key);
                return (
                  <Card
                    key={member.key}
                    className={cn(
                      "border cursor-pointer transition-all hover:scale-[1.02]",
                      member.borderColor,
                      member.bgColor
                    )}
                    onClick={() => onOpenDrillDown?.(deal, member.key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{member.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {member.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.name}
                              </p>
                            </div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: member.color }}
                            >
                              {score}
                            </div>
                          </div>
                          {label && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded border font-medium inline-block mt-1"
                              style={{
                                backgroundColor: `${member.color}15`,
                                borderColor: `${member.color}40`,
                                color: member.color,
                              }}
                            >
                              {label.replace(/_/g, " ")}
                            </span>
                          )}
                          {headline && (
                            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                              {headline}
                            </p>
                          )}
                          {/* Progress Bar */}
                          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${score}%`,
                                backgroundColor: member.color,
                                boxShadow: `0 0 10px ${member.color}50`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            Click for detailed analysis
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Score Calculation */}
              <Card className="border-purple-500/30 bg-purple-500/10">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Final Score Calculation
                  </p>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Upside × 40%</span>
                      <span className="text-white">
                        {deal.upside_score} × 0.4 = {(deal.upside_score * 0.4).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400">Risk × 35%</span>
                      <span className="text-white">
                        {deal.risk_score} × 0.35 = {(deal.risk_score * 0.35).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">Execution × 25%</span>
                      <span className="text-white">
                        {deal.execution_score} × 0.25 = {(deal.execution_score * 0.25).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                      <span className="text-purple-400">Final Score</span>
                      <span className="text-white">{deal.final_score}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CENTER COLUMN - Investment Thesis */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Investment Thesis
              </h3>

              <Card
                className={cn(
                  "border-purple-500/30 relative overflow-hidden",
                  deal.recommendation === "STRONG_BUY"
                    ? "bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-emerald-500/10"
                    : "bg-purple-500/10"
                )}
              >
                <CardContent className="p-6">
                  {/* Quote decoration */}
                  <Quote className="absolute top-4 left-4 h-12 w-12 text-purple-500/20" />
                  <Quote className="absolute bottom-4 right-4 h-12 w-12 text-purple-500/20 rotate-180" />

                  <div className="relative z-10">
                    <p className="text-base text-white leading-relaxed italic">
                      "{deal.investment_thesis}"
                    </p>

                    <div className="mt-6 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            AI Investment Committee
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Generated Analysis
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dissenting Opinions */}
              {deal.dissenting_opinions && (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <p className="text-sm font-medium text-red-400">Dissenting Opinions</p>
                    </div>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      {deal.dissenting_opinions}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Financial Highlights */}
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4 text-teal-400" />
                    <p className="text-sm font-medium text-white">Financial Analysis</p>
                  </div>
                  <div className={cn("grid gap-3", deal.stabilized_value ? "grid-cols-3" : "grid-cols-2")}>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Acquisition Range
                      </p>
                      <p className="text-base font-bold text-white mt-1">
                        {deal.estimated_price_range}
                      </p>
                    </div>
                    {deal.stabilized_value && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-purple-400 uppercase tracking-wider">
                          Stabilized Value
                        </p>
                        <p className="text-base font-bold text-purple-400 mt-1">
                          {deal.stabilized_value}
                        </p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-emerald-400 uppercase tracking-wider">
                        Est. ROI
                      </p>
                      <p className="text-base font-bold text-emerald-400 mt-1">
                        {deal.estimated_roi}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - Due Diligence & Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                Key Due Diligence
              </h3>

              <Card className="border-amber-500/30 bg-amber-500/10">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {dueDiligenceItems.map((item, i) => (
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
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  {dueDiligenceItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-amber-500/20">
                      <p className="text-xs text-muted-foreground">
                        Progress: {checkedItems.size} / {dueDiligenceItems.length} items completed
                      </p>
                      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{
                            width: `${(checkedItems.size / dueDiligenceItems.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Steps */}
              {deal.next_steps && deal.next_steps.length > 0 && (
                <Card className="border-blue-500/30 bg-blue-500/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <p className="text-sm font-medium text-blue-400">Next Steps</p>
                    </div>
                    <div className="space-y-2">
                      {deal.next_steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-400 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                          <span className="text-muted-foreground">
                            {typeof step === "string" ? step : JSON.stringify(step)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => onSaveDeal?.(deal)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Add to Watchlist
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => {
                    // Placeholder for report generation
                    console.log("Generating report for:", deal.address);
                  }}
                >
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => window.open(googleMapsUrl, "_blank")}
                  >
                    <Map className="h-4 w-4 mr-1" />
                    Google Maps
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => window.open(acrisUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    ACRIS
                  </Button>
                </div>
              </div>

              {/* Raw Data Viewer */}
              <Collapsible open={jsonExpanded} onOpenChange={setJsonExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View Raw Data
                    </span>
                    {jsonExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="border-white/10 bg-black/30 mt-2">
                    <CardContent className="p-3">
                      <pre className="text-xs text-muted-foreground overflow-x-auto max-h-[200px]">
                        {JSON.stringify(deal, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
