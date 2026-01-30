import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  calculateTaskCompletion,
  getCompletionColor,
} from "./utils";
import { TaskDetailModal } from "./TaskDetailModal";
import { RoomDetailModal } from "./RoomDetailModal";
import { Bath, BedDouble, ChevronRight } from "lucide-react";

interface TaskProgressBarsProps {
  rooms: RoomProgress[];
}

interface SelectedTask {
  taskKey: string;
  displayName: string;
  type: "bathroom" | "bedroom";
}

export function TaskProgressBars({ rooms }: TaskProgressBarsProps) {
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomProgress | null>(null);

  const bathroomTasks = calculateTaskCompletion(rooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(rooms, 'bedroom');

  // Sort tasks by completion percentage (descending)
  const sortedBathroomTasks = Object.entries(bathroomTasks)
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const sortedBedroomTasks = Object.entries(bedroomTasks)
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const handleTaskClick = (taskKey: string, type: "bathroom" | "bedroom") => {
    const prefix = type === "bathroom" ? "Bathroom_" : "Bedroom_";
    const displayName = taskKey.replace(new RegExp(`^${prefix}`), '');
    setSelectedTask({ taskKey, displayName, type });
  };

  const handleRoomClick = (room: RoomProgress) => {
    setSelectedRoom(room);
  };

  return (
    <>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Bathroom Tasks */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Bath className="h-5 w-5 text-blue-400" />
              Bathroom Progress by Task
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {sortedBathroomTasks.map(([taskName, stats]) => {
              // Remove "Bathroom_" prefix for display
              const displayName = taskName.replace(/^Bathroom_/, '');
              return (
                <button
                  key={taskName}
                  onClick={() => handleTaskClick(taskName, "bathroom")}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[55%] group-hover:text-white transition-colors">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getCompletionColor(stats.percentage)}`}>
                          {stats.completed}/{stats.total} ({stats.percentage}%)
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <Progress
                      value={stats.percentage}
                      className="h-2 bg-white/10"
                    />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Bedroom Tasks */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <BedDouble className="h-5 w-5 text-purple-400" />
              Bedroom Progress by Task
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {sortedBedroomTasks.map(([taskName, stats]) => {
              // Remove "Bedroom_" prefix for display
              const displayName = taskName.replace(/^Bedroom_/, '');
              return (
                <button
                  key={taskName}
                  onClick={() => handleTaskClick(taskName, "bedroom")}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[55%] group-hover:text-white transition-colors">
                        {displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getCompletionColor(stats.percentage)}`}>
                          {stats.completed}/{stats.total} ({stats.percentage}%)
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <Progress
                      value={stats.percentage}
                      className="h-2 bg-white/10"
                    />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskName={selectedTask.displayName}
          taskKey={selectedTask.taskKey}
          taskType={selectedTask.type}
          rooms={rooms}
          onRoomClick={handleRoomClick}
        />
      )}

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </>
  );
}
