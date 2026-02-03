// ============================================
// JSON Sub-Types (parsed from Google Sheet JSON string columns)
// ============================================

export interface UpsideKeyFactor {
  factor: string;
  impact: string; // "HIGH" | "MEDIUM" | "LOW"
  explanation: string;
}

export interface RiskCriticalRisk {
  risk: string;
  severity: string; // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  mitigation: string;
  estimated_cost_to_resolve: string;
}

export interface ExecutionWorkstream {
  workstream: string;
  estimated_duration: string;
  estimated_cost: string;
  complexity: string; // "HIGH" | "MEDIUM" | "LOW"
}

export interface ExecutionChallenge {
  challenge: string;
  severity: string; // "HIGH" | "MEDIUM" | "LOW"
  mitigation_strategy: string;
}

// ============================================
// Extended DealRecord
// ============================================

export interface DealRecord {
  // === Core fields (existing) ===
  bbl: string;
  address: string;
  borough: string;
  final_score: number;
  recommendation: string; // "STRONG_BUY" | "BUY" | "HOLD" | "PASS"
  upside_score: number;
  risk_score: number;
  execution_score: number;
  investment_thesis: string;
  estimated_price_range: string;
  estimated_roi: string;
  key_due_diligence: string;

  // === Upside Analysis ===
  upside_label: string; // "EXCEPTIONAL" | "STRONG" | "MODERATE" | "WEAK" | "PASS"
  upside_headline: string;
  upside_discount_potential: string;
  upside_value_add_opportunities: string[]; // parsed JSON array of strings
  upside_exit_strategy: string;
  upside_bull_case: string;
  upside_key_factors: UpsideKeyFactor[]; // parsed JSON array of objects
  upside_confidence: string; // "HIGH" | "MEDIUM" | "LOW"

  // === Risk Analysis ===
  risk_label: string; // "MINIMAL" | "LOW" | "MODERATE" | "HIGH" | "EXTREME"
  risk_headline: string;
  risk_rent_stabilized: boolean;
  risk_critical_risks: RiskCriticalRisk[]; // parsed JSON
  risk_legal_costs: string;
  risk_deal_breakers: string[]; // parsed JSON array of strings
  risk_bear_case: string;
  risk_due_diligence: string[]; // parsed JSON array of strings
  risk_confidence: string; // "HIGH" | "MEDIUM" | "LOW"

  // === Execution Analysis ===
  execution_label: string; // "TURNKEY" | "STRAIGHTFORWARD" | "COMPLEX" | "DIFFICULT" | "EXTREMELY_DIFFICULT"
  execution_headline: string;
  execution_renovation_cost: string;
  execution_timeline_months: number;
  execution_total_capital: string;
  execution_workstreams: ExecutionWorkstream[]; // parsed JSON
  execution_challenges: ExecutionChallenge[]; // parsed JSON
  execution_recommended_use: string; // "hotel" | "co-living" | "traditional_rental" | "mixed"
  execution_aya_fit: string;
  execution_confidence: string; // "HIGH" | "MEDIUM" | "LOW"

  // === Other New Fields ===
  stabilized_value: string;
  dissenting_opinions: string;
  next_steps: string[]; // parsed JSON array of strings
  alert_priority: string; // "HIGH" | "MEDIUM" | "LOW"
  key_due_diligence_items: string;
}

// ============================================
// Drill-Down Tab Type
// ============================================

export type DrillDownTab = "upside" | "risk" | "execution";
