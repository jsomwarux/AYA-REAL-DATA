import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContainerScheduleDashboard } from "@/components/container-schedule/ContainerScheduleDashboard";
import { fetchContainerScheduleData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ContainerSchedule() {
  useDocumentTitle("Container Schedule");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["container-schedule"],
    queryFn: () => fetchContainerScheduleData(),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Data Refreshed", "Container schedule data has been updated.");
    } catch (err) {
      toastError("Refresh Failed", "Could not refresh data. Please try again.");
    }
  };

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <DashboardLayout
      title="Container Schedule"
      subtitle={lastUpdated ? `Last synced at ${lastUpdated}` : "Track shipments from factory to warehouse"}
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
                  Failed to load container schedule data
                </p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Please check that the Google Sheet is properly configured and shared."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ContainerScheduleDashboard
        containers={data?.containers || []}
        summary={data?.summary || { total: 0, byStatus: {}, byFactory: {} }}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
