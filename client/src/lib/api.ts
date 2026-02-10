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
  _driveFolderUrl?: string;
  // Allow dynamic access for case-insensitive lookups
  [key: string]: string | number | boolean | null | undefined;
}

export interface RecapRow {
  _section: string;
  DATE: string;
  [key: string]: string | number | null;
}

export interface RecapSection {
  section: string;
  headers: string[];
  rows: RecapRow[];
}

export interface ConstructionProgressData {
  rooms: {
    headers: string[];
    rows: RoomProgress[];
    totalRooms: number;
  };
  recap: {
    headers: string[];
    sections: RecapSection[];
  };
  lastUpdated: string;
}

// Fetch Construction Progress data (new endpoint for Rooms Progress sheet)
export async function fetchConstructionProgressData(): Promise<ConstructionProgressData> {
  const response = await fetch(`${API_BASE}/construction-progress`);
  return handleResponse<ConstructionProgressData>(response);
}

// Google Drive file types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewUrl: string | null;
  size: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
}

export interface DriveFilesResponse {
  files: DriveFile[];
  folderId: string;
}

// Fetch files from a Google Drive folder
export async function fetchDriveFiles(folderUrl: string): Promise<DriveFilesResponse> {
  const response = await fetch(`${API_BASE}/drive-files?folderUrl=${encodeURIComponent(folderUrl)}`);
  return handleResponse<DriveFilesResponse>(response);
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
  costPerBedroom: number;
  costPerBathroom: number;
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

// Timeline Types
export interface TimelineTask {
  id: number;
  category: string;
  task: string;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: number;
  taskId: number;
  startDate: string;
  endDate: string;
  label: string | null;
  color: string | null;
  createdAt: string;
}

export interface TimelineData {
  tasks: TimelineTask[];
  events: TimelineEvent[];
  eventsByTask: Record<number, TimelineEvent[]>;
  categories: Record<string, TimelineTask[]>;
  weekDates: string[];
  lastUpdated: string;
}

export interface TimelineImportResult {
  success: boolean;
  imported: {
    tasks: number;
    events: number;
  };
  tasks: TimelineTask[];
  events: TimelineEvent[];
  message: string;
}

const TIMELINE_BASE = '/api/timeline';

// Fetch Timeline data
export async function fetchTimelineData(): Promise<TimelineData> {
  const response = await fetch(TIMELINE_BASE);
  return handleResponse<TimelineData>(response);
}

// Import timeline from Google Sheet
export async function importTimelineFromSheet(): Promise<TimelineImportResult> {
  const response = await fetch(`${TIMELINE_BASE}/import`, { method: 'POST' });
  return handleResponse<TimelineImportResult>(response);
}

// Create new task
export async function createTimelineTask(data: { category: string; task: string; sortOrder?: number }): Promise<TimelineTask> {
  const response = await fetch(`${TIMELINE_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<TimelineTask>(response);
}

// Update task
export async function updateTimelineTask(id: number, data: { category?: string; task?: string; sortOrder?: number }): Promise<TimelineTask> {
  const response = await fetch(`${TIMELINE_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<TimelineTask>(response);
}

// Delete task
export async function deleteTimelineTask(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${TIMELINE_BASE}/tasks/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
}

// Rename a category
export async function renameTimelineCategory(oldName: string, newName: string): Promise<{ success: boolean }> {
  const response = await fetch(`${TIMELINE_BASE}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName }),
  });
  return handleResponse<{ success: boolean }>(response);
}

// Delete entire category (all tasks + events in it)
export async function deleteTimelineCategory(categoryName: string): Promise<{ success: boolean }> {
  const response = await fetch(`${TIMELINE_BASE}/categories/${encodeURIComponent(categoryName)}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
}

// Create new event
export async function createTimelineEvent(data: { taskId: number; startDate: string; endDate?: string; label?: string; color?: string }): Promise<TimelineEvent> {
  const response = await fetch(`${TIMELINE_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<TimelineEvent>(response);
}

// Update event
export async function updateTimelineEvent(id: number, data: { startDate?: string; endDate?: string; label?: string; color?: string }): Promise<TimelineEvent> {
  const response = await fetch(`${TIMELINE_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<TimelineEvent>(response);
}

// Delete event
export async function deleteTimelineEvent(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${TIMELINE_BASE}/events/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
}

// Custom Event Types
export interface CustomEventType {
  id: number;
  label: string;
  color: string;
  createdAt: string;
}

export async function fetchCustomEventTypes(): Promise<CustomEventType[]> {
  const response = await fetch(`${TIMELINE_BASE}/event-types`);
  return handleResponse<CustomEventType[]>(response);
}

export async function createCustomEventType(data: { label: string; color: string }): Promise<CustomEventType> {
  const response = await fetch(`${TIMELINE_BASE}/event-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<CustomEventType>(response);
}

export async function updateCustomEventType(id: number, data: { label?: string; color?: string }): Promise<CustomEventType> {
  const response = await fetch(`${TIMELINE_BASE}/event-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<CustomEventType>(response);
}

export async function deleteCustomEventType(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${TIMELINE_BASE}/event-types/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(response);
}

// Weekly Goals Types
export interface WeeklyGoal {
  id: number;
  weeklyGoal: string;
  assignee: string;
  target: string;
  deadline: string;
  result: string;
  comments: string;
}

export interface WeeklyGoalsSummary {
  total: number;
  byStatus: Record<string, number>;
  byAssignee: Record<string, number>;
}

export interface WeeklyGoalsData {
  goals: WeeklyGoal[];
  summary: WeeklyGoalsSummary;
  lastUpdated: string;
}

// Fetch Weekly Goals data
export async function fetchWeeklyGoalsData(): Promise<WeeklyGoalsData> {
  const response = await fetch(`${API_BASE}/weekly-goals`);
  return handleResponse<WeeklyGoalsData>(response);
}

// Container Schedule Types
export interface ContainerScheduleItem {
  id: number;
  factory: string;
  containerLoaded: string;
  shipmentNumber: string;
  containerNumber: string;
  delivery: string;
  loadingDate: string;
  vesselDepartureDate: string;
  etaNYPort: string;
  etaWarehouse: string;
  status: string;
  bolCopy: string;
  insurance: string;
  productListWithPhotos: string;
  packingList: string;
  productDetails: string;
  warehouseProofOfDelivery: string;
}

export interface ContainerScheduleSummary {
  total: number;
  byStatus: Record<string, number>;
  byFactory: Record<string, number>;
}

export interface ContainerScheduleData {
  containers: ContainerScheduleItem[];
  summary: ContainerScheduleSummary;
  lastUpdated: string;
}

// Fetch Container Schedule data
export async function fetchContainerScheduleData(): Promise<ContainerScheduleData> {
  const response = await fetch(`${API_BASE}/container-schedule`);
  return handleResponse<ContainerScheduleData>(response);
}

// Room Overview / Specs Types
export interface RoomOverviewItem {
  id: number;
  floor: number;
  roomNumber: number;
  area: number;
  sizeCategory: string;
  roomType: string;
  bedSize: string;
  ada: string;
  connectingDoor: string;
  sinkStyle: string;
  sinkSize: string;
  showerWithGlassDoor: string;
  showerWindow: string;
  mossWall: string;
  mirrorSlidingDoor: string;
  moxyBar: string;
  miniBarSize: string;
  speakeasy: string;
  partyBoxHeadboard: string;
  curtainType: string;
  nightStands: string;
  tvSize: string;
}

export interface RoomOverviewSummary {
  total: number;
  floors: number[];
  floorCount: number;
  adaCount: number;
  byFloor: Record<number, number>;
  byRoomType: Record<string, number>;
  bySizeCategory: Record<string, number>;
  byBedSize: Record<string, number>;
}

export interface RoomOverviewData {
  rooms: RoomOverviewItem[];
  summary: RoomOverviewSummary;
  lastUpdated: string;
}

// Fetch Room Overview data
export async function fetchRoomOverviewData(): Promise<RoomOverviewData> {
  const response = await fetch(`${API_BASE}/room-overview`);
  return handleResponse<RoomOverviewData>(response);
}

// ── Vendor Invoices ─────────────────────────────────────────────────────────

export interface VendorFolder {
  name: string;
  folderId: string;
  files: DriveFile[];
  fileCount: number;
}

export interface VendorInvoicesSummary {
  totalVendors: number;
  totalFiles: number;
  byMimeType: Record<string, number>;
}

export interface VendorInvoicesData {
  vendors: VendorFolder[];
  summary: VendorInvoicesSummary;
  lastUpdated: string;
}

export async function fetchVendorInvoicesData(): Promise<VendorInvoicesData> {
  const response = await fetch(`${API_BASE}/vendor-invoices`);
  return handleResponse<VendorInvoicesData>(response);
}
