import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomProgress } from "@/lib/api";
import {
  groupRoomsByFloor,
  getUniqueFloors,
  calculateFloorCompletion,
  getCompletionColor,
  getCompletionBgColor,
} from "./utils";
import { Building, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloorOverviewProps {
  rooms: RoomProgress[];
  onFloorClick: (floor: number) => void;
  selectedFloor: number | null;
}

export function FloorOverview({ rooms, onFloorClick, selectedFloor }: FloorOverviewProps) {
  const floorMap = groupRoomsByFloor(rooms);
  const floors = getUniqueFloors(rooms);

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <Layers className="h-5 w-5 text-teal-400" />
          Floor Overview
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Click to view details)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {floors.map((floor) => {
            const floorRooms = floorMap.get(floor) || [];
            const completion = calculateFloorCompletion(floorRooms);
            const isSelected = selectedFloor === floor;

            return (
              <button
                key={floor}
                onClick={() => onFloorClick(floor)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg",
                  isSelected
                    ? "border-teal-400 bg-teal-400/20 ring-2 ring-teal-400/50"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                )}
              >
                {/* Floor number */}
                <span className="text-lg font-bold text-white">{floor}</span>

                {/* Completion percentage */}
                <span className={cn("text-sm font-medium", getCompletionColor(completion.overall))}>
                  {completion.overall}%
                </span>

                {/* Room count */}
                <span className="text-xs text-muted-foreground">
                  {floorRooms.length} units
                </span>

                {/* Progress bar at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
                  <div
                    className={cn("h-full transition-all", getCompletionBgColor(completion.overall))}
                    style={{ width: `${completion.overall}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>90%+ Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-teal-500" />
            <span>70-89%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>50-69%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>25-49%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>&lt;25%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
