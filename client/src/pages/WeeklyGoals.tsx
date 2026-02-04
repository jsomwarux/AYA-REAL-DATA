import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WeeklyGoalsDashboard } from "@/components/weekly-goals/WeeklyGoalsDashboard";
import { fetchWeeklyGoalsData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function WeeklyGoals() {
  useDocumentTitle("Weekly Goals");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["weekly-goals"],
    queryFn: () => fetchWeeklyGoalsData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Data Refreshed", "Weekly goals data has been updated.");
    } catch (err) {
      toastError("Refresh Failed", "Could not refresh data. Please try again.");
    }
  };

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <DashboardLayout
      title="Weekly Goals"
      subtitle={lastUpdated ? `Last synced at ${lastUpdated}` : "Track weekly sprint goals and progress"}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-400">
                  Failed to load weekly goals data
                </p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Please check that the Google Sheet is properly configured and shared."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <WeeklyGoalsDashboard
        goals={data?.goals || []}
        summary={data?.summary || { total: 0, byStatus: {}, byAssignee: {} }}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
