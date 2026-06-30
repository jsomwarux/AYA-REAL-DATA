// Aya Dashboard Expansion — shared types for the 7 new tabs.
// PURELY ADDITIVE. Nothing here touches the existing "A.I Rooms WB Progress" views.
// Source of truth: aya_build_spec_v3.md (§2, §3, §6, §7, §8).

// ---------------------------------------------------------------------------
// Tab registry types
// ---------------------------------------------------------------------------

/** Room-tab type. Drives the recompute mode (§7): containers → "% received",
 *  installation → "% installed". Common-area tabs are NOT a TabType. */
export type TabType = 'containers' | 'installation';

/** Which value vocabulary a tab's cells use (§6). Note: the vocabulary derives
 *  from this field, NOT from the tower — HR Containers and LR Containers both
 *  use 'containers'; only the installation tabs split into 'hr' vs 'lr'. */
export type Vocab = 'containers' | 'hr' | 'lr';

/** Physical tower a room tab belongs to. Metadata only — never used to derive
 *  recompute mode or vocabulary (§2, §3.1). */
export type Tower = 'HR' | 'LR';

/** Recompute mode, derived from TabType (§7.1 / §7.2). */
export type RecomputeMode = 'received' | 'installed';

/** Common-area discriminant (§8). */
export type CommonArea = 'corridors' | 'staircase' | 'lobby';

/** A room tab (4 of them): the parts-and-packages model applies. */
export interface RoomTab {
  kind: 'room';
  sheetName: string;
  type: TabType;
  vocab: Vocab;
  tower: Tower;
}

/** A common-area tab (3 of them): task-list model, no packages/parts. */
export interface CommonAreaTab {
  kind: 'commonArea';
  sheetName: string;
  area: CommonArea;
}

/** Any registered tab. */
export type Tab = RoomTab | CommonAreaTab;

// ---------------------------------------------------------------------------
// Bucketing / status (§7.3)
// ---------------------------------------------------------------------------

/** Urgency bucket for room-tab part cells (§7.3). 'problem' is the LOUD tier
 *  (Not Found / Damaged / UNKNOWN LOCATION / Missing Parts) — Gil's #1 view.
 *  'other' is the never-throw fallback for values not in any §7 vocabulary. */
export type UrgencyBucket =
  | 'received'    // Received / Done — counts toward % (green)
  | 'incoming'    // Incoming — low priority (neutral)
  | 'upstream'    // Upstream — higher priority (warning)
  | 'problem'     // LOUD — high-priority alert
  | 'attention'   // Mid alert
  | 'unrecorded'  // Blank — kept in denominator, surfaced separately
  | 'excluded'    // N/A — excluded from the denominator entirely
  | 'other';      // Unrecognized value — surfaced, weight 0, never throws

/** Derived status for a common-area task cell (§7.3, common areas).
 *  'other' is the never-crash fallback for unknown values. */
export type StatusState =
  | 'done'
  | 'in-progress'
  | 'blocker'      // Waiting on product (Corridors) / Need to order (Temp/Lobby)
  | 'in-motion'    // Ordered
  | 'not-started'  // Not Yet / Not Started
  | 'other';

// ---------------------------------------------------------------------------
// Room-tab result types
// ---------------------------------------------------------------------------

/** A parsed container reference from a cell, e.g. "Container 3 & 4" → {numbers:[3,4]}.
 *  `partial` is true for "Container X & In China" (one arrived, rest still upstream). */
export interface ContainerRef {
  numbers: number[];
  partial: boolean;
}

/** A single part cell, after reading + bucketing (§7).
 *  `weight` is the numerator contribution: 1 (received/installed), 0.5 (In Progress, HR),
 *  or 0. `isBlank` distinguishes unrecorded (magenta) cells from N/A. */
export interface PartCell {
  header: string;
  rawValue: string;
  bucket: UrgencyBucket;
  weight: number;
  isBlank: boolean;
}

/** One package's recomputed result for one room (§3.2, §7).
 *  `manualPct` is what the sheet's PACKAGE-summary cell claims (null if absent/blank).
 *  `recomputedPct` is computed from parts; `mismatch` flags stale sheet entries.
 *  `unrecordedCount` = blank part cells (kept in denominator). */
export interface PackageResult {
  name: string;
  recomputedPct: number;
  manualPct: number | null;
  mismatch: boolean;
  unrecordedCount: number;
  parts: PartCell[];
}

/** One room's row across a room tab. */
export interface RoomRow {
  roomNo: string;
  line: string;        // Room Line, e.g. "LR-LINE1" (blank-header leading column)
  type: string;        // Room Type, e.g. "King", "LR-CAVE", "King ADA"
  packages: PackageResult[];
}

// ---------------------------------------------------------------------------
// Common-area result types (§8)
// ---------------------------------------------------------------------------

/** A single task cell on a common-area floor row. `section` is set only for
 *  Staircase (A/B), whose task names overlap and must stay namespaced (§8.5). */
export interface CommonAreaTaskCell {
  header: string;
  section?: 'A' | 'B';
  rawValue: string;
  status: StatusState;
}

/** A floor row for Corridors or Staircase (§8.4 / §8.5).
 *  `fullyComplete` is the sheet's FULLY COMPLETED / FULLY DONE checkbox;
 *  `derivedComplete` is recomputed from task cells; `mismatch` flags disagreement. */
export interface CommonAreaFloor {
  area: Extract<CommonArea, 'corridors' | 'staircase'>;
  floor: string;
  whiteBox: boolean;
  fullyComplete: boolean;
  derivedComplete: boolean;
  mismatch: boolean;
  tasks: CommonAreaTaskCell[];
}

/** A row in the flat Temp/Lobby task list (§8.6). */
export interface LobbyTask {
  task: string;
  rawValue: string;
  status: StatusState;
  flagged: boolean;   // e.g. row 17 "PHR Alarm System" manually red-flagged
}
