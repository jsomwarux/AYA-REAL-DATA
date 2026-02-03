import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DealsDashboard } from "@/components/deals/DealsDashboard";
import type { DealRecord } from "@/components/deals/types";
import { fetchDealsData } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";

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

// Safely parse a JSON column that may be a JSON string, already-parsed array, or comma-separated string
function parseJsonColumn<T = string>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    // Fallback: comma-separated string → array of strings
    return trimmed.split(',').map(s => s.trim()).filter(Boolean) as unknown as T[];
  }
  return [];
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

// Parse boolean-like values from sheets
function parseBooleanField(raw: any): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'likely';
  }
  return !!raw;
}

export default function Deals() {
  useDocumentTitle("Deal Intelligence");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Check if already authenticated via server session
  useEffect(() => {
    fetch("/api/auth/deals-check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/deals-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setError("");
        toastSuccess("Access Granted", "Welcome to Deal Intelligence.");
      } else {
        setError("Incorrect password. Please try again.");
        toastError("Access Denied", "Incorrect password.");
      }
    } catch {
      setError("Failed to verify password. Please try again.");
      toastError("Error", "Failed to verify password.");
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["deals"],
    queryFn: () => fetchDealsData(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  const handleRefresh = async () => {
    await refetch();
    toastSuccess("Data Refreshed", "Deal Intelligence data has been updated.");
  };

  // Transform API data to match DealRecord structure
  // Handle both uppercase and lowercase column names from Google Sheets
  const deals: DealRecord[] = data?.rows?.length
    ? data.rows.map((row: any) => ({
        // === Core fields ===
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

        // === Upside Analysis ===
        upside_label: getField(row, 'upside_label', 'UPSIDE_LABEL') || "",
        upside_headline: getField(row, 'upside_headline', 'UPSIDE_HEADLINE') || "",
        upside_discount_potential: getField(row, 'upside_discount_potential', 'UPSIDE_DISCOUNT_POTENTIAL') || "",
        upside_value_add_opportunities: parseJsonColumn<string>(
          getField(row, 'upside_value_add_opportunities', 'UPSIDE_VALUE_ADD_OPPORTUNITIES')
        ),
        upside_exit_strategy: getField(row, 'upside_exit_strategy', 'UPSIDE_EXIT_STRATEGY') || "",
        upside_bull_case: getField(row, 'upside_bull_case', 'UPSIDE_BULL_CASE') || "",
        upside_key_factors: parseJsonColumn(
          getField(row, 'upside_key_factors', 'UPSIDE_KEY_FACTORS')
        ),
        upside_confidence: getField(row, 'upside_confidence', 'UPSIDE_CONFIDENCE') || "",

        // === Risk Analysis ===
        risk_label: getField(row, 'risk_label', 'RISK_LABEL') || "",
        risk_headline: getField(row, 'risk_headline', 'RISK_HEADLINE') || "",
        risk_rent_stabilized: parseBooleanField(
          getField(row, 'risk_rent_stabilized', 'RISK_RENT_STABILIZED')
        ),
        risk_critical_risks: parseJsonColumn(
          getField(row, 'risk_critical_risks', 'RISK_CRITICAL_RISKS')
        ),
        risk_legal_costs: getField(row, 'risk_legal_costs', 'RISK_LEGAL_COSTS') || "",
        risk_deal_breakers: parseJsonColumn<string>(
          getField(row, 'risk_deal_breakers', 'RISK_DEAL_BREAKERS')
        ),
        risk_bear_case: getField(row, 'risk_bear_case', 'RISK_BEAR_CASE') || "",
        risk_due_diligence: parseJsonColumn<string>(
          getField(row, 'risk_due_diligence', 'RISK_DUE_DILIGENCE')
        ),
        risk_confidence: getField(row, 'risk_confidence', 'RISK_CONFIDENCE') || "",

        // === Execution Analysis ===
        execution_label: getField(row, 'execution_label', 'EXECUTION_LABEL') || "",
        execution_headline: getField(row, 'execution_headline', 'EXECUTION_HEADLINE') || "",
        execution_renovation_cost: getField(row, 'execution_renovation_cost', 'EXECUTION_RENOVATION_COST') || "",
        execution_timeline_months: Number(getField(row, 'execution_timeline_months', 'EXECUTION_TIMELINE_MONTHS')) || 0,
        execution_total_capital: getField(row, 'execution_total_capital', 'EXECUTION_TOTAL_CAPITAL') || "",
        execution_workstreams: parseJsonColumn(
          getField(row, 'execution_workstreams', 'EXECUTION_WORKSTREAMS')
        ),
        execution_challenges: parseJsonColumn(
          getField(row, 'execution_challenges', 'EXECUTION_CHALLENGES')
        ),
        execution_recommended_use: getField(row, 'execution_recommended_use', 'EXECUTION_RECOMMENDED_USE') || "",
        execution_aya_fit: getField(row, 'execution_aya_fit', 'EXECUTION_AYA_FIT') || "",
        execution_confidence: getField(row, 'execution_confidence', 'EXECUTION_CONFIDENCE') || "",

        // === Other New Fields ===
        stabilized_value: getField(row, 'stabilized_value', 'STABILIZED_VALUE') || "",
        dissenting_opinions: getField(row, 'dissenting_opinions', 'DISSENTING_OPINIONS') || "",
        next_steps: parseJsonColumn<string>(
          getField(row, 'next_steps', 'NEXT_STEPS')
        ),
        alert_priority: getField(row, 'alert_priority', 'ALERT_PRIORITY') || "",
        key_due_diligence_items: getField(row, 'key_due_diligence_items', 'KEY_DUE_DILIGENCE_ITEMS') || "",
      }))
    : [];

  // Show password gate if not authenticated
  if (isCheckingAuth) {
    return (
      <DashboardLayout
        title="Deal Intelligence"
        subtitle="Checking authentication..."
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Verifying access...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout
        title="Deal Intelligence"
        subtitle="Protected area - authentication required"
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
                <Shield className="h-8 w-8 text-purple-400" />
              </div>
              <CardTitle className="text-xl text-white">Protected Area</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Deal Intelligence is password protected. Enter the password to continue.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Access Deal Intelligence
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                This section contains sensitive deal analysis data.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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
