// API client for Google Sheets data

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

export interface SheetData {
  headers: string[];
  rows: SheetRow[];
  rawValues: string[][];
}

const API_BASE = '/api/sheets';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// Fetch Construction Oversight data
export async function fetchConstructionData(range?: string): Promise<SheetData> {
  const params = range ? `?range=${encodeURIComponent(range)}` : '';
  const response = await fetch(`${API_BASE}/construction${params}`);
  return handleResponse<SheetData>(response);
}

// Fetch Deal Intelligence data
export async function fetchDealsData(range?: string): Promise<SheetData> {
  const params = range ? `?range=${encodeURIComponent(range)}` : '';
  const response = await fetch(`${API_BASE}/deals${params}`);
  return handleResponse<SheetData>(response);
}

// Fetch data from any sheet
export async function fetchSheetData(spreadsheetId: string, range?: string): Promise<SheetData> {
  const params = range ? `?range=${encodeURIComponent(range)}` : '';
  const response = await fetch(`${API_BASE}/sheet/${spreadsheetId}${params}`);
  return handleResponse<SheetData>(response);
}

// Get spreadsheet info
export async function fetchSpreadsheetInfo(spreadsheetId: string) {
  const response = await fetch(`${API_BASE}/info/${spreadsheetId}`);
  return handleResponse(response);
}

// Health check
export async function checkHealth() {
  const response = await fetch('/api/health');
  return handleResponse(response);
}

// Construction Progress Types
// Field names match exactly what's in Row 3 of the Google Sheet
export interface RoomProgress {
  'ROOM #': string | number;
  // Bathroom fields (Columns C-N)
  'Demo Status'?: string;           // DEMO DONE, CLEAN/REPAIR, Approved Demo
  'Electrical Wiring'?: boolean;    // Checkbox
  'Speaker Line'?: boolean;         // Checkbox (Bathroom)
  'Waterproofing'?: string;         // Completed, Clean and Repair, Not yet
  'Sheetrock'?: string;             // Ceiling closed, Installed, Not yet (Bathroom is dropdown)
  'Wall Patching'?: string;         // Done, Not yet
  'Repair Door Opening'?: string;   // Completed, External Door, Keep Existing, Not yet
  'New Wall Grout'?: boolean;       // Checkbox
  'Shower Valves'?: string;         // no work done yet, New Parts replaced, New 2 way valve, New 3 way valve
  'Soap Niche Built'?: string;      // Not yet, Done, Not required
  'Tile %'?: string;                // 25%, 50%, 75%, 95%, 100%, blank
  'Linear Drain Installed'?: string; // Not yet, Done, Not Required
  // Bedroom fields (Columns O-Z)
  'Electric Wiring'?: boolean;      // Checkbox
  'Data Jack Protection'?: boolean; // Checkbox
  'Curtain Box'?: boolean;          // Checkbox
  'New HVAC Unit'?: boolean;        // Checkbox
  'Wall Plastering'?: boolean;      // Checkbox
  'Sanding'?: boolean;              // Checkbox
  'Corner Sanding'?: boolean;       // Checkbox
  'Prime Paint'?: boolean;          // Checkbox
  'Finish Paint'?: boolean;         // Checkbox
  'Flooring'?: boolean;             // Checkbox
  // Metadata
  retrieved_at?: string;
  // Allow dynamic access for case-insensitive lookups
  [key: string]: string | number | boolean | null | undefined;
}

export interface RecapRow {
  [key: string]: string | number | null;
}

export interface ConstructionProgressData {
  rooms: {
    headers: string[];
    rows: RoomProgress[];
    totalRooms: number;
  };
  recap: {
    headers: string[];
    rows: RecapRow[];
  };
  lastUpdated: string;
}

// Fetch Construction Progress data (new endpoint for Rooms Progress sheet)
export async function fetchConstructionProgressData(): Promise<ConstructionProgressData> {
  const response = await fetch(`${API_BASE}/construction-progress`);
  return handleResponse<ConstructionProgressData>(response);
}

// Budget Types
export interface BudgetItem {
  id: number;
  category: string;
  vendor: string;
  project: string;
  status: string;
  subtotal: number;
}

export interface BudgetTotals {
  total: number;
  contingency: number;
  totalBudget: number;
  hardCosts: number;
  softCosts: number;
  paidThusFar: number;
  costPerRoom: number;
  totalRooms: number;
}

export interface CategoryBreakdown {
  name: string;
  total: number;
  paid: number;
}

export interface VendorBreakdown {
  name: string;
  total: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  total: number;
}

export interface BudgetData {
  items: BudgetItem[];
  totals: BudgetTotals;
  categoryBreakdown: CategoryBreakdown[];
  vendorBreakdown: VendorBreakdown[];
  statusBreakdown: StatusBreakdown[];
  itemCount: number;
  lastUpdated: string;
}

// Fetch Budget data
export async function fetchBudgetData(): Promise<BudgetData> {
  const response = await fetch(`${API_BASE}/budget`);
  return handleResponse<BudgetData>(response);
}
