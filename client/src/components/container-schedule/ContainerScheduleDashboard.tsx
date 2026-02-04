import { useState, useMemo } from "react";
import {
  Ship,
  Package,
  Warehouse,
  MapPin,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContainerScheduleItem, ContainerScheduleSummary } from "@/lib/api";

// Status color map - follows the shipment lifecycle
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Ready to be shipped": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  "Passed inspection": { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  "Shipped": { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  "Arrived NY Port": { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  "Warehouse": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "Arrived to hotel": { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
};

const DEFAULT_STATUS_STYLE = { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" };

// Factory colors for chips
const FACTORY_COLORS: Record<string, { bg: string; text: string }> = {
  IDM: { bg: "bg-teal-500/20", text: "text-teal-300" },
  SESE: { bg: "bg-pink-500/20", text: "text-pink-300" },
  ZHONGSHAN: { bg: "bg-amber-500/20", text: "text-amber-300" },
  ORBITA: { bg: "bg-blue-500/20", text: "text-blue-300" },
  DONGNA: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  DONGFANG: { bg: "bg-orange-500/20", text: "text-orange-300" },
  ZHONGBAI: { bg: "bg-violet-500/20", text: "text-violet-300" },
};

const DEFAULT_FACTORY_COLOR = { bg: "bg-gray-500/20", text: "text-gray-300" };

type SortField = "factory" | "containerLoaded" | "shipmentNumber" | "containerNumber" | "delivery" | "loadingDate" | "vesselDepartureDate" | "etaNYPort" | "etaWarehouse" | "status";
type SortDirection = "asc" | "desc";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function isLink(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.toLowerCase() === "link";
}

function LinkCell({ value, label }: { value: string; label: string }) {
  if (!value || value === "N.A" || value === "N/A" || value === "") return <span className="text-muted-foreground/50">-</span>;
  if (value.toLowerCase() === "link") {
    // The cell just says "Link" but we don't have the actual URL
    return <span className="text-xs text-muted-foreground">Link</span>;
  }
  if (isLink(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span>{label}</span>
      </a>
    );
  }
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

interface ContainerScheduleDashboardProps {
  containers: ContainerScheduleItem[];
  summary: ContainerScheduleSummary;
  isLoading: boolean;
}

export function ContainerScheduleDashboard({ containers, summary, isLoading }: ContainerScheduleDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [factoryFilter, setFactoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("shipmentNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Unique factories and statuses for filter dropdowns
  const factories = useMemo(() => {
    const set = new Set(containers.map((c) => c.factory).filter(Boolean));
    return Array.from(set).sort();
  }, [containers]);

  const statuses = useMemo(() => {
    const set = new Set(containers.map((c) => c.status).filter(Boolean));
    return Array.from(set).sort();
  }, [containers]);

  // Filtered and sorted
  const filteredContainers = useMemo(() => {
    let result = [...containers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.factory.toLowerCase().includes(q) ||
          c.containerLoaded.toLowerCase().includes(q) ||
          c.containerNumber.toLowerCase().includes(q)
      );
    }

    if (factoryFilter !== "all") {
      result = result.filter((c) => c.factory === factoryFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal = (a[sortField] || "").toString();
      let bVal = (b[sortField] || "").toString();

      // Date sorting
      if (["delivery", "loadingDate", "vesselDepartureDate", "etaNYPort", "etaWarehouse"].includes(sortField)) {
        const parseDate = (s: string) => {
          const parts = s.split("/");
          if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1])).getTime();
          return 0;
        };
        const aTime = parseDate(aVal);
        const bTime = parseDate(bVal);
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      // Numeric sorting for shipment/container numbers
      if (sortField === "shipmentNumber") {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const cmp = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [containers, searchQuery, factoryFilter, statusFilter, sortField, sortDirection]);

  // Summary counts
  const shippedCount = (summary.byStatus["Shipped"] || 0);
  const atPortCount = (summary.byStatus["Arrived NY Port"] || 0);
  const warehouseCount = (summary.byStatus["Warehouse"] || 0) + (summary.byStatus["Arrived to hotel"] || 0);
  const inTransitCount = summary.total - warehouseCount;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-white/10 bg-[#12121a]">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10">
                <Package className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Containers</p>
                <p className="text-2xl font-bold text-white">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-400/10">
                <Ship className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shipped</p>
                <p className="text-2xl font-bold text-blue-400">{shippedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-400/10">
                <MapPin className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">At Port</p>
                <p className="text-2xl font-bold text-violet-400">{atPortCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10">
                <Warehouse className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-emerald-400">{warehouseCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search factory, contents, or container..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
              />
            </div>

            <Select value={factoryFilter} onValueChange={setFactoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Factory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Factories</SelectItem>
                {factories.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Containers Table */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span>Containers ({filteredContainers.length})</span>
            {(searchQuery || factoryFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFactoryFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs text-muted-foreground hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("factory")}
                  >
                    <div className="flex items-center gap-1">
                      Factory
                      <SortIcon field="factory" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors min-w-[180px]"
                    onClick={() => handleSort("containerLoaded")}
                  >
                    <div className="flex items-center gap-1">
                      Contents
                      <SortIcon field="containerLoaded" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[60px]"
                    onClick={() => handleSort("shipmentNumber")}
                  >
                    <div className="flex items-center gap-1">
                      Ship #
                      <SortIcon field="shipmentNumber" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[80px]"
                    onClick={() => handleSort("containerNumber")}
                  >
                    <div className="flex items-center gap-1">
                      Cont #
                      <SortIcon field="containerNumber" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[75px]"
                    onClick={() => handleSort("vesselDepartureDate")}
                  >
                    <div className="flex items-center gap-1">
                      Departs
                      <SortIcon field="vesselDepartureDate" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[75px]"
                    onClick={() => handleSort("etaNYPort")}
                  >
                    <div className="flex items-center gap-1">
                      ETA Port
                      <SortIcon field="etaNYPort" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[75px]"
                    onClick={() => handleSort("etaWarehouse")}
                  >
                    <div className="flex items-center gap-1">
                      ETA WH
                      <SortIcon field="etaWarehouse" />
                    </div>
                  </th>
                  <th
                    className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 cursor-pointer hover:text-white transition-colors w-[150px]"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 w-[100px]">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No containers match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredContainers.map((container) => {
                    const factoryColor = FACTORY_COLORS[container.factory] || DEFAULT_FACTORY_COLOR;
                    const statusStyle = STATUS_STYLES[container.status] || DEFAULT_STATUS_STYLE;
                    const isExpanded = expandedRow === container.id;

                    return (
                      <>
                        <tr
                          key={container.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setExpandedRow(isExpanded ? null : container.id)}
                        >
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${factoryColor.bg} ${factoryColor.text}`}
                            >
                              {container.factory}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-white line-clamp-1 block max-w-[220px]">
                                    {container.containerLoaded}
                                  </span>
                                </TooltipTrigger>
                                {container.containerLoaded.length > 35 && (
                                  <TooltipContent side="top" className="max-w-sm">
                                    <p className="text-sm">{container.containerLoaded}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-muted-foreground">{container.shipmentNumber}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-muted-foreground">{container.containerNumber}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">{formatDate(container.vesselDepartureDate)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">{formatDate(container.etaNYPort)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">{formatDate(container.etaWarehouse)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {container.status ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                {container.status}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {container.bolCopy && container.bolCopy !== "N.A" && (
                                <LinkCell value={container.bolCopy} label="BOL" />
                              )}
                              {container.insurance && container.insurance !== "N.A" && (
                                <LinkCell value={container.insurance} label="Ins" />
                              )}
                              <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Detail Row */}
                        {isExpanded && (
                          <tr key={`${container.id}-detail`} className="border-b border-white/5 bg-white/[0.015]">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-[11px] text-muted-foreground mb-1">Delivery Date</p>
                                  <p className="text-white">{formatDate(container.delivery) || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground mb-1">Loading Date</p>
                                  <p className="text-white">{formatDate(container.loadingDate) || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground mb-1">Product Details</p>
                                  <p className="text-white">{container.productDetails || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground mb-1">Documents</p>
                                  <div className="flex flex-col gap-1">
                                    <LinkCell value={container.bolCopy} label="BOL Copy" />
                                    <LinkCell value={container.insurance} label="Insurance" />
                                    <LinkCell value={container.productListWithPhotos} label="Product List w/ Photos" />
                                    <LinkCell value={container.packingList} label="Packing List" />
                                    <LinkCell value={container.warehouseProofOfDelivery} label="Warehouse Proof" />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3 p-4">
            {filteredContainers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No containers match your filters.
              </p>
            ) : (
              filteredContainers.map((container) => {
                const factoryColor = FACTORY_COLORS[container.factory] || DEFAULT_FACTORY_COLOR;
                const statusStyle = STATUS_STYLES[container.status] || DEFAULT_STATUS_STYLE;

                return (
                  <div
                    key={container.id}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{container.containerLoaded}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${factoryColor.bg} ${factoryColor.text}`}
                          >
                            {container.factory}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Ship #{container.shipmentNumber}
                          </span>
                        </div>
                      </div>
                      {container.status && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {container.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-muted-foreground">Departs</p>
                        <p className="text-white">{formatDate(container.vesselDepartureDate) || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ETA Port</p>
                        <p className="text-white">{formatDate(container.etaNYPort) || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ETA WH</p>
                        <p className="text-white">{formatDate(container.etaWarehouse) || "-"}</p>
                      </div>
                    </div>

                    {/* Document links */}
                    <div className="flex flex-wrap gap-2">
                      {container.bolCopy && container.bolCopy !== "N.A" && <LinkCell value={container.bolCopy} label="BOL" />}
                      {container.insurance && container.insurance !== "N.A" && <LinkCell value={container.insurance} label="Insurance" />}
                      {container.productListWithPhotos && container.productListWithPhotos !== "N.A" && <LinkCell value={container.productListWithPhotos} label="Products" />}
                      {container.packingList && container.packingList !== "N.A" && <LinkCell value={container.packingList} label="Packing" />}
                      {container.warehouseProofOfDelivery && <LinkCell value={container.warehouseProofOfDelivery} label="Proof" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
