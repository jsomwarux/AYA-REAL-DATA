import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  calculateRoomCompletion,
  getUniqueFloors,
  getFloorFromRoom,
  getCompletionColor,
  getCompletionBgColor,
} from "./utils";
import {
  Search,
  Filter,
  TableIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomsTableProps {
  rooms: RoomProgress[];
  onRoomClick: (room: RoomProgress) => void;
}

const ITEMS_PER_PAGE = 20;

export function RoomsTable({ rooms, onRoomClick }: RoomsTableProps) {
  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("room");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const floors = getUniqueFloors(rooms);

  // Process and filter rooms
  const processedRooms = useMemo(() => {
    let result = rooms.map(room => ({
      room,
      completion: calculateRoomCompletion(room),
      floor: getFloorFromRoom(room['ROOM #']),
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(r =>
        String(r.room['ROOM #']).toLowerCase().includes(searchLower)
      );
    }

    // Apply floor filter
    if (floorFilter !== "all") {
      const floorNum = parseInt(floorFilter, 10);
      result = result.filter(r => r.floor === floorNum);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(r => {
        const pct = r.completion.overall.percentage;
        switch (statusFilter) {
          case "complete":
            return pct === 100;
          case "in-progress":
            return pct > 0 && pct < 100;
          case "not-started":
            return pct === 0;
          case "below-50":
            return pct < 50;
          case "above-75":
            return pct >= 75;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "room":
          comparison = Number(a.room['ROOM #']) - Number(b.room['ROOM #']);
          break;
        case "floor":
          comparison = a.floor - b.floor;
          break;
        case "overall":
          comparison = a.completion.overall.percentage - b.completion.overall.percentage;
          break;
        case "bathroom":
          comparison = a.completion.bathroom.percentage - b.completion.bathroom.percentage;
          break;
        case "bedroom":
          comparison = a.completion.bedroom.percentage - b.completion.bedroom.percentage;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [rooms, search, floorFilter, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedRooms.length / ITEMS_PER_PAGE);
  const paginatedRooms = processedRooms.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <TableIcon className="h-5 w-5 text-teal-400" />
            Room Details
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({processedRooms.length} rooms)
            </span>
          </CardTitle>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search room..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              className="pl-9 w-full sm:w-[200px] bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Select
            value={floorFilter}
            onValueChange={(v) => {
              setFloorFilter(v);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map(f => (
                <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete (100%)</SelectItem>
              <SelectItem value="above-75">Above 75%</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="below-50">Below 50%</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="room">Room #</SelectItem>
              <SelectItem value="floor">Floor</SelectItem>
              <SelectItem value="overall">Overall %</SelectItem>
              <SelectItem value="bathroom">Bathroom %</SelectItem>
              <SelectItem value="bedroom">Bedroom %</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
            className="bg-white/5 border-white/10"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Room</TableHead>
                <TableHead className="text-muted-foreground">Floor</TableHead>
                <TableHead className="text-muted-foreground">Bathroom</TableHead>
                <TableHead className="text-muted-foreground">Bedroom</TableHead>
                <TableHead className="text-muted-foreground">Overall</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRooms.map(({ room, completion, floor }) => (
                <TableRow
                  key={String(room['ROOM #'])}
                  onClick={() => onRoomClick(room)}
                  className="border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <TableCell className="font-medium text-white">
                    {room['ROOM #']}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {floor}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={completion.bathroom.percentage}
                        className="h-2 w-16 bg-white/10"
                      />
                      <span className={cn("text-sm", getCompletionColor(completion.bathroom.percentage))}>
                        {completion.bathroom.percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={completion.bedroom.percentage}
                        className="h-2 w-16 bg-white/10"
                      />
                      <span className={cn("text-sm", getCompletionColor(completion.bedroom.percentage))}>
                        {completion.bedroom.percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={completion.overall.percentage}
                        className="h-2 w-16 bg-white/10"
                      />
                      <span className={cn("text-sm font-medium", getCompletionColor(completion.overall.percentage))}>
                        {completion.overall.percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      completion.overall.percentage === 100 && "bg-green-500/20 text-green-400",
                      completion.overall.percentage > 0 && completion.overall.percentage < 100 && "bg-amber-500/20 text-amber-400",
                      completion.overall.percentage === 0 && "bg-gray-500/20 text-gray-400"
                    )}>
                      {completion.overall.percentage === 100
                        ? "Complete"
                        : completion.overall.percentage > 0
                          ? "In Progress"
                          : "Not Started"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, processedRooms.length)} of{" "}
              {processedRooms.length} rooms
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 bg-white/5 border-white/10"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 bg-white/5 border-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 bg-white/5 border-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 bg-white/5 border-white/10"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
