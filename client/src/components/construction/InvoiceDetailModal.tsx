import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ListChecks,
  DollarSign,
  Shield,
  FileCheck,
} from "lucide-react";
import { VerdictBadge } from "./VerdictBadge";
import { InvoiceRecord } from "./InvoiceTable";
import { cn } from "@/lib/utils";

interface InvoiceDetailModalProps {
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkReviewed?: (invoice: InvoiceRecord) => void;
}

// Circular gauge component
function CircularGauge({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  label,
  color,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(value / max, 1);
  const offset = circumference - percent * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// Small compliance gauge
function ComplianceGauge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const statusConfig = {
    PASS: { color: "#14b8a6", value: 100 },
    PARTIAL: { color: "#f59e0b", value: 50 },
    FAIL: { color: "#ef4444", value: 0 },
  };

  const config = statusConfig[status?.toUpperCase() as keyof typeof statusConfig] || statusConfig.FAIL;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="transform -rotate-90" width={64} height={64}>
          <circle
            cx={32}
            cy={32}
            r={26}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={6}
          />
          <circle
            cx={32}
            cy={32}
            r={26}
            fill="none"
            stroke={config.color}
            strokeWidth={6}
            strokeDasharray={163.36}
            strokeDashoffset={163.36 - (config.value / 100) * 163.36}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {status?.toUpperCase() === "PASS" ? (
            <CheckCircle className="h-5 w-5 text-teal-400" />
          ) : status?.toUpperCase() === "PARTIAL" ? (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
        </div>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-medium",
          status?.toUpperCase() === "PASS" && "text-teal-400",
          status?.toUpperCase() === "PARTIAL" && "text-amber-400",
          status?.toUpperCase() === "FAIL" && "text-red-400"
        )}
      >
        {status}
      </span>
    </div>
  );
}

// Generate recommended actions based on invoice data
function getRecommendedActions(invoice: InvoiceRecord): string[] {
  const actions: string[] = [];

  if (invoice.verdict === "REJECT") {
    actions.push("Return invoice to vendor with detailed explanation of issues");
    actions.push("Request itemized breakdown of all charges");
  }

  if (invoice.verdict === "HOLD_FOR_REVIEW") {
    actions.push("Schedule review meeting with project manager");
  }

  if (invoice.potential_overcharge > 0) {
    actions.push(`Negotiate reduction of $${invoice.potential_overcharge.toLocaleString()}`);
  }

  if (invoice.contract_compliance === "FAIL") {
    actions.push("Compare line items against original contract terms");
    actions.push("Verify all rates match agreed-upon contract rates");
  }

  if (invoice.permit_compliance === "FAIL") {
    actions.push("Request updated permit documentation before processing");
    actions.push("Verify all required permits are current and valid");
  }

  if (invoice.permit_compliance === "PARTIAL") {
    actions.push("Follow up on pending permit approvals");
  }

  if (invoice.confidence_score < 70) {
    actions.push("Request additional supporting documentation from vendor");
  }

  if (actions.length === 0) {
    actions.push("Invoice ready for approval - no issues identified");
  }

  return actions;
}

export function InvoiceDetailModal({
  invoice,
  open,
  onOpenChange,
  onMarkReviewed,
}: InvoiceDetailModalProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);

  if (!invoice) return null;

  const estimatedFairValue = invoice.invoice_amount - invoice.potential_overcharge;
  const recommendedActions = getRecommendedActions(invoice);

  const confidenceColor =
    invoice.confidence_score >= 80
      ? "#14b8a6"
      : invoice.confidence_score >= 60
      ? "#f59e0b"
      : "#ef4444";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Invoice Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
          {/* LEFT SIDE - 60% */}
          <div className="lg:col-span-3 space-y-4">
            {/* Invoice Header */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {invoice.vendor_name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Retrieved:{" "}
                      {new Date(invoice.retrieved_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${invoice.invoice_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verdict Section */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">AI Verdict</p>
                    <VerdictBadge verdict={invoice.verdict} size="lg" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p
                      className={cn(
                        "text-3xl font-bold",
                        invoice.confidence_score >= 80 && "text-teal-400",
                        invoice.confidence_score >= 60 &&
                          invoice.confidence_score < 80 &&
                          "text-amber-400",
                        invoice.confidence_score < 60 && "text-red-400"
                      )}
                    >
                      {invoice.confidence_score}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Summary */}
            {invoice.slack_alert_message && (
              <Card className="border-blue-500/30 bg-blue-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-400 mb-2">
                        AI Analysis Summary
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {invoice.slack_alert_message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Critical Flags */}
            {invoice.critical_flags && (
              <Card className="border-red-500/30 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400 mb-2">
                        Critical Flags
                      </p>
                      <ul className="space-y-1">
                        {invoice.critical_flags.split(",").map((flag, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-red-400 mt-1">•</span>
                            {flag.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Actions */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ListChecks className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-400 mb-3">
                      Recommended Actions
                    </p>
                    <ol className="space-y-2">
                      {recommendedActions.map((action, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-3"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          {action}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - 40% */}
          <div className="lg:col-span-2 space-y-4">
            {/* Confidence Gauge */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4 flex justify-center">
                <CircularGauge
                  value={invoice.confidence_score}
                  label="AI Confidence"
                  color={confidenceColor}
                  size={140}
                  strokeWidth={12}
                />
              </CardContent>
            </Card>

            {/* Compliance Gauges */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-white mb-4 text-center">
                  Compliance Status
                </p>
                <div className="flex justify-around">
                  <ComplianceGauge
                    status={invoice.contract_compliance}
                    label="Contract"
                  />
                  <ComplianceGauge
                    status={invoice.permit_compliance}
                    label="Permit"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Impact */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-teal-400" />
                  <p className="text-sm font-medium text-white">Financial Impact</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Invoice Amount
                    </span>
                    <span className="text-sm font-medium text-white">
                      ${invoice.invoice_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Estimated Fair Value
                    </span>
                    <span className="text-sm font-medium text-teal-400">
                      ${estimatedFairValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        Potential Overcharge
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          invoice.potential_overcharge > 0
                            ? "text-red-400"
                            : "text-teal-400"
                        )}
                      >
                        {invoice.potential_overcharge > 0
                          ? `-$${invoice.potential_overcharge.toLocaleString()}`
                          : "$0"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-6 space-y-4">
          {/* JSON Viewer */}
          <Collapsible open={jsonExpanded} onOpenChange={setJsonExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  View Full JSON Data
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
                <CardContent className="p-4">
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(invoice, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
              onClick={() => {
                // Placeholder for PDF export
                alert("PDF export coming soon!");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                onMarkReviewed?.(invoice);
                onOpenChange(false);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Reviewed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
