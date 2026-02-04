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

function isUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isGoogleSheet(url: string): boolean {
  return url.includes("docs.google.com/spreadsheets") || url.includes("sheets.google.com");
}

// Convert Google Drive share links to embeddable/thumbnail URLs
function getGoogleDriveImageUrl(url: string): string | null {
  // Google Photos album links can't be easily embedded - return null
  if (url.includes("photos.google.com")) return null;
  // Google Drive file: https://drive.google.com/file/d/FILE_ID/view
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w400`;
  }
  // Google Drive open: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w400`;
  }
  return null;
}

function DocumentLink({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  if (!value || value === "N.A" || value === "N/A" || value === "-" || value === "") {
    return <span className="text-muted-foreground/50 text-xs">-</span>;
  }
  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group"
        onClick={(e) => e.stopPropagation()}
      >
        {icon || <ExternalLink className="h-3 w-3 shrink-0" />}
        <span className="group-hover:underline">{label}</span>
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

  // If we can generate a thumbnail, show the image
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

  // For Google Photos albums or failed thumbnails, show a link with photo icon
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

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField]);

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

  // Expanded detail section for a container
  const renderExpandedDetail = (container: ContainerScheduleItem) => {
    const hasBol = container.bolCopy && isUrl(container.bolCopy);
    const hasInsurance = container.insurance && isUrl(container.insurance);
    const hasProductPhotos = container.productListWithPhotos && isUrl(container.productListWithPhotos);
    const hasPackingList = container.packingList && isUrl(container.packingList);
    const hasProductDetails = container.productDetails && container.productDetails !== "-";
    const hasWarehouseProof = container.warehouseProofOfDelivery && isUrl(container.warehouseProofOfDelivery);

    return (
      <div className="px-6 py-5 space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Row 1: Key Dates & Product Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Delivery Date</p>
            <p className="text-sm text-white font-medium">{formatDate(container.delivery) || "-"}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Loading Date</p>
            <p className="text-sm text-white font-medium">{formatDate(container.loadingDate) || "-"}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 md:col-span-2">
            <p className="text-[11px] text-muted-foreground mb-1">Product Details</p>
            <p className="text-sm text-white">{hasProductDetails ? container.productDetails : "-"}</p>
          </div>
        </div>

        {/* Row 2: Photos (BOL & Insurance - columns K & L) */}
        {(hasBol || hasInsurance) && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">Photos & Documents</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hasBol && (
                <PhotoGallery url={container.bolCopy} label="BOL Copy" />
              )}
              {hasInsurance && (
                <PhotoGallery url={container.insurance} label="Insurance" />
              )}
            </div>
          </div>
        )}

        {/* Row 3: Spreadsheet Links (columns M & N) + other docs */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">Spreadsheets & Documents</p>
          <div className="flex flex-wrap gap-3">
            {hasProductPhotos && (
              <DocumentLink
                value={container.productListWithPhotos}
                label="Product List w/ Photos"
                icon={isGoogleSheet(container.productListWithPhotos) ? <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
              />
            )}
            {hasPackingList && (
              <DocumentLink
                value={container.packingList}
                label="Packing List"
                icon={<FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />}
              />
            )}
            {hasWarehouseProof && (
              <DocumentLink
                value={container.warehouseProofOfDelivery}
                label="Warehouse Proof of Delivery"
                icon={<FileText className="h-3.5 w-3.5 shrink-0" />}
              />
            )}
          </div>
          {!hasProductPhotos && !hasPackingList && !hasWarehouseProof && (
            <p className="text-xs text-muted-foreground/50">No documents available</p>
          )}
        </div>
      </div>
    );
  };

  // Table content (shared between normal and fullscreen modes)
  const tableContent = (
    <>
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
              <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-3 w-[50px]">
              </th>
            </tr>
          </thead>
          {filteredContainers.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No containers match your filters.
                </td>
              </tr>
            </tbody>
          ) : (
            filteredContainers.map((container) => {
              const factoryColor = FACTORY_COLORS[container.factory] || DEFAULT_FACTORY_COLOR;
              const statusStyle = STATUS_STYLES[container.status] || DEFAULT_STATUS_STYLE;
              const isExpanded = expandedRow === container.id;
              const hasDocuments = [container.bolCopy, container.insurance, container.productListWithPhotos, container.packingList, container.warehouseProofOfDelivery].some(
                (v) => v && isUrl(v)
              );

              return (
                <tbody key={container.id}>
                  <tr
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
                      <div className="flex items-center gap-1.5">
                        {hasDocuments && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {[container.bolCopy, container.insurance, container.productListWithPhotos, container.packingList, container.warehouseProofOfDelivery].filter(v => v && isUrl(v)).length}
                          </span>
                        )}
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr className="border-b border-white/5 bg-white/[0.015]">
                      <td colSpan={9} className="p-0">
                        {renderExpandedDetail(container)}
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })
          )}
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
            const isExpanded = expandedRow === container.id;

            return (
              <div
                key={container.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                <div
                  className="p-4 space-y-3 cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : container.id)}
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
                    <div className="flex items-center gap-2">
                      {container.status && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {container.status}
                        </span>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
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

  // Filters section
  const filtersSection = (
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
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#12121a] shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Containers ({filteredContainers.length})</h2>
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
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="text-xs text-muted-foreground hover:text-white gap-1.5 h-7 px-2"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </Button>
        </div>

        {/* Fullscreen Filters */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#12121a] shrink-0">
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
          {filtersSection}
        </CardContent>
      </Card>

      {/* Containers Table */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center justify-between">
            <span>Containers ({filteredContainers.length})</span>
            <div className="flex items-center gap-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="text-xs text-muted-foreground hover:text-white gap-1.5 h-7 px-2"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tableContent}
        </CardContent>
      </Card>
    </div>
  );
}
