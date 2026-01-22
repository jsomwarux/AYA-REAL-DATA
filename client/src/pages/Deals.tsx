import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DealsDashboard } from "@/components/deals/DealsDashboard";
import { DealRecord } from "@/components/deals/DealsTable";
import { fetchDealsData } from "@/lib/api";
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

// Extract field from FULL_JSON if available
function extractFromFullJson(row: any, path: string[], fallback: any = null): any {
  const fullJson = getField(row, 'FULL_JSON', 'full_json');
  if (fullJson && typeof fullJson === 'string') {
    try {
      let parsed = JSON.parse(fullJson);
      for (const key of path) {
        if (parsed && parsed[key] !== undefined) {
          parsed = parsed[key];
        } else {
          return fallback;
        }
      }
      return parsed;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// Extract key due diligence items
function extractDueDiligence(row: any): string {
  // First try direct field
  const direct = getField(row, 'key_due_diligence', 'KEY_DUE_DILIGENCE', 'due_diligence');
  if (direct) return direct;

  // Try to extract from FULL_JSON
  const items = extractFromFullJson(row, ['key_due_diligence_items']);
  if (Array.isArray(items)) {
    return items.join(', ');
  }

  return "Standard due diligence required";
}

export default function Deals() {
  useDocumentTitle("Deal Intelligence");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["deals"],
    queryFn: () => fetchDealsData(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    await refetch();
    toastSuccess("Data Refreshed", "Deal Intelligence data has been updated.");
  };

  // Transform API data to match DealRecord structure
  // Handle both uppercase and lowercase column names from Google Sheets
  const deals: DealRecord[] = data?.rows?.length
    ? data.rows.map((row: any) => ({
        bbl: String(getField(row, 'bbl', 'BBL', 'id') || ""),
        address: getField(row, 'address', 'ADDRESS') || "Unknown Address",
        borough: getField(row, 'borough', 'BOROUGH') || "UNKNOWN",
        final_score: Number(getField(row, 'final_score', 'FINAL_SCORE', 'score')) || 50,
        recommendation: getField(row, 'recommendation', 'RECOMMENDATION', 'signal') || "HOLD",
        upside_score: Number(getField(row, 'upside_score', 'UPSIDE_SCORE')) || 50,
        risk_score: Number(getField(row, 'risk_score', 'RISK_SCORE')) || 50,
        execution_score: Number(getField(row, 'execution_score', 'EXECUTION_SCORE')) || 50,
        investment_thesis: getField(row, 'investment_thesis', 'INVESTMENT_THESIS', 'thesis') || "",
        estimated_price_range: getField(row, 'estimated_price_range', 'ESTIMATED_PRICE_RANGE', 'price_range') || "TBD",
        estimated_roi: getField(row, 'estimated_roi', 'ESTIMATED_ROI', 'roi') || "TBD",
        key_due_diligence: extractDueDiligence(row),
      }))
    : [];

  return (
    <DashboardLayout
      title="Deal Intelligence"
      subtitle="AI-scored distressed properties for acquisition opportunities"
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      <DealsDashboard data={deals} isLoading={isLoading} />
    </DashboardLayout>
  );
}
