import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  groupRoomsByFloor,
  calculateRoomCompletion,
  calculateFloorCompletion,
  calculateTaskCompletion,
  getCompletionColor,
  getCompletionBgColor,
} from "./utils";
import { ArrowLeft, Bath, BedDouble, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloorDetailViewProps {
  rooms: RoomProgress[];
  floor: number;
  onBack: () => void;
  onRoomClick: (room: RoomProgress) => void;
}

export function FloorDetailView({ rooms, floor, onBack, onRoomClick }: FloorDetailViewProps) {
  const floorMap = groupRoomsByFloor(rooms);
  const floorRooms = floorMap.get(floor) || [];
  const floorCompletion = calculateFloorCompletion(floorRooms);

  // Sort rooms by room number
  const sortedRooms = [...floorRooms].sort((a, b) => {
    const aNum = Number(a['ROOM #']) || 0;
    const bNum = Number(b['ROOM #']) || 0;
    return aNum - bNum;
  });

  // Calculate task breakdown for this floor
  const bathroomTasks = calculateTaskCompletion(floorRooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(floorRooms, 'bedroom');

  return (
    <Card className="border-white/10">
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div className="h-6 w-px bg-white/10" />
            <CardTitle className="flex items-center gap-2 text-white">
              <Building className="h-5 w-5 text-teal-400" />
              Floor {floor}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {floorRooms.length} units | {floorCompletion.overall}% complete
              </span>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Floor Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-muted-foreground">Overall</span>
            </div>
            <p className={cn("text-2xl font-bold", getCompletionColor(floorCompletion.overall))}>
              {floorCompletion.overall}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Bath className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Bathrooms</span>
            </div>
            <p className={cn("text-2xl font-bold", getCompletionColor(floorCompletion.bathroom))}>
              {floorCompletion.bathroom}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <BedDouble className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Bedrooms</span>
            </div>
            <p className={cn("text-2xl font-bold", getCompletionColor(floorCompletion.bedroom))}>
              {floorCompletion.bedroom}%
            </p>
          </div>
        </div>

        {/* Room Grid */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Click a room for details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sortedRooms.map((room) => {
              const completion = calculateRoomCompletion(room);
              return (
                <button
                  key={String(room['ROOM #'])}
                  onClick={() => onRoomClick(room)}
                  className={cn(
                    "relative p-4 rounded-lg border transition-all duration-200",
                    "hover:scale-105 hover:shadow-lg text-left",
                    "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  {/* Room number */}
                  <span className="text-lg font-bold text-white">
                    {room['ROOM #']}
                  </span>

                  {/* Completion breakdown */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Bath</span>
                      <span className={getCompletionColor(completion.bathroom.percentage)}>
                        {completion.bathroom.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Bed</span>
                      <span className={getCompletionColor(completion.bedroom.percentage)}>
                        {completion.bedroom.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Overall percentage */}
                  <div className={cn(
                    "mt-2 text-center py-1 rounded text-sm font-medium",
                    getCompletionBgColor(completion.overall.percentage),
                    "text-white"
                  )}>
                    {completion.overall.percentage}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floor Task Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bathroom Tasks */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Bath className="h-4 w-4 text-blue-400" />
              Bathroom Tasks
            </h4>
            <div className="space-y-2">
              {Object.entries(bathroomTasks)
                .sort(([, a], [, b]) => b.percentage - a.percentage)
                .slice(0, 6)
                .map(([task, stats]) => (
                  <div key={task} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[60%]">{task}</span>
                    <span className={getCompletionColor(stats.percentage)}>
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Bedroom Tasks */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-purple-400" />
              Bedroom Tasks
            </h4>
            <div className="space-y-2">
              {Object.entries(bedroomTasks)
                .sort(([, a], [, b]) => b.percentage - a.percentage)
                .slice(0, 6)
                .map(([task, stats]) => (
                  <div key={task} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[60%]">{task}</span>
                    <span className={getCompletionColor(stats.percentage)}>
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
