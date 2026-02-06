import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  BedDouble,
  Building,
  Accessibility,
  LayoutGrid,
  X,
  Filter,
  Check,
  ShowerHead,
  DoorOpen,
  Tv,
  Lamp,
  Bath,
  SlidersHorizontal,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoomOverviewItem, RoomOverviewSummary } from "@/lib/api";

// Room type color map
const ROOM_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Face to Face": { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/25" },
  "Serenity King Chamber": { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/25" },
  "Elegance King Suite": { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/25" },
  "Elegance King Suite ADA": { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/25" },
  "Dual Comfort Suite": { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/25" },
  "Deluxe Queen Oasis": { bg: "bg-teal-500/15", text: "text-teal-300", border: "border-teal-500/25" },
  "King's Secret Retreat": { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/25" },
  "Majestic King": { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/25" },
  "President Suite": { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/25" },
  "Queen Deluxe": { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/25" },
  "Queen's Secret Retreat": { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/25" },
};
const DEFAULT_ROOM_TYPE_COLOR = { bg: "bg-gray-500/15", text: "text-gray-300", border: "border-gray-500/25" };

// Size category colors
const SIZE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/25" },
  M: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/25" },
  L: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" },
};
const DEFAULT_SIZE_COLOR = { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/25" };

// Feature definitions for the dot display and toggle filters
const FEATURE_DEFS = [
  { key: "connectingDoor" as const, label: "Connecting Door", short: "Connect" },
  { key: "showerWindow" as const, label: "Shower Window", short: "Shower Win" },
  { key: "mossWall" as const, label: "Moss Wall", short: "Moss" },
  { key: "mirrorSlidingDoor" as const, label: "Mirror Sliding Door", short: "Mirror" },
  { key: "moxyBar" as const, label: "Moxy Bar", short: "Moxy" },
  { key: "speakeasy" as const, label: "Speakeasy", short: "Speak" },
  { key: "partyBoxHeadboard" as const, label: "Party Box Headboard", short: "Party Box" },
];

// Spec filter definitions (non-boolean fields for dropdown filters)
const SPEC_FILTER_DEFS = [
  { key: "sinkStyle" as const, label: "Sink Style" },
  { key: "sinkSize" as const, label: "Sink Size" },
  { key: "showerWithGlassDoor" as const, label: "Shower Type" },
  { key: "miniBarSize" as const, label: "Mini Bar" },
  { key: "curtainType" as const, label: "Curtain Type" },
  { key: "nightStands" as const, label: "Night Stands" },
  { key: "tvSize" as const, label: "TV Size" },
];

type SortField = "floor" | "roomNumber" | "area" | "sizeCategory" | "roomType" | "bedSize" | "ada";
type SortDirection = "asc" | "desc";
type TriState = "all" | "Yes" | "No";

// Feature dot indicator
function FeatureDot({ value, label }: { value: string; label: string }) {
  const lower = (value || "").toLowerCase();
  const isYes = lower === "yes";
  const isNo = lower === "no";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex h-2 w-2 rounded-full shrink-0 ${
              isYes ? "bg-emerald-400" : isNo ? "bg-white/15" : "bg-amber-400"
            }`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>
            {label}: <span className={isYes ? "text-emerald-400" : isNo ? "text-muted-foreground" : "text-amber-400"}>{value || "N/A"}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Feature badges row for the table
function FeatureBadges({ room }: { room: RoomOverviewItem }) {
  const activeCount = FEATURE_DEFS.filter(
    (f) => (room[f.key] || "").toLowerCase() === "yes"
  ).length;

  return (
    <div className="flex items-center gap-1">
      {FEATURE_DEFS.map((f) => (
        <FeatureDot key={f.key} value={room[f.key]} label={f.label} />
      ))}
      <span className="text-[10px] text-muted-foreground/50 ml-1 tabular-nums">
        {activeCount}/{FEATURE_DEFS.length}
      </span>
    </div>
  );
}

// Feature toggle chip — cycles through All → Yes → No → All
function FeatureToggleChip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const cycle = () => {
    if (value === "all") onChange("Yes");
    else if (value === "Yes") onChange("No");
    else onChange("all");
  };

  return (
    <button
      onClick={cycle}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all select-none ${
        value === "Yes"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : value === "No"
          ? "bg-red-500/10 text-red-400/80 border-red-500/20"
          : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:border-white/10"
      }`}
    >
      {value === "Yes" && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      {value === "No" && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-400/60" />}
      {label}
    </button>
  );
}

// Yes/No value display with colored indicator
function YesNoValue({ value }: { value: string; label?: string }) {
  const lower = (value || "").toLowerCase();
  const isYes = lower === "yes";
  const isNo = lower === "no";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          isYes ? "bg-emerald-400" : isNo ? "bg-white/15" : "bg-amber-400"
        }`}
      />
      <span className={`text-sm ${isYes ? "text-emerald-300" : isNo ? "text-muted-foreground" : "text-amber-300"}`}>
        {value || "N/A"}
      </span>
    </span>
  );
}

// Detail row for a spec item
function SpecRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children || <span className="text-sm text-white">{value || "\u2014"}</span>}
    </div>
  );
}

// Room detail dialog
function RoomDetailDialog({
  room,
  open,
  onClose,
}: {
  room: RoomOverviewItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!room) return null;

  const roomTypeColor = ROOM_TYPE_COLORS[room.roomType] || DEFAULT_ROOM_TYPE_COLOR;
  const sizeColor = SIZE_COLORS[room.sizeCategory] || DEFAULT_SIZE_COLOR;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#12121a] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">Room {room.roomNumber}</span>
            <span className="text-muted-foreground">Floor {room.floor}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sizeColor.bg} ${sizeColor.text} ${sizeColor.border}`}>
              {room.sizeCategory}
            </span>
            {room.ada.toLowerCase() === "yes" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                ADA
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Room type + basics */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold border ${roomTypeColor.bg} ${roomTypeColor.text} ${roomTypeColor.border}`}>
              {room.roomType}
            </span>
            <span className="text-sm text-muted-foreground">{room.area} sq ft</span>
            <span className="text-sm text-muted-foreground">{room.bedSize}</span>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bathroom */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShowerHead className="h-3 w-3" />
                Bathroom
              </p>
              <div className="space-y-0.5">
                <SpecRow label="Sink Style" value={room.sinkStyle} />
                <SpecRow label="Sink Size" value={room.sinkSize} />
                <SpecRow label="Shower / Glass Door" value={room.showerWithGlassDoor} />
                <SpecRow label="Shower Window">
                  <YesNoValue value={room.showerWindow} />
                </SpecRow>
              </div>
            </div>

            {/* Room Features */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DoorOpen className="h-3 w-3" />
                Room Features
              </p>
              <div className="space-y-0.5">
                <SpecRow label="Connecting Door">
                  <YesNoValue value={room.connectingDoor} />
                </SpecRow>
                <SpecRow label="Moss Wall">
                  <YesNoValue value={room.mossWall} />
                </SpecRow>
                <SpecRow label="Mirror Sliding Door">
                  <YesNoValue value={room.mirrorSlidingDoor} />
                </SpecRow>
                <SpecRow label="Moxy Bar">
                  <YesNoValue value={room.moxyBar} />
                </SpecRow>
                <SpecRow label="Mini Bar" value={room.miniBarSize} />
                <SpecRow label="Speakeasy">
                  <YesNoValue value={room.speakeasy} />
                </SpecRow>
                <SpecRow label="Party Box Headboard">
                  <YesNoValue value={room.partyBoxHeadboard} />
                </SpecRow>
              </div>
            </div>

            {/* Furnishing */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4 md:col-span-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lamp className="h-3 w-3" />
                Furnishing
              </p>
              <div className="grid grid-cols-2 gap-x-8">
                <div className="space-y-0.5">
                  <SpecRow label="Curtain Type" value={room.curtainType} />
                  <SpecRow label="Night Stands" value={room.nightStands} />
                </div>
                <div className="space-y-0.5">
                  <SpecRow label="TV Size" value={room.tvSize} />
                  <SpecRow label="Bed Size" value={room.bedSize} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RoomSpecsDashboardProps {
  rooms: RoomOverviewItem[];
  summary: RoomOverviewSummary;
  isLoading: boolean;
}

export function RoomSpecsDashboard({ rooms, summary, isLoading }: RoomSpecsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // Primary filters
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
  const [bedSizeFilter, setBedSizeFilter] = useState<string>("all");
  const [adaFilter, setAdaFilter] = useState<string>("all");
  // Feature toggle filters (Yes/No/All)
  const [connectingDoorFilter, setConnectingDoorFilter] = useState<TriState>("all");
  const [showerWindowFilter, setShowerWindowFilter] = useState<TriState>("all");
  const [mossWallFilter, setMossWallFilter] = useState<TriState>("all");
  const [mirrorSlidingDoorFilter, setMirrorSlidingDoorFilter] = useState<TriState>("all");
  const [moxyBarFilter, setMoxyBarFilter] = useState<TriState>("all");
  const [speakeasyFilter, setSpeakeasyFilter] = useState<TriState>("all");
  const [partyBoxFilter, setPartyBoxFilter] = useState<TriState>("all");
  // Spec dropdown filters
  const [sinkStyleFilter, setSinkStyleFilter] = useState<string>("all");
  const [sinkSizeFilter, setSinkSizeFilter] = useState<string>("all");
  const [showerTypeFilter, setShowerTypeFilter] = useState<string>("all");
  const [miniBarFilter, setMiniBarFilter] = useState<string>("all");
  const [curtainTypeFilter, setCurtainTypeFilter] = useState<string>("all");
  const [nightStandsFilter, setNightStandsFilter] = useState<string>("all");
  const [tvSizeFilter, setTvSizeFilter] = useState<string>("all");
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("roomNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomOverviewItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Feature filter map for easy iteration
  const featureFilters: { key: keyof RoomOverviewItem; label: string; value: TriState; setter: (v: TriState) => void }[] = [
    { key: "connectingDoor", label: "Connect", value: connectingDoorFilter, setter: setConnectingDoorFilter },
    { key: "showerWindow", label: "Shower Win", value: showerWindowFilter, setter: setShowerWindowFilter },
    { key: "mossWall", label: "Moss Wall", value: mossWallFilter, setter: setMossWallFilter },
    { key: "mirrorSlidingDoor", label: "Mirror Door", value: mirrorSlidingDoorFilter, setter: setMirrorSlidingDoorFilter },
    { key: "moxyBar", label: "Moxy Bar", value: moxyBarFilter, setter: setMoxyBarFilter },
    { key: "speakeasy", label: "Speakeasy", value: speakeasyFilter, setter: setSpeakeasyFilter },
    { key: "partyBoxHeadboard", label: "Party Box", value: partyBoxFilter, setter: setPartyBoxFilter },
  ];

  // Spec filter map for easy iteration
  const specFilters: { key: keyof RoomOverviewItem; label: string; value: string; setter: (v: string) => void }[] = [
    { key: "sinkStyle", label: "Sink Style", value: sinkStyleFilter, setter: setSinkStyleFilter },
    { key: "sinkSize", label: "Sink Size", value: sinkSizeFilter, setter: setSinkSizeFilter },
    { key: "showerWithGlassDoor", label: "Shower Type", value: showerTypeFilter, setter: setShowerTypeFilter },
    { key: "miniBarSize", label: "Mini Bar", value: miniBarFilter, setter: setMiniBarFilter },
    { key: "curtainType", label: "Curtain", value: curtainTypeFilter, setter: setCurtainTypeFilter },
    { key: "nightStands", label: "Night Stands", value: nightStandsFilter, setter: setNightStandsFilter },
    { key: "tvSize", label: "TV Size", value: tvSizeFilter, setter: setTvSizeFilter },
  ];

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

  // Filter option lists
  const floors = useMemo(() => {
    return [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  }, [rooms]);

  const roomTypes = useMemo(() => {
    return [...new Set(rooms.map((r) => r.roomType).filter(Boolean))].sort();
  }, [rooms]);

  const bedSizes = useMemo(() => {
    return [...new Set(rooms.map((r) => r.bedSize).filter(Boolean))].sort();
  }, [rooms]);

  // Unique values for spec filters
  const specUniqueValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const sf of specFilters) {
      const vals = [...new Set(rooms.map((r) => String(r[sf.key] || "")).filter(Boolean))].sort();
      map[sf.key as string] = vals;
    }
    return map;
  }, [rooms]);

  // Count active advanced filters
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    for (const ff of featureFilters) {
      if (ff.value !== "all") count++;
    }
    for (const sf of specFilters) {
      if (sf.value !== "all") count++;
    }
    return count;
  }, [connectingDoorFilter, showerWindowFilter, mossWallFilter, mirrorSlidingDoorFilter, moxyBarFilter, speakeasyFilter, partyBoxFilter, sinkStyleFilter, sinkSizeFilter, showerTypeFilter, miniBarFilter, curtainTypeFilter, nightStandsFilter, tvSizeFilter]);

  // Filtered and sorted
  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.roomNumber.toString().includes(q) ||
          r.roomType.toLowerCase().includes(q) ||
          r.bedSize.toLowerCase().includes(q) ||
          r.sinkStyle.toLowerCase().includes(q) ||
          r.curtainType.toLowerCase().includes(q) ||
          r.showerWithGlassDoor.toLowerCase().includes(q) ||
          r.miniBarSize.toLowerCase().includes(q) ||
          r.nightStands.toLowerCase().includes(q) ||
          r.tvSize.toLowerCase().includes(q) ||
          r.sinkSize.toLowerCase().includes(q)
      );
    }

    // Primary filters
    if (floorFilter !== "all") result = result.filter((r) => r.floor.toString() === floorFilter);
    if (sizeCategoryFilter !== "all") result = result.filter((r) => r.sizeCategory === sizeCategoryFilter);
    if (roomTypeFilter !== "all") result = result.filter((r) => r.roomType === roomTypeFilter);
    if (bedSizeFilter !== "all") result = result.filter((r) => r.bedSize === bedSizeFilter);
    if (adaFilter !== "all") result = result.filter((r) => r.ada.toLowerCase() === adaFilter.toLowerCase());

    // Feature toggle filters
    for (const ff of featureFilters) {
      if (ff.value !== "all") {
        result = result.filter((r) => (String(r[ff.key]) || "").toLowerCase() === ff.value.toLowerCase());
      }
    }

    // Spec dropdown filters
    for (const sf of specFilters) {
      if (sf.value !== "all") {
        result = result.filter((r) => String(r[sf.key]) === sf.value);
      }
    }

    result.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      if (sortField === "floor" || sortField === "roomNumber" || sortField === "area") {
        return (a[sortField] - b[sortField]) * dir;
      }

      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    });

    return result;
  }, [rooms, searchQuery, floorFilter, sizeCategoryFilter, roomTypeFilter, bedSizeFilter, adaFilter, connectingDoorFilter, showerWindowFilter, mossWallFilter, mirrorSlidingDoorFilter, moxyBarFilter, speakeasyFilter, partyBoxFilter, sinkStyleFilter, sinkSizeFilter, showerTypeFilter, miniBarFilter, curtainTypeFilter, nightStandsFilter, tvSizeFilter, sortField, sortDirection]);

  const hasActiveFilters =
    searchQuery !== "" ||
    floorFilter !== "all" ||
    sizeCategoryFilter !== "all" ||
    roomTypeFilter !== "all" ||
    bedSizeFilter !== "all" ||
    adaFilter !== "all" ||
    advancedFilterCount > 0;

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFloorFilter("all");
    setSizeCategoryFilter("all");
    setRoomTypeFilter("all");
    setBedSizeFilter("all");
    setAdaFilter("all");
    // Feature filters
    setConnectingDoorFilter("all");
    setShowerWindowFilter("all");
    setMossWallFilter("all");
    setMirrorSlidingDoorFilter("all");
    setMoxyBarFilter("all");
    setSpeakeasyFilter("all");
    setPartyBoxFilter("all");
    // Spec filters
    setSinkStyleFilter("all");
    setSinkSizeFilter("all");
    setShowerTypeFilter("all");
    setMiniBarFilter("all");
    setCurtainTypeFilter("all");
    setNightStandsFilter("all");
    setTvSizeFilter("all");
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 text-cyan-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-cyan-400" />
    );
  };

  // Loading state
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
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expanded detail for a room
  const renderExpandedDetail = (room: RoomOverviewItem) => {
    return (
      <div className="px-5 py-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Bathroom */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShowerHead className="h-3 w-3" />
              Bathroom
            </p>
            <div className="space-y-0.5">
              <SpecRow label="Sink Style" value={room.sinkStyle} />
              <SpecRow label="Sink Size" value={room.sinkSize} />
              <SpecRow label="Shower / Glass Door" value={room.showerWithGlassDoor} />
              <SpecRow label="Shower Window">
                <YesNoValue value={room.showerWindow} />
              </SpecRow>
            </div>
          </div>

          {/* Room Features */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <DoorOpen className="h-3 w-3" />
              Room Features
            </p>
            <div className="space-y-0.5">
              <SpecRow label="Moss Wall">
                <YesNoValue value={room.mossWall} />
              </SpecRow>
              <SpecRow label="Mirror Sliding Door">
                <YesNoValue value={room.mirrorSlidingDoor} />
              </SpecRow>
              <SpecRow label="Moxy Bar">
                <YesNoValue value={room.moxyBar} />
              </SpecRow>
              <SpecRow label="Mini Bar" value={room.miniBarSize} />
              <SpecRow label="Speakeasy">
                <YesNoValue value={room.speakeasy} />
              </SpecRow>
              <SpecRow label="Party Box Headboard">
                <YesNoValue value={room.partyBoxHeadboard} />
              </SpecRow>
            </div>
          </div>

          {/* Furnishing */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Lamp className="h-3 w-3" />
              Furnishing
            </p>
            <div className="space-y-0.5">
              <SpecRow label="Connecting Door">
                <YesNoValue value={room.connectingDoor} />
              </SpecRow>
              <SpecRow label="Curtain Type" value={room.curtainType} />
              <SpecRow label="Night Stands" value={room.nightStands} />
              <SpecRow label="TV Size" value={room.tvSize} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRoom(room)}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            View Full Details
          </Button>
        </div>
      </div>
    );
  };

  // Column header helper
  const ColHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 cursor-pointer hover:text-white transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  // Table content
  const tableContent = (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <ColHeader field="floor" label="Floor" className="w-[52px]" />
              <ColHeader field="roomNumber" label="Room #" className="w-[70px]" />
              <ColHeader field="area" label="Area" className="w-[72px]" />
              <ColHeader field="sizeCategory" label="Size" className="w-[52px]" />
              <ColHeader field="roomType" label="Type" className="w-[180px]" />
              <ColHeader field="bedSize" label="Bed" className="w-[90px]" />
              <ColHeader field="ada" label="ADA" className="w-[46px]" />
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[120px] select-none">
                Features
              </th>
              <th className="w-[32px] px-1 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BedDouble className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No rooms match your filters</p>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1">
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRooms.map((room, index) => {
                const roomTypeColor = ROOM_TYPE_COLORS[room.roomType] || DEFAULT_ROOM_TYPE_COLOR;
                const sizeColor = SIZE_COLORS[room.sizeCategory] || DEFAULT_SIZE_COLOR;
                const isExpanded = expandedRow === room.id;
                const isAda = room.ada.toLowerCase() === "yes";

                return (
                  <TooltipProvider key={room.id}>
                    <tr
                      className={`border-b border-white/[0.04] transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-white/[0.04]"
                          : index % 2 === 0
                          ? "hover:bg-white/[0.03]"
                          : "bg-white/[0.015] hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : room.id)}
                    >
                      {/* Floor */}
                      <td className="px-3 py-2.5">
                        <span className="text-[13px] text-muted-foreground tabular-nums">{room.floor}</span>
                      </td>

                      {/* Room # */}
                      <td className="px-3 py-2.5">
                        <button
                          className="text-[13px] text-white font-semibold tabular-nums hover:text-cyan-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoom(room);
                          }}
                        >
                          {room.roomNumber}
                        </button>
                      </td>

                      {/* Area */}
                      <td className="px-3 py-2.5">
                        <span className="text-[13px] text-white tabular-nums">{room.area}</span>
                        <span className="text-[10px] text-muted-foreground/50 ml-0.5">ft²</span>
                      </td>

                      {/* Size */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center justify-center w-7 h-6 rounded text-[11px] font-bold border ${sizeColor.bg} ${sizeColor.text} ${sizeColor.border}`}>
                          {room.sizeCategory}
                        </span>
                      </td>

                      {/* Room Type */}
                      <td className="px-3 py-2.5 overflow-hidden">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap ${roomTypeColor.bg} ${roomTypeColor.text} ${roomTypeColor.border}`}>
                          {room.roomType}
                        </span>
                      </td>

                      {/* Bed Size */}
                      <td className="px-3 py-2.5">
                        <span className="text-[13px] text-muted-foreground">{room.bedSize}</span>
                      </td>

                      {/* ADA */}
                      <td className="px-3 py-2.5">
                        {isAda ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">{"\u2014"}</span>
                        )}
                      </td>

                      {/* Features */}
                      <td className="px-3 py-2.5">
                        <FeatureBadges room={room} />
                      </td>

                      {/* Expand */}
                      <td className="px-1 py-2.5">
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr className="bg-white/[0.02]">
                        <td colSpan={9} className="p-0 border-b border-white/[0.04]">
                          <div className="border-l-2 border-cyan-400/30 ml-3">
                            {renderExpandedDetail(room)}
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
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <BedDouble className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No rooms match your filters</p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const roomTypeColor = ROOM_TYPE_COLORS[room.roomType] || DEFAULT_ROOM_TYPE_COLOR;
            const sizeColor = SIZE_COLORS[room.sizeCategory] || DEFAULT_SIZE_COLOR;
            const isExpanded = expandedRow === room.id;
            const isAda = room.ada.toLowerCase() === "yes";

            return (
              <div
                key={room.id}
                className={`rounded-lg border overflow-hidden transition-colors ${
                  isExpanded ? "border-cyan-400/20 bg-white/[0.03]" : "border-white/[0.06] bg-white/[0.015]"
                }`}
              >
                <div
                  className="p-3.5 cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : room.id)}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">F{room.floor}</span>
                      <button
                        className="text-[13px] text-white font-semibold tabular-nums hover:text-cyan-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoom(room);
                        }}
                      >
                        #{room.roomNumber}
                      </button>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${sizeColor.bg} ${sizeColor.text} ${sizeColor.border}`}>
                        {room.sizeCategory}
                      </span>
                      {isAda && (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform shrink-0 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  {/* Room type */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roomTypeColor.bg} ${roomTypeColor.text} ${roomTypeColor.border}`}>
                      {room.roomType}
                    </span>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 mb-2 text-[12px]">
                    <span className="text-muted-foreground">{room.bedSize}</span>
                    <span className="text-white/10">|</span>
                    <span className="text-white tabular-nums">{room.area} <span className="text-muted-foreground/50">ft²</span></span>
                  </div>

                  {/* Feature dots */}
                  <FeatureBadges room={room} />
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-white/5">
                    {renderExpandedDetail(room)}
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
    <div className="space-y-2.5">
      {/* Row 1: Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search room #, type, bed, sink, curtain..."
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

      {/* Row 2: Primary filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="w-[120px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
            <SelectValue placeholder="All Floors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={f.toString()}>
                Floor {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sizeCategoryFilter} onValueChange={setSizeCategoryFilter}>
          <SelectTrigger className="w-[110px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
            <SelectValue placeholder="All Sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="S">S - Small</SelectItem>
            <SelectItem value="M">M - Medium</SelectItem>
            <SelectItem value="L">L - Large</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
          <SelectTrigger className="w-[180px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {roomTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={bedSizeFilter} onValueChange={setBedSizeFilter}>
          <SelectTrigger className="w-[130px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
            <SelectValue placeholder="All Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Beds</SelectItem>
            {bedSizes.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={adaFilter} onValueChange={setAdaFilter}>
          <SelectTrigger className="w-[110px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
            <SelectValue placeholder="All ADA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ADA</SelectItem>
            <SelectItem value="Yes">ADA Only</SelectItem>
            <SelectItem value="No">Non-ADA</SelectItem>
          </SelectContent>
        </Select>

        {/* More Filters toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium border transition-all ${
            showAdvancedFilters || advancedFilterCount > 0
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
              : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:text-white hover:border-white/15"
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          More
          {advancedFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
              {advancedFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-white h-8 px-2 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Row 3: Advanced filters (collapsible) */}
      {showAdvancedFilters && (
        <div className="space-y-2 pt-1">
          {/* Feature toggle chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Features</span>
            <div className="flex flex-wrap gap-1.5">
              {featureFilters.map((ff) => (
                <FeatureToggleChip
                  key={ff.key as string}
                  label={ff.label}
                  value={ff.value}
                  onChange={ff.setter}
                />
              ))}
            </div>
          </div>

          {/* Spec dropdown filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Specs</span>
            {specFilters.map((sf) => {
              const uniqueVals = specUniqueValues[sf.key as string] || [];
              if (uniqueVals.length === 0) return null;
              return (
                <Select key={sf.key as string} value={sf.value} onValueChange={sf.setter}>
                  <SelectTrigger className="w-auto min-w-[100px] max-w-[160px] bg-white/[0.04] border-white/[0.08] text-white h-8 text-xs">
                    <SelectValue placeholder={sf.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {sf.label}</SelectItem>
                    {uniqueVals.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#12121a] shrink-0">
            <div className="flex items-center gap-6">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-rose-400" />
                Room Specs
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  ({filteredRooms.length})
                </span>
              </h2>
              <div className="hidden md:flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span className="font-medium text-white">{summary.floorCount}</span> floors
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Accessibility className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-medium text-emerald-400">{summary.adaCount}</span> ADA
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

          <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#12121a]/80 shrink-0">
            {filtersSection}
          </div>

          <div className="flex-1 overflow-y-auto">{tableContent}</div>
        </div>
        <RoomDetailDialog room={selectedRoom} open={!!selectedRoom} onClose={() => setSelectedRoom(null)} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Compact Summary Stats */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-400/10">
              <BedDouble className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tabular-nums">{summary.total}</span>
              <span className="text-xs text-muted-foreground">rooms</span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400 tabular-nums">{summary.floorCount}</span>
            <span className="text-xs text-muted-foreground">floors</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Accessibility className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">{summary.adaCount}</span>
            <span className="text-xs text-muted-foreground">ADA</span>
          </div>

          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-sm font-semibold text-violet-400 tabular-nums">
              {Object.keys(summary.byRoomType).length}
            </span>
            <span className="text-xs text-muted-foreground">room types</span>
          </div>
        </div>

        {/* Main Table Card */}
        <Card className="border-white/[0.08] bg-[#12121a] overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {hasActiveFilters
                  ? `${filteredRooms.length} of ${rooms.length} rooms`
                  : `All ${rooms.length} rooms`}
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

      <RoomDetailDialog room={selectedRoom} open={!!selectedRoom} onClose={() => setSelectedRoom(null)} />
    </>
  );
}
