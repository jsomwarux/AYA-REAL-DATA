import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConstructionDashboard } from "@/components/construction/ConstructionDashboard";
import { InvoiceRecord } from "@/components/construction/InvoiceTable";
import { fetchConstructionData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess } from "@/hooks/use-toast";

// Helper to get value from row with case-insensitive key lookup
function getField(row: any, ...keys: string[]): any {
  for (const key of keys) {
    // Try exact match first
    if (row[key] !== undefined && row[key] !== null) return row[key];
    // Try uppercase
    if (row[key.toUpperCase()] !== undefined && row[key.toUpperCase()] !== null) return row[key.toUpperCase()];
    // Try lowercase
    if (row[key.toLowerCase()] !== undefined && row[key.toLowerCase()] !== null) return row[key.toLowerCase()];
  }
  return null;
}

// Extract slack alert from FULL_JSON if available
function extractSlackAlert(row: any): string {
  const fullJson = getField(row, 'FULL_JSON', 'full_json');
  if (fullJson && typeof fullJson === 'string') {
    try {
      const parsed = JSON.parse(fullJson);
      return parsed.slack_alert_message || '';
    } catch {
      return '';
    }
  }
  return getField(row, 'slack_alert_message', 'SLACK_ALERT_MESSAGE') || '';
}

// Extract confidence score - try FULL_JSON first, then direct field
function extractConfidenceScore(row: any): number {
  const fullJson = getField(row, 'FULL_JSON', 'full_json');
  if (fullJson && typeof fullJson === 'string') {
    try {
      const parsed = JSON.parse(fullJson);
      if (parsed.executive_summary?.confidence_score) {
        return Number(parsed.executive_summary.confidence_score);
      }
    } catch {
      // ignore
    }
  }
  const direct = getField(row, 'confidence_score', 'CONFIDENCE_SCORE');
  return direct ? Number(direct) : 75;
}

export default function Construction() {
  useDocumentTitle("Construction Oversight");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["construction"],
    queryFn: () => fetchConstructionData(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    await refetch();
    toastSuccess("Data Refreshed", "Construction data has been updated.");
  };

  // Transform API data to match InvoiceRecord structure
  // Handle both uppercase and lowercase column names from Google Sheets
  const invoices: InvoiceRecord[] = data?.rows?.length
    ? data.rows.map((row: any) => ({
        retrieved_at: getField(row, 'retrieved_at') || new Date().toISOString(),
        vendor_name: getField(row, 'vendor_name', 'VENDOR_NAME', 'contractor', 'vendor') || "Unknown Vendor",
        invoice_number: getField(row, 'invoice_number', 'INVOICE_NUMBER', 'id', 'invoice_id') || "",
        invoice_amount: Number(getField(row, 'invoice_amount', 'INVOICE_AMOUNT', 'amount')) || 0,
        verdict: getField(row, 'verdict', 'VERDICT', 'status') || "HOLD_FOR_REVIEW",
        potential_overcharge: Number(getField(row, 'potential_overcharge', 'POTENTIAL_OVERCHARGE', 'overcharge')) || 0,
        contract_compliance: getField(row, 'contract_compliance', 'CONTRACT_COMPLIANCE', 'contract_status') || "PASS",
        permit_compliance: getField(row, 'permit_compliance', 'PERMIT_COMPLIANCE', 'permit_status') || "PASS",
        critical_flags: getField(row, 'critical_flags', 'CRITICAL_FLAGS', 'flags', 'flag') || "",
        confidence_score: extractConfidenceScore(row),
        slack_alert_message: extractSlackAlert(row),
      }))
    : [];

  return (
    <DashboardLayout
      title="Construction Oversight"
      subtitle="AI-powered invoice audit and compliance monitoring"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      <ConstructionDashboard data={invoices} isLoading={isLoading} />
    </DashboardLayout>
  );
}
