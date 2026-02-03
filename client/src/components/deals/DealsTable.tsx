import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  MapPin,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreGauge, ScoreBar } from "./ScoreGauge";
import { cn } from "@/lib/utils";
import type { DealRecord, DrillDownTab } from "./types";

// Re-export for backward compatibility
export type { DealRecord } from "./types";

interface DealsTableProps {
  data: DealRecord[];
  onViewDetails?: (deal: DealRecord) => void;
  onOpenDrillDown?: (deal: DealRecord, tab: DrillDownTab) => void;
}

type SortField = "final_score" | "address" | "borough" | "recommendation" | "estimated_roi";
type SortDirection = "asc" | "desc";

export function DealsTable({ data, onViewDetails, onOpenDrillDown }: DealsTableProps) {
  const [sortField, setSortField] = useState<SortField>("final_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle numeric sorting
      if (sortField === "final_score") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      // Handle recommendation sorting (by priority)
      if (sortField === "recommendation") {
        const priority = { STRONG_BUY: 4, BUY: 3, HOLD: 2, PASS: 1 };
        aVal = priority[aVal?.toUpperCase() as keyof typeof priority] || 0;
        bVal = priority[bVal?.toUpperCase() as keyof typeof priority] || 0;
      }

      // Handle ROI sorting (extract first number)
      if (sortField === "estimated_roi") {
        aVal = parseInt(aVal?.match(/\d+/)?.[0] || "0");
        bVal = parseInt(bVal?.match(/\d+/)?.[0] || "0");
      }

      // Handle string sorting
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sortable header
  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={cn(
        "cursor-pointer hover:text-white transition-colors select-none",
        className
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Score display that "pops" for high scores
  const ScoreDisplay = ({ score }: { score: number }) => {
    const isHigh = score >= 80;
    const isMedium = score >= 70 && score < 80;

    return (
      <div
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-xl font-bold text-xl transition-all",
          isHigh && "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20",
          isMedium && "bg-green-500/15 text-green-400 ring-1 ring-green-500/20",
          !isHigh && !isMedium && score >= 50 && "bg-amber-500/15 text-amber-400",
          score < 50 && "bg-white/5 text-muted-foreground"
        )}
      >
        {score}
      </div>
    );
  };

  // Clickable score badge for individual analyst scores
  const ScoreBadge = ({
    label,
    score,
    deal,
    tab,
  }: {
    label: string;
    score: number;
    deal: DealRecord;
    tab: DrillDownTab;
  }) => {
    const colorClass =
      score >= 80
        ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25"
        : score >= 60
        ? "text-teal-400 bg-teal-500/15 border-teal-500/30 hover:bg-teal-500/25"
        : score >= 40
        ? "text-amber-400 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25"
        : score >= 20
        ? "text-orange-400 bg-orange-500/15 border-orange-500/30 hover:bg-orange-500/25"
        : "text-red-400 bg-red-500/15 border-red-500/30 hover:bg-red-500/25";

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenDrillDown?.(deal, tab);
        }}
        className={cn(
          "px-1.5 py-0.5 rounded text-xs font-mono font-semibold border transition-all cursor-pointer",
          colorClass
        )}
        title={`${label} Score: ${score} — Click for details`}
      >
        {label[0]}: {score}
      </button>
    );
  };

  // Mobile card component
  const MobileDealCard = ({ deal, index }: { deal: DealRecord; index: number }) => (
    <div
      className={cn(
        "p-4 rounded-lg border animate-fade-in-up",
        deal.final_score >= 80
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-white/5"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onViewDetails?.(deal)}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{deal.address}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{deal.borough}</span>
          </div>
        </div>
        <ScoreDisplay score={deal.final_score} />
      </div>
      <div className="flex items-center justify-between">
        <RecommendationBadge recommendation={deal.recommendation} />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Est. ROI</p>
          <p className="text-sm font-semibold text-emerald-400">{deal.estimated_roi}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <ScoreBadge label="Upside" score={deal.upside_score} deal={deal} tab="upside" />
        <ScoreBadge label="Risk" score={deal.risk_score} deal={deal} tab="risk" />
        <ScoreBadge label="Exec" score={deal.execution_score} deal={deal} tab="execution" />
      </div>
    </div>
  );

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Scored Properties
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {sortedData.length} properties
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
          {paginatedData.map((deal, index) => (
            <MobileDealCard key={deal.bbl} deal={deal} index={index} />
          ))}
          {paginatedData.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No properties found
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <SortableHeader field="final_score" className="text-xs uppercase tracking-wider w-20">
                  Score
                </SortableHeader>
                <SortableHeader field="address" className="text-xs uppercase tracking-wider">
                  Address
                </SortableHeader>
                <SortableHeader field="borough" className="text-xs uppercase tracking-wider">
                  Borough
                </SortableHeader>
                <SortableHeader field="recommendation" className="text-xs uppercase tracking-wider">
                  Signal
                </SortableHeader>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Scores
                </TableHead>
                <SortableHeader field="estimated_roi" className="text-xs uppercase tracking-wider">
                  Est. ROI
                </SortableHeader>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No properties found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((deal, index) => (
                  <>
                    <TableRow
                      key={deal.bbl}
                      className={cn(
                        "border-white/10 cursor-pointer transition-all table-row-hover animate-fade-in-up",
                        deal.final_score >= 80 && "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08]",
                        deal.final_score < 80 && expandedRow === deal.bbl
                          ? "bg-white/5"
                          : deal.final_score < 80 && "hover:bg-white/5"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() =>
                        setExpandedRow(expandedRow === deal.bbl ? null : deal.bbl)
                      }
                    >
                      <TableCell>
                        <ScoreDisplay score={deal.final_score} />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px]">
                          <span className="text-sm font-medium text-white block truncate">
                            {deal.address}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            BBL: {deal.bbl}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-white">{deal.borough}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RecommendationBadge recommendation={deal.recommendation} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ScoreBadge label="Upside" score={deal.upside_score} deal={deal} tab="upside" />
                          <ScoreBadge label="Risk" score={deal.risk_score} deal={deal} tab="risk" />
                          <ScoreBadge label="Exec" score={deal.execution_score} deal={deal} tab="execution" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-sm font-semibold",
                          parseInt(deal.estimated_roi?.match(/\d+/)?.[0] || "0") >= 25
                            ? "text-emerald-400"
                            : parseInt(deal.estimated_roi?.match(/\d+/)?.[0] || "0") >= 15
                            ? "text-green-400"
                            : "text-amber-400"
                        )}>
                          {deal.estimated_roi}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails?.(deal);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row details */}
                    {expandedRow === deal.bbl && (
                      <TableRow className="border-white/10 bg-white/[0.02]">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4 space-y-4 animate-fade-in">
                            {/* Investment Thesis */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-purple-400">
                                  Investment Thesis
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {deal.investment_thesis}
                                </p>
                              </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Price Range
                                </p>
                                <p className="text-lg font-semibold text-white mt-1">
                                  {deal.estimated_price_range}
                                </p>
                              </div>

                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Est. ROI
                                </p>
                                <p className="text-lg font-semibold text-emerald-400 mt-1">
                                  {deal.estimated_roi}
                                </p>
                              </div>

                              <div className="p-3 rounded-lg bg-white/5 border border-white/10 col-span-2">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenDrillDown?.(deal, "upside"); }}
                                    className="cursor-pointer transition-transform hover:scale-110"
                                  >
                                    <ScoreGauge score={deal.upside_score} label="Upside" size="sm" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenDrillDown?.(deal, "risk"); }}
                                    className="cursor-pointer transition-transform hover:scale-110"
                                  >
                                    <ScoreGauge score={deal.risk_score} label="Risk" size="sm" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenDrillDown?.(deal, "execution"); }}
                                    className="cursor-pointer transition-transform hover:scale-110"
                                  >
                                    <ScoreGauge score={deal.execution_score} label="Execution" size="sm" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Due Diligence */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-400">
                                  Key Due Diligence Items
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {(deal.key_due_diligence_items.length > 0
                                    ? deal.key_due_diligence_items
                                    : deal.key_due_diligence.split("\n").map(s => s.trim()).filter(Boolean)
                                  ).map((item, i) => (
                                    <li
                                      key={i}
                                      className="text-sm text-muted-foreground flex items-start gap-2"
                                    >
                                      <span className="text-amber-400 mt-1">•</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedData.length)} of{" "}
              {sortedData.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 p-0",
                        currentPage === pageNum
                          ? "bg-white/10 text-white"
                          : "text-muted-foreground hover:text-white"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
