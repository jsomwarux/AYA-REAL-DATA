import { useState, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Files,
  File,
  FolderOpen,
  Search,
  ChevronRight,
  Download,
  X,
  ExternalLink,
  Eye,
  Presentation,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { VendorFolder, VendorInvoicesSummary, DriveFile } from "@/lib/api";

interface VendorInvoicesDashboardProps {
  vendors: VendorFolder[];
  summary: VendorInvoicesSummary;
  isLoading: boolean;
}

function formatFileSize(bytes: string | null): string {
  if (!bytes) return "—";
  const size = parseInt(bytes, 10);
  if (isNaN(size)) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isGoogleNativeType(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps.");
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") {
    return <File className="h-4 w-4 text-red-400 shrink-0" />;
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return <FileSpreadsheet className="h-4 w-4 text-green-400 shrink-0" />;
  }
  if (mimeType === "application/vnd.google-apps.document") {
    return <FileText className="h-4 w-4 text-blue-400 shrink-0" />;
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    return <Presentation className="h-4 w-4 text-orange-400 shrink-0" />;
  }
  if (mimeType.startsWith("image/")) {
    return <File className="h-4 w-4 text-blue-400 shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function isViewableInline(mimeType: string): boolean {
  return mimeType === "application/pdf" || isGoogleNativeType(mimeType);
}

// ── Summary Stats ───────────────────────────────────────────────────────────

function SummaryStats({ summary, isLoading }: { summary: VendorInvoicesSummary; isLoading: boolean }) {
  const pdfCount = summary.byMimeType?.["application/pdf"] || 0;

  const stats = [
    {
      label: "Total Vendors",
      value: summary.totalVendors,
      icon: <FolderOpen className="h-4 w-4" />,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      label: "Total Documents",
      value: summary.totalFiles,
      icon: <Files className="h-4 w-4" />,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "PDFs",
      value: pdfCount,
      icon: <File className="h-4 w-4" />,
      color: "text-teal-400",
      bg: "bg-teal-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-white/10 bg-[#12121a]">
          <CardContent className="flex items-center gap-3 p-3">
            <div className={cn("rounded-lg p-2", stat.bg)}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-6 w-12 mb-1" />
              ) : (
                <p className={cn("text-lg font-bold", stat.color)}>{stat.value.toLocaleString()}</p>
              )}
              <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── File Row ────────────────────────────────────────────────────────────────

function FileRow({ file, onView }: { file: DriveFile; onView: (file: DriveFile) => void }) {
  const viewable = isViewableInline(file.mimeType);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors border-t border-white/5 first:border-t-0">
      {getFileIcon(file.mimeType)}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 truncate">{file.name}</p>
      </div>
      <span className="text-[11px] text-muted-foreground hidden sm:block w-20 text-right shrink-0">
        {formatFileSize(file.size)}
      </span>
      <span className="text-[11px] text-muted-foreground hidden md:block w-28 text-right shrink-0">
        {formatDate(file.modifiedTime)}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {viewable ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
            onClick={() => onView(file)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
        ) : (
          <a
            href={`/api/sheets/drive-file/${file.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-7 px-2 text-xs text-muted-foreground hover:text-white rounded-md hover:bg-white/5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Open
          </a>
        )}
      </div>
    </div>
  );
}

// ── Vendor Accordion Row ────────────────────────────────────────────────────

function VendorRow({
  vendor,
  onViewFile,
  searchQuery,
}: {
  vendor: VendorFolder;
  onViewFile: (file: DriveFile, vendorName: string) => void;
  searchQuery: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // If searching, auto-expand vendors with matching files
  const hasMatchingFiles = useMemo(() => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return vendor.files.some((f) => f.name.toLowerCase().includes(q));
  }, [searchQuery, vendor.files]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return vendor.files;
    const q = searchQuery.toLowerCase();
    return vendor.files.filter((f) => f.name.toLowerCase().includes(q));
  }, [searchQuery, vendor.files]);

  const effectiveOpen = isOpen || hasMatchingFiles;
  const displayFiles = searchQuery ? filteredFiles : vendor.files;

  const pdfCount = vendor.files.filter((f) => f.mimeType === "application/pdf").length;

  return (
    <Collapsible open={effectiveOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left group">
          <FolderOpen className={cn("h-5 w-5 shrink-0 transition-colors", effectiveOpen ? "text-yellow-400" : "text-muted-foreground group-hover:text-yellow-400/70")} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-white/90 truncate block">{vendor.name}</span>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {pdfCount > 0 && (
              <span className="inline-flex items-center gap-1 mr-2">
                <File className="h-3 w-3 text-red-400/60" />
                {pdfCount}
              </span>
            )}
            {vendor.fileCount} {vendor.fileCount === 1 ? "file" : "files"}
          </span>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", effectiveOpen && "rotate-90")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-white/5 bg-white/[0.01]">
          {displayFiles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground italic">No matching files</div>
          ) : (
            displayFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onView={(f) => onViewFile(f, vendor.name)}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── PDF Viewer Dialog ───────────────────────────────────────────────────────

function PdfViewerDialog({
  file,
  vendorName,
  isOpen,
  onClose,
}: {
  file: DriveFile | null;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0 gap-0 bg-[#0a0a0f] border-white/10 [&>button]:hidden">
        <DialogHeader className="px-4 py-3 border-b border-white/10 flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <DialogTitle className="text-sm font-medium text-white truncate">
              {file.name}
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {vendorName} {file.size ? `\u00B7 ${formatFileSize(file.size)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/api/sheets/drive-file/${file.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-8 px-3 text-xs rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </a>
            {file.webViewUrl && (
              <a
                href={file.webViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-8 px-3 text-xs rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Drive
              </a>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <iframe
            src={`/api/sheets/drive-file/${file.id}`}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-white/10 bg-[#12121a]">
            <CardContent className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full mb-4 rounded-lg" />
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="p-0">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function VendorInvoicesDashboard({ vendors, summary, isLoading }: VendorInvoicesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingFile, setViewingFile] = useState<{ file: DriveFile; vendorName: string } | null>(null);

  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.files.some((f) => f.name.toLowerCase().includes(q))
    );
  }, [vendors, searchQuery]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      {/* Summary stats */}
      <SummaryStats summary={summary} isLoading={isLoading} />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors or file names..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 bg-[#12121a] border-white/10 text-white placeholder:text-muted-foreground focus:border-yellow-400/30 focus:ring-yellow-400/20"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Vendor list */}
      <Card className="border-white/10 bg-[#12121a] overflow-hidden">
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No vendors or files match your search" : "No vendor folders found"}
              </p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-yellow-400 hover:text-yellow-300"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredVendors.map((vendor) => (
                <VendorRow
                  key={vendor.folderId}
                  vendor={vendor}
                  onViewFile={(file, vendorName) => setViewingFile({ file, vendorName })}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search result count */}
      {searchQuery && filteredVendors.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Showing {filteredVendors.length} of {vendors.length} vendors
        </p>
      )}

      {/* PDF Viewer Dialog */}
      <PdfViewerDialog
        file={viewingFile?.file || null}
        vendorName={viewingFile?.vendorName || ""}
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}
