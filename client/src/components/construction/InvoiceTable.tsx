import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  AlertTriangle,
  MessageSquare,
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
import { VerdictBadge } from "./VerdictBadge";
import { ComplianceBadge } from "./ComplianceBadge";
import { cn } from "@/lib/utils";

export interface InvoiceRecord {
  retrieved_at: string;  // Timestamp added by backend when data is fetched from Google Sheets
  vendor_name: string;
  invoice_number: string;
  invoice_amount: number;
  verdict: string;
  potential_overcharge: number;
  contract_compliance: string;
  permit_compliance: string;
  critical_flags: string;
  confidence_score: number;
  slack_alert_message?: string;
}

interface InvoiceTableProps {
  data: InvoiceRecord[];
  onViewDetails?: (invoice: InvoiceRecord) => void;
}

type SortField = "retrieved_at" | "vendor_name" | "invoice_amount" | "potential_overcharge" | "verdict";
type SortDirection = "asc" | "desc";

export function InvoiceTable({ data, onViewDetails }: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField>("retrieved_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle date sorting
      if (sortField === "retrieved_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (sortField === "invoice_amount" || sortField === "potential_overcharge") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
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

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Recent Invoice Audits</CardTitle>
          <div className="text-sm text-muted-foreground">
            {sortedData.length} total invoices
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <SortableHeader field="retrieved_at" className="text-xs uppercase tracking-wider">
                  Retrieved
                </SortableHeader>
                <SortableHeader field="vendor_name" className="text-xs uppercase tracking-wider">
                  Vendor
                </SortableHeader>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Invoice #
                </TableHead>
                <SortableHeader field="invoice_amount" className="text-xs uppercase tracking-wider text-right">
                  Amount
                </SortableHeader>
                <SortableHeader field="verdict" className="text-xs uppercase tracking-wider">
                  Verdict
                </SortableHeader>
                <SortableHeader field="potential_overcharge" className="text-xs uppercase tracking-wider text-right">
                  Overcharge
                </SortableHeader>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Contract
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Permit
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((invoice, index) => (
                  <>
                    <TableRow
                      key={invoice.invoice_number}
                      className={cn(
                        "border-white/10 cursor-pointer transition-colors",
                        expandedRow === invoice.invoice_number
                          ? "bg-white/5"
                          : "hover:bg-white/5"
                      )}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === invoice.invoice_number
                            ? null
                            : invoice.invoice_number
                        )
                      }
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(invoice.retrieved_at)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <span className="text-sm font-medium text-white truncate block">
                            {invoice.vendor_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(invoice.invoice_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <VerdictBadge verdict={invoice.verdict} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.potential_overcharge > 0 ? (
                          <span className="text-sm font-medium text-red-400">
                            {formatCurrency(invoice.potential_overcharge)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ComplianceBadge status={invoice.contract_compliance} compact />
                      </TableCell>
                      <TableCell>
                        <ComplianceBadge status={invoice.permit_compliance} compact />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails?.(invoice);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row details */}
                    {expandedRow === invoice.invoice_number && (
                      <TableRow className="border-white/10 bg-white/[0.02]">
                        <TableCell colSpan={9} className="p-0">
                          <div className="p-4 space-y-4 animate-fade-in">
                            {/* Flags section */}
                            {invoice.critical_flags && (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-400">
                                    Critical Flags
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {invoice.critical_flags}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Details grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Confidence Score
                                </p>
                                <p className="text-lg font-semibold text-white mt-1">
                                  {invoice.confidence_score}%
                                </p>
                                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      invoice.confidence_score >= 80
                                        ? "bg-teal-400"
                                        : invoice.confidence_score >= 60
                                        ? "bg-amber-400"
                                        : "bg-red-400"
                                    )}
                                    style={{ width: `${invoice.confidence_score}%` }}
                                  />
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Contract Compliance
                                </p>
                                <div className="mt-2">
                                  <ComplianceBadge status={invoice.contract_compliance} />
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Permit Compliance
                                </p>
                                <div className="mt-2">
                                  <ComplianceBadge status={invoice.permit_compliance} />
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Potential Savings
                                </p>
                                <p
                                  className={cn(
                                    "text-lg font-semibold mt-1",
                                    invoice.potential_overcharge > 0
                                      ? "text-red-400"
                                      : "text-teal-400"
                                  )}
                                >
                                  {invoice.potential_overcharge > 0
                                    ? formatCurrency(invoice.potential_overcharge)
                                    : "None identified"}
                                </p>
                              </div>
                            </div>

                            {/* Slack alert message */}
                            {invoice.slack_alert_message && (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                <MessageSquare className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-400">
                                    Slack Alert
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                    {invoice.slack_alert_message}
                                  </p>
                                </div>
                              </div>
                            )}
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
