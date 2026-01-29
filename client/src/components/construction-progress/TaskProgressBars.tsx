import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  calculateTaskCompletion,
  getCompletionColor,
  BATHROOM_FIELDS,
  BEDROOM_FIELDS,
} from "./utils";
import { Bath, BedDouble } from "lucide-react";

interface TaskProgressBarsProps {
  rooms: RoomProgress[];
}

export function TaskProgressBars({ rooms }: TaskProgressBarsProps) {
  const bathroomTasks = calculateTaskCompletion(rooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(rooms, 'bedroom');

  // Sort tasks by completion percentage (descending)
  const sortedBathroomTasks = Object.entries(bathroomTasks)
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  const sortedBedroomTasks = Object.entries(bedroomTasks)
    .sort(([, a], [, b]) => b.percentage - a.percentage);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bathroom Tasks */}
      <Card className="border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <Bath className="h-5 w-5 text-blue-400" />
            Bathroom Progress by Task
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {sortedBathroomTasks.map(([taskName, stats]) => {
            // Remove "Bathroom_" prefix for display
            const displayName = taskName.replace(/^Bathroom_/, '');
            return (
              <div key={taskName} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">
                    {displayName}
                  </span>
                  <span className={`font-medium ${getCompletionColor(stats.percentage)}`}>
                    {stats.completed}/{stats.total} ({stats.percentage}%)
                  </span>
                </div>
                <Progress
                  value={stats.percentage}
                  className="h-2 bg-white/10"
                />
              </div>
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
        <CardContent className="pt-6 space-y-4">
          {sortedBedroomTasks.map(([taskName, stats]) => {
            // Remove "Bedroom_" prefix for display
            const displayName = taskName.replace(/^Bedroom_/, '');
            return (
              <div key={taskName} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">
                    {displayName}
                  </span>
                  <span className={`font-medium ${getCompletionColor(stats.percentage)}`}>
                    {stats.completed}/{stats.total} ({stats.percentage}%)
                  </span>
                </div>
                <Progress
                  value={stats.percentage}
                  className="h-2 bg-white/10"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
