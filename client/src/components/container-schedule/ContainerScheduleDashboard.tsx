import { useState, useMemo, useEffect, useCallback } from "react";
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
  ChevronRight,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  Calendar,
  Anchor,
  X,
  Filter,
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

// Status lifecycle order (for the step indicator)
const STATUS_ORDER = [
  "Ready to be shipped",
  "Passed inspection",
  "Shipped",
  "Arrived NY Port",
  "Warehouse",
  "Arrived to hotel",
];

// Status color map - follows the shipment lifecycle
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Ready to be shipped": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  "Passed inspection": { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30", dot: "bg-sky-400" },
  "Shipped": { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  "Arrived NY Port": { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-400" },
  "Warehouse": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "Arrived to hotel": { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
};

const DEFAULT_STATUS_STYLE = { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30", dot: "bg-gray-400" };

// Factory colors for chips
const FACTORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  IDM: { bg: "bg-teal-500/15", text: "text-teal-300", border: "border-teal-500/25" },
  SESE: { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/25" },
  ZHONGSHAN: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/25" },
  ORBITA: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/25" },
  DONGNA: { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/25" },
  DONGFANG: { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/25" },
  ZHONGBAI: { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/25" },
};

const DEFAULT_FACTORY_COLOR = { bg: "bg-gray-500/15", text: "text-gray-300", border: "border-gray-500/25" };

type SortField = "factory" | "containerLoaded" | "shipmentNumber" | "containerNumber" | "delivery" | "loadingDate" | "vesselDepartureDate" | "etaNYPort" | "etaWarehouse" | "status";
type SortDirection = "asc" | "desc";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
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

function formatDateWithYear(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isGoogleSheet(url: string): boolean {
  return url.includes("docs.google.com/spreadsheets") || url.includes("sheets.google.com");
}

// Convert Google Drive share links to embeddable/thumbnail URLs
function getGoogleDriveImageUrl(url: string): string | null {
  if (url.includes("photos.google.com")) return null;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w400`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w400`;
  }
  return null;
}

function DocumentLink({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  if (!value || value === "N.A" || value === "N/A" || value === "-" || value === "") {
    return null;
  }
  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-blue-400/30 transition-all text-xs text-blue-400 group"
        onClick={(e) => e.stopPropagation()}
      >
        {icon || <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
        <span className="group-hover:underline">{label}</span>
        <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-70" />
      </a>
    );
  }
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

// Photo gallery component for Google Drive/Photos links
function PhotoGallery({ url, label }: { url: string; label: string }) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = getGoogleDriveImageUrl(url);

  if (!url || !isUrl(url)) return null;

  if (thumbnailUrl && !imageError) {
    return (
      <div className="space-y-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden border border-white/10 hover:border-blue-400/50 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={thumbnailUrl}
            alt={label}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          <ImageIcon className="h-3 w-3" />
          <span>{label}</span>
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-blue-400/30 transition-colors text-xs text-blue-400"
      onClick={(e) => e.stopPropagation()}
    >
      <ImageIcon className="h-4 w-4" />
      <span>{label}</span>
      <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
    </a>
  );
}

// Compact status step indicator
function StatusStepIndicator({ status }: { status: string }) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const statusStyle = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5">
            {STATUS_ORDER.map((step, i) => {
              const isReached = currentIndex >= 0 && i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? `w-4 ${statusStyle.dot}`
                      : isReached
                      ? `w-1.5 ${statusStyle.dot} opacity-50`
                      : "w-1.5 bg-white/10"
                  }`}
                />
              );
            })}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{status || "Unknown"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

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
          c.containerNumber.toLowerCase().includes(q) ||
          c.shipmentNumber.toLowerCase().includes(q)
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

      // Numeric sorting for shipment numbers
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
  const hasActiveFilters = searchQuery !== "" || factoryFilter !== "all" || statusFilter !== "all";

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFactoryFilter("all");
    setStatusFilter("all");
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 text-cyan-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-cyan-400" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6 px-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-32" />
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

  // Expanded detail section for a container
  const renderExpandedDetail = (container: ContainerScheduleItem) => {
    const documents = [
      { value: container.bolCopy, label: "BOL Copy", icon: <ImageIcon className="h-3.5 w-3.5 shrink-0" />, isPhoto: true },
      { value: container.insurance, label: "Insurance", icon: <ImageIcon className="h-3.5 w-3.5 shrink-0" />, isPhoto: true },
      { value: container.productListWithPhotos, label: "Product List w/ Photos", icon: isGoogleSheet(container.productListWithPhotos || "") ? <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" />, isPhoto: false },
      { value: container.packingList, label: "Packing List", icon: <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />, isPhoto: false },
      { value: container.warehouseProofOfDelivery, label: "WH Proof of Delivery", icon: <FileText className="h-3.5 w-3.5 shrink-0" />, isPhoto: false },
    ];

    const availableDocs = documents.filter(d => d.value && d.value !== "-" && d.value !== "N.A" && d.value !== "N/A" && isUrl(d.value));
    const photoDocs = availableDocs.filter(d => d.isPhoto);
    const linkDocs = availableDocs.filter(d => !d.isPhoto);
    const hasProductDetails = container.productDetails && container.productDetails !== "-";

    return (
      <div className="px-6 py-5 space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Timeline dates + Product Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dates timeline */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Key Dates
            </p>
            <div className="space-y-2.5">
              {[
                { label: "Delivery", value: container.delivery },
                { label: "Loading", value: container.loadingDate },
                { label: "Departure", value: container.vesselDepartureDate },
                { label: "ETA NY Port", value: container.etaNYPort },
                { label: "ETA Warehouse", value: container.etaWarehouse },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm text-white font-medium tabular-nums">
                    {formatDateWithYear(value) || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              Product Details
            </p>
            <p className="text-sm text-white leading-relaxed">
              {hasProductDetails ? container.productDetails : "No details available"}
            </p>
          </div>
        </div>

        {/* Photos */}
        {photoDocs.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Photos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {photoDocs.map((doc) => (
                <PhotoGallery key={doc.label} url={doc.value} label={doc.label} />
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {linkDocs.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Documents</p>
            <div className="flex flex-wrap gap-2">
              {linkDocs.map((doc) => (
                <DocumentLink key={doc.label} value={doc.value} label={doc.label} icon={doc.icon} />
              ))}
            </div>
          </div>
        )}

        {availableDocs.length === 0 && (
          <p className="text-xs text-muted-foreground/50 py-2">No documents or photos available for this container.</p>
        )}
      </div>
    );
  };

  // Column header helper
  const ColHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  // Table content (shared between normal and fullscreen modes)
  const tableContent = (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <ColHeader field="factory" label="Factory" className="w-[100px]" />
              <ColHeader field="containerLoaded" label="Contents" className="min-w-[200px]" />
              <ColHeader field="shipmentNumber" label="Ship #" className="w-[70px]" />
              <ColHeader field="containerNumber" label="Cont #" className="w-[90px]" />
              <ColHeader field="vesselDepartureDate" label="Departs" className="w-[85px]" />
              <ColHeader field="etaNYPort" label="ETA Port" className="w-[85px]" />
              <ColHeader field="etaWarehouse" label="ETA WH" className="w-[85px]" />
              <ColHeader field="status" label="Status" className="w-[170px]" />
              <th className="w-[40px] px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No containers match your filters</p>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1">
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredContainers.map((container, index) => {
                const factoryColor = FACTORY_COLORS[container.factory] || DEFAULT_FACTORY_COLOR;
                const statusStyle = STATUS_STYLES[container.status] || DEFAULT_STATUS_STYLE;
                const isExpanded = expandedRow === container.id;
                const hasDocuments = [container.bolCopy, container.insurance, container.productListWithPhotos, container.packingList, container.warehouseProofOfDelivery].some(
                  (v) => v && isUrl(v)
                );

                return (
                  <TooltipProvider key={container.id}>
                    <tr
                      className={`border-b border-white/[0.04] transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-white/[0.04]"
                          : index % 2 === 0
                          ? "hover:bg-white/[0.03]"
                          : "bg-white/[0.015] hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : container.id)}
                    >
                      {/* Factory */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${factoryColor.bg} ${factoryColor.text} ${factoryColor.border}`}>
                          {container.factory}
                        </span>
                      </td>

                      {/* Contents */}
                      <td className="px-4 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[13px] text-white leading-tight line-clamp-2 block">
                              {container.containerLoaded}
                            </span>
                          </TooltipTrigger>
                          {container.containerLoaded.length > 50 && (
                            <TooltipContent side="top" className="max-w-md">
                              <p className="text-sm">{container.containerLoaded}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>

                      {/* Ship # */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-white tabular-nums font-medium">{container.shipmentNumber}</span>
                      </td>

                      {/* Cont # */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-muted-foreground font-mono text-[12px]">{container.containerNumber || "—"}</span>
                      </td>

                      {/* Departs */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-muted-foreground tabular-nums">{formatDate(container.vesselDepartureDate)}</span>
                      </td>

                      {/* ETA Port */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-muted-foreground tabular-nums">{formatDate(container.etaNYPort)}</span>
                      </td>

                      {/* ETA WH */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-muted-foreground tabular-nums">{formatDate(container.etaWarehouse)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {container.status ? (
                            <>
                              <span className={`text-[12px] font-medium ${statusStyle.text}`}>
                                {container.status}
                              </span>
                              <StatusStepIndicator status={container.status} />
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>

                      {/* Expand */}
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          {hasDocuments && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/10">
                              <span className="text-[10px] text-blue-400 font-medium">
                                {[container.bolCopy, container.insurance, container.productListWithPhotos, container.packingList, container.warehouseProofOfDelivery].filter(v => v && isUrl(v)).length}
                              </span>
                            </div>
                          )}
                          <ChevronRight className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={9} className="p-0 border-b border-white/[0.04]">
                          <div className="border-l-2 border-cyan-400/30 ml-4">
                            {renderExpandedDetail(container)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </TooltipProvider>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-2 p-3">
        {filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Package className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No containers match your filters</p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          filteredContainers.map((container) => {
            const factoryColor = FACTORY_COLORS[container.factory] || DEFAULT_FACTORY_COLOR;
            const statusStyle = STATUS_STYLES[container.status] || DEFAULT_STATUS_STYLE;
            const isExpanded = expandedRow === container.id;

            return (
              <div
                key={container.id}
                className={`rounded-lg border overflow-hidden transition-colors ${
                  isExpanded ? "border-cyan-400/20 bg-white/[0.03]" : "border-white/[0.06] bg-white/[0.015]"
                }`}
              >
                <div
                  className="p-3.5 cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : container.id)}
                >
                  {/* Top row: Factory + Status + Chevron */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${factoryColor.bg} ${factoryColor.text} ${factoryColor.border}`}>
                        {container.factory}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        #{container.shipmentNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {container.status && (
                        <span className={`text-[10px] font-medium ${statusStyle.text}`}>
                          {container.status}
                        </span>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {/* Contents */}
                  <p className="text-[13px] font-medium text-white mb-2.5 leading-tight line-clamp-2">
                    {container.containerLoaded}
                  </p>

                  {/* Status step indicator */}
                  {container.status && (
                    <div className="mb-2.5">
                      <StatusStepIndicator status={container.status} />
                    </div>
                  )}

                  {/* Date grid */}
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">Departs</p>
                      <p className="text-[12px] text-white tabular-nums">{formatDate(container.vesselDepartureDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">ETA Port</p>
                      <p className="text-[12px] text-white tabular-nums">{formatDate(container.etaNYPort)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">ETA WH</p>
                      <p className="text-[12px] text-white tabular-nums">{formatDate(container.etaWarehouse)}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded mobile detail */}
                {isExpanded && (
                  <div className="border-t border-white/5">
                    {renderExpandedDetail(container)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  // Compact inline filters
  const filtersSection = (
    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search factory, contents, container #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/40 focus:border-cyan-400/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={factoryFilter} onValueChange={setFactoryFilter}>
          <SelectTrigger className="w-full sm:w-[140px] bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm">
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
          <SelectTrigger className="w-full sm:w-[180px] bg-white/[0.04] border-white/[0.08] text-white h-9 text-sm">
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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-white h-9 px-2 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#12121a] shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-400" />
              Containers
              <span className="text-muted-foreground font-normal text-sm ml-1">({filteredContainers.length})</span>
            </h2>

            {/* Inline summary stats */}
            <div className="hidden md:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Ship className="h-3.5 w-3.5" />
                <span className="font-medium">{shippedCount}</span> shipped
              </span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5 text-violet-400">
                <Anchor className="h-3.5 w-3.5" />
                <span className="font-medium">{atPortCount}</span> at port
              </span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Warehouse className="h-3.5 w-3.5" />
                <span className="font-medium">{warehouseCount}</span> delivered
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="text-xs text-muted-foreground hover:text-white gap-1.5 h-8 px-2.5"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>

        {/* Fullscreen Filters */}
        <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#12121a]/80 shrink-0">
          {filtersSection}
        </div>

        {/* Fullscreen Table */}
        <div className="flex-1 overflow-y-auto">
          {tableContent}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Summary Stats - inline row instead of separate cards */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
            <Package className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white tabular-nums">{summary.total}</span>
            <span className="text-xs text-muted-foreground">containers</span>
          </div>
        </div>

        <div className="h-5 w-px bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <Ship className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400 tabular-nums">{shippedCount}</span>
          <span className="text-xs text-muted-foreground">shipped</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Anchor className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-sm font-semibold text-violet-400 tabular-nums">{atPortCount}</span>
          <span className="text-xs text-muted-foreground">at port</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Warehouse className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400 tabular-nums">{warehouseCount}</span>
          <span className="text-xs text-muted-foreground">delivered</span>
        </div>
      </div>

      {/* Main Table Card - filters integrated into header */}
      <Card className="border-white/[0.08] bg-[#12121a] overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {hasActiveFilters
                ? `${filteredContainers.length} of ${containers.length} containers`
                : `All ${containers.length} containers`
              }
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="text-xs text-muted-foreground hover:text-white gap-1.5 h-7 px-2"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </Button>
          </div>
          {filtersSection}
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {tableContent}
        </CardContent>
      </Card>
    </div>
  );
}
