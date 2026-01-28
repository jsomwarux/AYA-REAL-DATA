import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RoomProgress } from "@/lib/api";
import {
  calculateRoomCompletion,
  calculateTaskCompletion,
  getCompletionColor,
} from "./utils";
import {
  Building2,
  Bath,
  BedDouble,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

interface ProgressStatsCardsProps {
  rooms: RoomProgress[];
}

export function ProgressStatsCards({ rooms }: ProgressStatsCardsProps) {
  // Calculate overall stats
  const roomCompletions = rooms.map(r => calculateRoomCompletion(r));

  const overallCompletion = rooms.length > 0
    ? Math.round(roomCompletions.reduce((sum, c) => sum + c.overall.percentage, 0) / rooms.length)
    : 0;

  const bathroomCompletion = rooms.length > 0
    ? Math.round(roomCompletions.reduce((sum, c) => sum + c.bathroom.percentage, 0) / rooms.length)
    : 0;

  const bedroomCompletion = rooms.length > 0
    ? Math.round(roomCompletions.reduce((sum, c) => sum + c.bedroom.percentage, 0) / rooms.length)
    : 0;

  const completedUnits = roomCompletions.filter(c => c.overall.percentage === 100).length;

  // Calculate task completions
  const bathroomTasks = calculateTaskCompletion(rooms, 'bathroom');
  const bedroomTasks = calculateTaskCompletion(rooms, 'bedroom');

  // Find most completed tasks
  const totalTasks =
    Object.values(bathroomTasks).reduce((sum, t) => sum + t.completed, 0) +
    Object.values(bedroomTasks).reduce((sum, t) => sum + t.completed, 0);

  const stats = [
    {
      title: "Overall Progress",
      value: `${overallCompletion}%`,
      subtitle: `${completedUnits}/${rooms.length} units complete`,
      icon: <Building2 className="h-5 w-5" />,
      iconColor: "text-teal-400",
      bgGradient: "from-teal-500/20 to-teal-600/5",
      progress: overallCompletion,
      progressColor: "bg-teal-500",
    },
    {
      title: "Bathrooms",
      value: `${bathroomCompletion}%`,
      subtitle: `${Object.keys(bathroomTasks).length} tasks tracked`,
      icon: <Bath className="h-5 w-5" />,
      iconColor: "text-blue-400",
      bgGradient: "from-blue-500/20 to-blue-600/5",
      progress: bathroomCompletion,
      progressColor: "bg-blue-500",
    },
    {
      title: "Bedrooms",
      value: `${bedroomCompletion}%`,
      subtitle: `${Object.keys(bedroomTasks).length} tasks tracked`,
      icon: <BedDouble className="h-5 w-5" />,
      iconColor: "text-purple-400",
      bgGradient: "from-purple-500/20 to-purple-600/5",
      progress: bedroomCompletion,
      progressColor: "bg-purple-500",
    },
    {
      title: "Tasks Completed",
      value: totalTasks.toLocaleString(),
      subtitle: `Across ${rooms.length} units`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconColor: "text-green-400",
      bgGradient: "from-green-500/20 to-green-600/5",
      progress: null,
      progressColor: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`border-white/10 bg-gradient-to-br ${stat.bgGradient} overflow-hidden relative`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={`text-3xl font-bold ${getCompletionColor(stat.progress || 100)}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
              <div className={`p-2 rounded-lg bg-white/5 ${stat.iconColor}`}>
                {stat.icon}
              </div>
            </div>
            {stat.progress !== null && (
              <div className="mt-4">
                <Progress
                  value={stat.progress}
                  className="h-2 bg-white/10"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
