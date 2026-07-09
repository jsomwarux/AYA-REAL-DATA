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

// ---------------------------------------------------------------------------
// Dashboard Expansion — Exceptions Panel (§9 item 1)
// ---------------------------------------------------------------------------

export type ExceptionSeverity = 'loud' | 'attention';

export interface ExceptionItem {
  severity: ExceptionSeverity;
  tab: string;          // sheet name, e.g. "LR-Installation Progress"
  tower: 'HR' | 'LR';
  roomNo: string;
  line: string;
  type: string;
  package: string;
  part: string;         // part header
  rawValue: string;
  reason: string;       // canonical label, e.g. "Not Found"
}

export interface ExceptionsResponse {
  generatedAt: string;
  counts: { loud: number; attention: number; total: number };
  items: ExceptionItem[];
  tabsScanned: string[];
  missingTabs: string[];
}

// Fetch the cross-tab exceptions feed (all 4 room tabs)
export async function fetchExpansionExceptions(): Promise<ExceptionsResponse> {
  const response = await fetch('/api/expansion/exceptions');
  return handleResponse<ExceptionsResponse>(response);
}

// ---------------------------------------------------------------------------
// Dashboard Expansion — Floor → Room rollup (§9 item 2)
// ---------------------------------------------------------------------------

export type UrgencyBucket =
  | 'received' | 'incoming' | 'upstream' | 'problem'
  | 'attention' | 'unrecorded' | 'excluded' | 'other';

export interface RollupPart {
  header: string;
  rawValue: string;
  bucket: UrgencyBucket;
  weight: number;
  isBlank: boolean;
}

export interface RollupPackageSide {
  name: string;
  recomputedPct: number;       // engine-recomputed (primary)
  manualPct: number | null;    // sheet's manual % (secondary)
  mismatch: boolean;           // recomputed ≠ manual (§3.2)
  unrecordedCount: number;     // blank parts (gap indicator)
  naOnly: boolean;             // every part N/A → show "N/A", not 0%
  parts: RollupPart[];
}

export interface RollupPackage {
  name: string;
  received: RollupPackageSide | null;   // from the tower's Containers tab
  installed: RollupPackageSide | null;  // from the Installation tab
}

export interface RollupRoom {
  key: string;   // unique within tower ("roomNo#occurrence") — distinguishes suite sub-rooms
  roomNo: string;
  floor: string;
  line: string;
  type: string;
  installedPct: number | null;   // sheet Completion % (HR DL / LR CU), not recomputed
  installedApplicable: number;   // non-N/A installed-part count (weight for averages)
  packages: RollupPackage[];
}

export interface RollupFloor {
  floor: string;
  installedPct: number | null;   // part-count-weighted avg of rooms' Completion%
  rooms: RollupRoom[];
}

export interface RollupTower {
  tower: 'HR' | 'LR';
  containersTab: string;
  installationTab: string;
  installedPct: number | null;   // part-count-weighted avg across the tower's rooms
  floors: RollupFloor[];
  duplicateRooms: string[];   // Room #s spanning multiple rows (e.g. suite main + LV)
}

export interface RollupResponse {
  generatedAt: string;
  towers: RollupTower[];
  missingTabs: string[];
}

// Fetch the joined Floor → Room rollup (both towers)
export async function fetchExpansionRollup(): Promise<RollupResponse> {
  const response = await fetch('/api/expansion/rollup');
  return handleResponse<RollupResponse>(response);
}

// --- Delivery view (§9 item 3, reframed around outstanding parts by stage) ---
export type DeliveryStage =
  | 'received' | 'in-ny-port' | 'in-transit' | 'partial-china' | 'in-china'
  | 'in-production' | 'production-needed' | 'unrecorded' | 'problem' | 'excluded' | 'other';

export interface OutstandingPart {
  tower: 'HR' | 'LR';
  roomNo: string;
  floor: string;
  line: string;
  type: string;
  package: string;
  part: string;
  rawValue: string;
  stage: DeliveryStage;
}

export interface StageGroup {
  stage: DeliveryStage;
  count: number;
  parts: OutstandingPart[];
}

export interface ContainerBlockedPart {
  tower: 'HR' | 'LR';
  tab: string;
  sources: ('containers' | 'installation')[];
  roomNo: string;
  floor: string;
  line: string;
  type: string;
  package: string;
  part: string;
  rawValue: string;
  partial: boolean;   // "Container X & In China"
}

