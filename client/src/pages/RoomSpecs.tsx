import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RoomSpecsDashboard } from "@/components/room-specs/RoomSpecsDashboard";
import { fetchRoomOverviewData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function RoomSpecs() {
  useDocumentTitle("Room Specs");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["room-specs"],
    queryFn: () => fetchRoomOverviewData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Data Refreshed", "Room specs data has been updated.");
    } catch (err) {
      toastError("Refresh Failed", "Could not refresh data. Please try again.");
    }
  };

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <DashboardLayout
      title="Room Specs"
      subtitle={lastUpdated ? `Last synced at ${lastUpdated}` : "Room specifications and fact sheet"}
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
                  Failed to load room specs data
                </p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Please check that the Google Sheet is properly configured and shared."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <RoomSpecsDashboard
        rooms={data?.rooms || []}
        summary={data?.summary || { total: 0, floors: [], floorCount: 0, adaCount: 0, byFloor: {}, byRoomType: {}, bySizeCategory: {}, byBedSize: {} }}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
