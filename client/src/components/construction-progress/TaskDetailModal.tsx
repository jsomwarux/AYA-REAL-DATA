import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  getFieldValue,
  isFieldComplete,
  BATHROOM_FIELDS,
  BEDROOM_FIELDS,
  formatFieldValue,
} from "./utils";
import {
  Search,
  CheckCircle2,
  Circle,
  MinusCircle,
  Bath,
  BedDouble,
} from "lucide-react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string; // Display name without prefix
  taskKey: string; // Full key with prefix (e.g., "Bathroom_Sheetrock")
  taskType: "bathroom" | "bedroom";
  rooms: RoomProgress[];
  onRoomClick?: (room: RoomProgress) => void;
}

type RoomTaskStatus = "complete" | "incomplete" | "na";

interface RoomWithStatus {
  room: RoomProgress;
  status: RoomTaskStatus;
  value: any;
  displayValue: string;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  taskName,
  taskKey,
  taskType,
  rooms,
  onRoomClick,
}: TaskDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomTaskStatus | "all">("all");

  // Get field config
  const fieldConfig = taskType === "bathroom"
    ? BATHROOM_FIELDS[taskKey]
    : BEDROOM_FIELDS[taskKey];

  // Process rooms with their status for this task
  const roomsWithStatus = useMemo((): RoomWithStatus[] => {
    if (!fieldConfig) return [];

    return rooms.map((room) => {
      const value = getFieldValue(room, taskKey);
      const status = isFieldComplete(value, fieldConfig);
      const displayValue = formatFieldValue(value, fieldConfig.type);

      return {
        room,
        status,
        value,
        displayValue,
      };
    });
  }, [rooms, taskKey, fieldConfig]);

  // Filter rooms based on search and status
  const filteredRooms = useMemo(() => {
    return roomsWithStatus.filter((item) => {
      // Search filter
      const roomNumber = String(item.room["ROOM #"] || "");
      const matchesSearch = searchQuery === "" ||
        roomNumber.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [roomsWithStatus, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const complete = roomsWithStatus.filter((r) => r.status === "complete").length;
    const incomplete = roomsWithStatus.filter((r) => r.status === "incomplete").length;
    const na = roomsWithStatus.filter((r) => r.status === "na").length;
    const total = roomsWithStatus.length;
    const applicable = total - na;
    const percentage = applicable > 0 ? Math.round((complete / applicable) * 100) : 0;

    return { complete, incomplete, na, total, applicable, percentage };
  }, [roomsWithStatus]);

  // Group filtered rooms by floor
  const groupedByFloor = useMemo(() => {
    const groups = new Map<number, RoomWithStatus[]>();

    filteredRooms.forEach((item) => {
      const roomNum = item.room["ROOM #"];
      const floor = typeof roomNum === "number"
        ? Math.floor(roomNum / 100)
        : Math.floor(parseInt(String(roomNum)) / 100);

      if (!groups.has(floor)) {
        groups.set(floor, []);
      }
      groups.get(floor)!.push(item);
    });

    // Sort by floor number
    return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  }, [filteredRooms]);

  const getStatusIcon = (status: RoomTaskStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "incomplete":
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      case "na":
        return <MinusCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: RoomTaskStatus) => {
    switch (status) {
      case "complete":
        return "bg-green-500/20 text-green-400 hover:bg-green-500/30";
      case "incomplete":
        return "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30";
      case "na":
        return "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            {taskType === "bathroom" ? (
              <Bath className="h-6 w-6 text-blue-400" />
            ) : (
              <BedDouble className="h-6 w-6 text-purple-400" />
            )}
            <span>{taskName}</span>
            <Badge variant="outline" className="ml-2">
              {taskType === "bathroom" ? "Bathroom" : "Bedroom"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-white">{stats.percentage}%</div>
              <div className="text-sm text-muted-foreground">
                {stats.complete} of {stats.applicable} rooms complete
                {stats.na > 0 && ` (${stats.na} N/A)`}
              </div>
            </div>
          </div>
          <Progress value={stats.percentage} className="h-2 bg-white/10" />
        </div>

        {/* Filters */}
        <div className="py-4 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by room number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("complete")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === "complete"
                  ? "bg-green-500/30 text-green-400"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Complete ({stats.complete})
            </button>
            <button
              onClick={() => setStatusFilter("incomplete")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === "incomplete"
                  ? "bg-amber-500/30 text-amber-400"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              Incomplete ({stats.incomplete})
            </button>
            {stats.na > 0 && (
              <button
                onClick={() => setStatusFilter("na")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === "na"
                    ? "bg-gray-500/30 text-gray-400"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                N/A ({stats.na})
              </button>
            )}
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {filteredRooms.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No rooms match your filters
            </div>
          ) : (
            Array.from(groupedByFloor.entries()).map(([floor, floorRooms]) => (
              <div key={floor} className="space-y-2">
                <div className="sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Floor {floor} ({floorRooms.length} rooms)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {floorRooms.map((item) => (
                    <button
                      key={String(item.room["ROOM #"])}
                      onClick={() => onRoomClick?.(item.room)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                        item.status === "complete"
                          ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                          : item.status === "na"
                          ? "border-gray-500/30 bg-gray-500/5 hover:bg-gray-500/10"
                          : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium text-white">
                          {item.room["ROOM #"]}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {item.displayValue}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