export interface ContainerGroup {
  number: number;
  arrived: boolean;
  roomCount: number;
  partCount: number;
  partialCount: number;
  entries: ContainerBlockedPart[];
}

export interface ContainersResponse {
  generatedAt: string;
  arrivedConfig: 'ALL' | number[];
  summary: { incoming: number; received: number; problems: number; partials: number; containers: number };
  stages: StageGroup[];      // outstanding parts, ordered closest → furthest
  containers: ContainerGroup[];
  missingTabs: string[];
}

export async function fetchExpansionContainers(): Promise<ContainersResponse> {
  const response = await fetch('/api/expansion/containers');
  return handleResponse<ContainersResponse>(response);
}

// --- Common-area views (§8, §9 item 4) ---
export type StatusState = 'done' | 'in-progress' | 'blocker' | 'in-motion' | 'not-started' | 'other';

export interface CommonAreaTask {
  header: string;
  section?: 'A' | 'B';   // Staircase only
  rawValue: string;
  status: StatusState;
}

export interface CommonAreaFloor {
  area: 'corridors' | 'staircase';
  floor: string;
  whiteBox: boolean;
  fullyComplete: boolean;   // sheet's FULLY COMPLETED / FULLY DONE checkbox
  derivedComplete: boolean; // recomputed from task cells
  mismatch: boolean;        // checkbox vs derived disagree
  tasks: CommonAreaTask[];
}

export interface CommonAreaResponse {
  ok: boolean;
  tab: string;
  resolvedTitle: string;
  kind: 'commonArea';
  area: 'corridors' | 'staircase';
  floorCount: number;
  floors: CommonAreaFloor[];
  warnings: string[];
}

export interface LobbyTask {
  task: string;
  rawValue: string;
  status: StatusState;
  flagged: boolean;   // manually red-flagged (e.g. PHR Alarm System)
}

export interface LobbyResponse {
  ok: boolean;
  tab: string;
  resolvedTitle: string;
  kind: 'commonArea';
  area: 'lobby';
  taskCount: number;
  completion: { done: number; total: number; pct: number };
  tasks: LobbyTask[];
  warnings: string[];
}

export async function fetchCommonArea(slug: 'corridors' | 'staircase'): Promise<CommonAreaResponse> {
  return handleResponse<CommonAreaResponse>(await fetch(`/api/expansion/${slug}`));
}
export async function fetchLobby(): Promise<LobbyResponse> {
  return handleResponse<LobbyResponse>(await fetch('/api/expansion/temp-lobby'));
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

// Budget Types — sourced from the "Schedule Summary" tab (see shared/lib/budget.ts).
export interface BudgetLineItem {
  id: number;                // sheet row number
  name: string;              // column A
  category: string;          // column F, raw trimmed ("" grouped as Uncategorized)
  displayCategory: string;   // pretty label (typos fixed; blank → "Uncategorized")
  estimatedCost: number;     // column C
  paid: number;              // column D
  requiredForLowRise: boolean; // column E
}

export interface BudgetCategory {
  name: string;              // raw grouping key (or "Uncategorized")
  displayName: string;       // pretty label
  total: number;             // Σ estimated cost in this category
  pct: number;               // % of estimatedBeforeContingency
  count: number;
}

export interface BudgetTotals {
  estimatedBeforeContingency: number; // Σ column C (the category chart sums to this)
  contingencyRate: number;            // 0.10
  contingency: number;                // Σ C × rate
  total: number;                      // headline "Total Budget" (incl. contingency)
  paid: number;                       // Σ column D
  paidPct: number;                    // paid / total × 100
  remaining: number;                  // total − paid
  units: number;                      // 166
  costPerUnit: number;                // total / units
}

export interface BudgetData {
  tab: string;
  totals: BudgetTotals;
  categories: BudgetCategory[]; // sorted by total desc
  items: BudgetLineItem[];
  meta: { headerRow: number; firstItemRow: number; lastItemRow: number; totalRow: number; lineItemCount: number };
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

// Useful Links
export interface UsefulLink {
  label: string;
  url: string;
  page: string;
}

export interface UsefulLinksData {
  links: UsefulLink[];
}

export async function fetchUsefulLinks(): Promise<UsefulLinksData> {
  const response = await fetch(`${API_BASE}/useful-links`);
  return handleResponse<UsefulLinksData>(response);
}
