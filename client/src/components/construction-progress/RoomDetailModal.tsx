import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  calculateRoomCompletion,
  BATHROOM_FIELDS,
  BEDROOM_FIELDS,
  isFieldComplete,
  formatFieldValue,
  getCompletionColor,
  getFloorFromRoom,
} from "./utils";

// Helper to get field value with case-insensitive lookup
function getFieldValue(room: RoomProgress, fieldName: string): any {
  // Try exact match first
  if (room[fieldName] !== undefined) {
    return room[fieldName];
  }

  // Try with different cases
  const lowerKey = fieldName.toLowerCase();
  for (const key of Object.keys(room)) {
    if (key.toLowerCase() === lowerKey) {
      return room[key];
    }
  }

  return undefined;
}
import {
  Bath,
  BedDouble,
  Building,
  CheckCircle2,
  Circle,
  MinusCircle,
  ExternalLink,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomDetailModalProps {
  room: RoomProgress | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomDetailModal({ room, isOpen, onClose }: RoomDetailModalProps) {
  if (!room) return null;

  const completion = calculateRoomCompletion(room);
  const floor = getFloorFromRoom(room['ROOM #']);

  // Get status icon for a field
  const getStatusIcon = (value: any, config: any) => {
    const status = isFieldComplete(value, config);
    if (status === 'na') {
      return <MinusCircle className="h-4 w-4 text-gray-400" />;
    }
    if (status === true) {
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  // Get display value for a field
  const getDisplayValue = (value: any, config: any) => {
    const status = isFieldComplete(value, config);
    if (status === 'na') {
      return 'N/A';
    }
    return formatFieldValue(value, config.type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Building className="h-6 w-6 text-teal-400" />
            <span>Room {room['ROOM #']}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Floor {floor}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-muted-foreground mb-1">Overall</p>
            <p className={cn("text-2xl font-bold", getCompletionColor(completion.overall.percentage))}>
              {completion.overall.percentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              {completion.overall.completed}/{completion.overall.total} tasks
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-muted-foreground mb-1">Bathroom</p>
            <p className={cn("text-2xl font-bold", getCompletionColor(completion.bathroom.percentage))}>
              {completion.bathroom.percentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              {completion.bathroom.completed}/{completion.bathroom.total} tasks
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-muted-foreground mb-1">Bedroom</p>
            <p className={cn("text-2xl font-bold", getCompletionColor(completion.bedroom.percentage))}>
              {completion.bedroom.percentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              {completion.bedroom.completed}/{completion.bedroom.total} tasks
            </p>
          </div>
        </div>

        {/* Task Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bathroom Tasks */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Bath className="h-5 w-5 text-blue-400" />
              <h3 className="font-medium text-white">Bathroom</h3>
              <span className={cn(
                "ml-auto text-sm font-medium",
                getCompletionColor(completion.bathroom.percentage)
              )}>
                {completion.bathroom.percentage}%
              </span>
            </div>
            <Progress
              value={completion.bathroom.percentage}
              className="h-2 bg-white/10"
            />
            <div className="space-y-2">
              {Object.entries(BATHROOM_FIELDS).map(([fieldName, config]) => {
                const value = getFieldValue(room, fieldName);
                // Remove "Bathroom_" prefix for display
                const displayName = fieldName.replace(/^Bathroom_/, '');
                return (
                  <div
                    key={fieldName}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(value, config)}
                      <span className="text-sm text-muted-foreground">{displayName}</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {getDisplayValue(value, config)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bedroom Tasks */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <BedDouble className="h-5 w-5 text-purple-400" />
              <h3 className="font-medium text-white">Bedroom</h3>
              <span className={cn(
                "ml-auto text-sm font-medium",
                getCompletionColor(completion.bedroom.percentage)
              )}>
                {completion.bedroom.percentage}%
              </span>
            </div>
            <Progress
              value={completion.bedroom.percentage}
              className="h-2 bg-white/10"
            />
            <div className="space-y-2">
              {Object.entries(BEDROOM_FIELDS).map(([fieldName, config]) => {
                const value = getFieldValue(room, fieldName);
                // Remove "Bedroom_" prefix for display
                const displayName = fieldName.replace(/^Bedroom_/, '');
                return (
                  <div
                    key={fieldName}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(value, config)}
                      <span className="text-sm text-muted-foreground">{displayName}</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {getDisplayValue(value, config)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress Photos Placeholder */}
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10 border-dashed">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Image className="h-5 w-5" />
            <span className="text-sm">
              Progress photos will appear here once Google Drive is connected
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
