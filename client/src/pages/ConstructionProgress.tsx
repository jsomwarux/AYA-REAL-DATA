import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConstructionProgressDashboard } from "@/components/construction-progress/ConstructionProgressDashboard";
import { fetchConstructionProgressData, RoomProgress, RecapSection } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ConstructionProgress() {
  useDocumentTitle("Construction Progress");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["construction-progress"],
    queryFn: () => fetchConstructionProgressData(),
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes - more frequent updates for progress tracking
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Data Refreshed", "Construction progress data has been updated.");
    } catch (err) {
      toastError("Refresh Failed", "Could not refresh data. Please try again.");
    }
  };

  // Transform API data to match RoomProgress structure
  const rooms: RoomProgress[] = data?.rooms?.rows || [];
  const recapSections: RecapSection[] = data?.recap?.sections || [];

  // Get last updated time
  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <DashboardLayout
      title="Construction Progress"
      subtitle={lastUpdated ? `Last synced at ${lastUpdated}` : "Real-time room-by-room progress tracking"}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-400">
                  Failed to load construction progress data
                </p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Please check that the Google Sheet is properly configured and shared."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard */}
      <ConstructionProgressDashboard
        rooms={rooms}
        recapSections={recapSections}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
