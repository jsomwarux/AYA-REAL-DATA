import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { VendorInvoicesDashboard } from "@/components/vendor-invoices/VendorInvoicesDashboard";
import { fetchVendorInvoicesData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function VendorInvoices() {
  useDocumentTitle("Vendor Invoices");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["vendor-invoices"],
    queryFn: () => fetchVendorInvoicesData(),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Data Refreshed", "Vendor invoices data has been updated.");
    } catch (err) {
      toastError("Refresh Failed", "Could not refresh data. Please try again.");
    }
  };

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <DashboardLayout
      title="Vendor Invoices"
      subtitle={lastUpdated ? `Last synced at ${lastUpdated}` : "Browse vendor documents and invoices"}
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
                  Failed to load vendor invoices
                </p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || "Please check that the Google Drive folder is properly configured and shared."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <VendorInvoicesDashboard
        vendors={data?.vendors || []}
        summary={data?.summary || { totalVendors: 0, totalFiles: 0, byMimeType: {} }}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
