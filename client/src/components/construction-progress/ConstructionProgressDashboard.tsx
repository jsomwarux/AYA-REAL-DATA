import { useState } from "react";
import { RoomProgress } from "@/lib/api";
import { ProgressStatsCards } from "./ProgressStatsCards";
import { TaskProgressBars } from "./TaskProgressBars";
import { FloorOverview } from "./FloorOverview";
import { FloorDetailView } from "./FloorDetailView";
import { RoomsTable } from "./RoomsTable";
import { RoomDetailModal } from "./RoomDetailModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Layers, TableIcon } from "lucide-react";

interface ConstructionProgressDashboardProps {
  rooms: RoomProgress[];
  isLoading: boolean;
}

export function ConstructionProgressDashboard({
  rooms,
  isLoading,
}: ConstructionProgressDashboardProps) {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomProgress | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleFloorClick = (floor: number) => {
    setSelectedFloor(floor);
    setActiveTab("floor");
  };

  const handleRoomClick = (room: RoomProgress) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  const handleBackToOverview = () => {
    setSelectedFloor(null);
    setActiveTab("overview");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 sm:h-32 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-96 rounded-lg bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Rooms Found</h3>
        <p className="text-muted-foreground max-w-md">
          No construction progress data is available. Please check that the Google Sheet
          is properly configured and contains room data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <ProgressStatsCards rooms={rooms} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 w-full overflow-x-auto flex-nowrap justify-start sm:justify-center">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
            <Layers className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Floor Overview</span>
            <span className="sm:hidden">Floors</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
            <Building className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Task Breakdown</span>
            <span className="sm:hidden">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
            <TableIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Room List</span>
            <span className="sm:hidden">Rooms</span>
          </TabsTrigger>
          {selectedFloor !== null && (
            <TabsTrigger value="floor" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Building className="h-4 w-4 sm:mr-2" />
              F{selectedFloor}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <FloorOverview
            rooms={rooms}
            onFloorClick={handleFloorClick}
            selectedFloor={selectedFloor}
          />
          <TaskProgressBars rooms={rooms} />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <TaskProgressBars rooms={rooms} />
        </TabsContent>

        {/* Table Tab */}
        <TabsContent value="table" className="mt-6">
          <RoomsTable rooms={rooms} onRoomClick={handleRoomClick} />
        </TabsContent>

        {/* Floor Detail Tab */}
        {selectedFloor !== null && (
          <TabsContent value="floor" className="mt-6">
            <FloorDetailView
              rooms={rooms}
              floor={selectedFloor}
              onBack={handleBackToOverview}
              onRoomClick={handleRoomClick}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Room Detail Modal */}
      <RoomDetailModal
        room={selectedRoom}
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
      />
    </div>
  );
}
