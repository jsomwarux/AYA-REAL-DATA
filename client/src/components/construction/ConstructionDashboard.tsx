import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  StatsCardsSkeleton,
  TableSkeleton,
  ChartSkeleton,
} from "@/components/ui/loading-skeletons";
import { EmptyState, NoSearchResults, NoFilterResults } from "@/components/ui/empty-state";
import {
  Filter,
  Search,
  X,
  Calendar,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { StatsCards } from "./StatsCards";
import { InvoiceTable, InvoiceRecord } from "./InvoiceTable";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { OverchargeChart } from "./OverchargeChart";
import { VerdictPieChart } from "./VerdictPieChart";
import { ComplianceTrend } from "./ComplianceTrend";
import { cn } from "@/lib/utils";

interface ConstructionDashboardProps {
  data: InvoiceRecord[];
  isLoading?: boolean;
}

type VerdictFilter = "all" | "APPROVE" | "HOLD_FOR_REVIEW" | "REJECT";
type ComplianceFilter = "all" | "PASS" | "PARTIAL" | "FAIL";

export function ConstructionDashboard({ data, isLoading }: ConstructionDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [contractFilter, setContractFilter] = useState<ComplianceFilter>("all");
  const [permitFilter, setPermitFilter] = useState<ComplianceFilter>("all");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Filter data
  const filteredData = data.filter((invoice) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        invoice.vendor_name?.toLowerCase().includes(query) ||
        invoice.invoice_number?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Verdict filter
    if (verdictFilter !== "all" && invoice.verdict?.toUpperCase() !== verdictFilter) {
      return false;
    }

    // Contract compliance filter
    if (contractFilter !== "all" && invoice.contract_compliance?.toUpperCase() !== contractFilter) {
      return false;
    }

    // Permit compliance filter
    if (permitFilter !== "all" && invoice.permit_compliance?.toUpperCase() !== permitFilter) {
      return false;
    }

    // Date range filter
    if (dateRange !== "all") {
      const invoiceDate = new Date(invoice.retrieved_at);
      const now = new Date();
      const daysAgo = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      }[dateRange];
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      if (invoiceDate < cutoff) return false;
    }

    return true;
  });

  // Count active filters
  const activeFilterCount = [
    verdictFilter !== "all",
    contractFilter !== "all",
    permitFilter !== "all",
    dateRange !== "all",
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setVerdictFilter("all");
    setContractFilter("all");
    setPermitFilter("all");
    setDateRange("all");
  };

  // Quick filter buttons for verdicts
  const VerdictFilterButton = ({
    verdict,
    label,
  }: {
    verdict: VerdictFilter;
    label: string;
  }) => {
    const count = data.filter(
      (inv) => verdict === "all" || inv.verdict?.toUpperCase() === verdict
    ).length;

    return (
      <button
        onClick={() => setVerdictFilter(verdict)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          verdictFilter === verdict
            ? "bg-white/10 text-white border border-white/20"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        )}
      >
        {label}
        <span className="ml-1.5 text-xs opacity-60">({count})</span>
      </button>
    );
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <StatsCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton type="bar" />
          <ChartSkeleton type="pie" />
          <ChartSkeleton type="line" />
          <ChartSkeleton type="bar" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // Show empty state if no data
  if (!data.length) {
    return (
      <EmptyState
        variant="construction"
        title="No invoices available"
        description="Construction invoice data will appear here once processed. Check your Google Sheets connection in Settings."
      />
    );
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <StatsCards data={data} />

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Analytics Overview</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OverchargeChart data={data} />
          <VerdictPieChart data={data} />
          <ComplianceTrend data={data} />
          <Card className="border-white/10 bg-gradient-to-br from-white/5 to-transparent">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                Summary Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {(() => {
                  const totalOvercharge = data.reduce((sum, inv) => sum + (inv.potential_overcharge || 0), 0);
                  const rejectedCount = data.filter(inv => inv.verdict?.toUpperCase() === "REJECT").length;
                  const holdCount = data.filter(inv => inv.verdict?.toUpperCase() === "HOLD_FOR_REVIEW").length;
                  const failedCompliance = data.filter(inv =>
                    inv.contract_compliance?.toUpperCase() === "FAIL" ||
                    inv.permit_compliance?.toUpperCase() === "FAIL"
                  ).length;

                  return (
                    <>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-red-400 font-medium">Total Potential Overcharges</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          ${totalOvercharge.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Across {data.filter(inv => inv.potential_overcharge > 0).length} invoices
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                          <p className="text-xl font-bold text-red-400">{rejectedCount}</p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                          <p className="text-xl font-bold text-amber-400">{holdCount}</p>
                          <p className="text-xs text-muted-foreground">On Hold</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                          <p className="text-xl font-bold text-purple-400">{failedCompliance}</p>
                          <p className="text-xs text-muted-foreground">Failed Compliance</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <p className="text-sm text-teal-400 font-medium">AI Recommendation</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalOvercharge > 50000
                            ? "High overcharge volume detected. Consider vendor performance review."
                            : rejectedCount > 2
                            ? "Multiple rejections this period. Recommend vendor training on submission requirements."
                            : holdCount > 3
                            ? "Several invoices pending review. Prioritize compliance documentation requests."
                            : "Invoice processing is on track. Continue monitoring compliance trends."}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 focus:border-white/20 text-white placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Verdict Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <VerdictFilterButton verdict="all" label="All" />
            <VerdictFilterButton verdict="APPROVE" label="Approved" />
            <VerdictFilterButton verdict="HOLD_FOR_REVIEW" label="Review" />
            <VerdictFilterButton verdict="REJECT" label="Rejected" />
          </div>
        </div>

        {/* Advanced Filters Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-background border-white/10">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Invoices
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verdict Filter */}
              <div className="space-y-2">
                <Label className="text-white">Verdict</Label>
                <Select value={verdictFilter} onValueChange={(v: VerdictFilter) => setVerdictFilter(v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verdicts</SelectItem>
                    <SelectItem value="APPROVE">Approved</SelectItem>
                    <SelectItem value="HOLD_FOR_REVIEW">Hold for Review</SelectItem>
                    <SelectItem value="REJECT">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contract Compliance */}
              <div className="space-y-2">
                <Label className="text-white">Contract Compliance</Label>
                <Select value={contractFilter} onValueChange={(v: ComplianceFilter) => setContractFilter(v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permit Compliance */}
              <div className="space-y-2">
                <Label className="text-white">Permit Compliance</Label>
                <Select value={permitFilter} onValueChange={(v: ComplianceFilter) => setPermitFilter(v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-white"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {verdictFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Verdict: {verdictFilter.replace(/_/g, " ").toLowerCase()}
              <button
                onClick={() => setVerdictFilter("all")}
                className="hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {contractFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Contract: {contractFilter.toLowerCase()}
              <button
                onClick={() => setContractFilter("all")}
                className="hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {permitFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Permit: {permitFilter.toLowerCase()}
              <button
                onClick={() => setPermitFilter("all")}
                className="hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateRange !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm text-white">
              Date: {dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}
              <button
                onClick={() => setDateRange("all")}
                className="hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      {filteredData.length !== data.length && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Showing {filteredData.length} of {data.length} invoices
        </div>
      )}

      {/* Invoice Table */}
      {filteredData.length === 0 ? (
        searchQuery ? (
          <NoSearchResults query={searchQuery} onClear={() => setSearchQuery("")} />
        ) : activeFilterCount > 0 ? (
          <NoFilterResults onClear={clearFilters} />
        ) : null
      ) : (
        <InvoiceTable
          data={filteredData}
          onViewDetails={(invoice) => setSelectedInvoice(invoice)}
        />
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
        onMarkReviewed={(invoice) => {
          console.log("Marked as reviewed:", invoice.invoice_number);
        }}
      />
    </div>
  );
}
