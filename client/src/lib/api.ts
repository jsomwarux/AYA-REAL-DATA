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
