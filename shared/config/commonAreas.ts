// Aya Dashboard Expansion — common-area tab configs (§8).
// Validation + display labels only; the reader still reads populated rows/columns
// dynamically by header (§3.1). Typos preserved verbatim.
//
// Shared layout (Corridors + Staircase, §8): row 1 = decorative banners (ignore),
// headers in row 2, data from row 3. Floors run 27→12 skipping 13 = 15 floors.

// ---------------------------------------------------------------------------
// §8.4 — CORRIDORS: 32 task columns (E→AJ), in order.
// Fixed cols: A=AREA · B=WHITE BOX · C=FULLY COMPLETED · D=FLOOR.
// Statuses: Completed · In progress · Waiting on product · Not Started.
// Blocker = Waiting on product.
// ---------------------------------------------------------------------------
export const CORRIDORS_TASKS: string[] = [
  'Wallpaper Modings & Corners Removal',
  'Carpet +Padding & Glue Removal',
  'Floor Grinding & Repairs',
  'Molded & Damage Walls Removal',
  'Ceiling New LED & Recessed Light Wiring',
  'Baseboard Led opening',
  'Baseboard Led Preparation',
  'Sheetrock Replacement',
  'Doorbell Electric Box prep',
  'New Fire Alarm Install',
  'Walls Plastering',
  'Ceiling Plastering',
  'Walls & Ceiling Sanding',
  'Prime Paint',
  'Door Lock Removal',
  'Access Panels & Vents Removal',
  'Access Panels & Vents Painting',
  'Door Lock Repair + Sanding',
  'By GESI Lock New Opening',
  'Walls &Ceiling Painting 1st coat',
  'Painted Panels & Vents Install',
  'Guest, Exits, Closets Door Painting',
  'Doorbell Installation',
  'Room Rumber With Brail', // sic
  'By GESI New Lock Installation',
  'Baseboard &LED Installation',
  'Exits, Floor & Elevator Signs',
  'Door Number Installation',
  'Camera Installation',
  'Floor Cleaning',
  'Padding Installing',
  'Carpet Installation',
];

// ---------------------------------------------------------------------------
// §8.5 — STAIRCASE: two sections, kept separate because task names overlap.
// Fixed cols: A=AREA · B=FULLY DONE · C=WHITE BOX · D=FLOOR. (A1 "LADY D" — ignore.)
// Statuses: Completed · Not Yet · Not Started.
// ---------------------------------------------------------------------------

/** Section A (E–N, 10 tasks). */
export const STAIRCASE_SECTION_A_TASKS: string[] = [
  'Molded & Damage Walls Removal',
  'Sheetrock Replacement',
  'Walls Plastering',
  'Walls Sanding',
  'Walls & Ceiling Paint',
  'Rails & Floor Painting',
  'Light Fixtures',
  'Exits & Floor Door Signs',
  'Camera Installation',
  'Alarms Replacement',
];

/** Section B (O–AB, 14 tasks). */
export const STAIRCASE_SECTION_B_TASKS: string[] = [
  'Molded & Damage Walls Removal',
  'Sheetrock Replacement',
  'Walls Plastering',
  'Walls Sanding',
  'Ceiling Prime Paint',
  'Walls Prime Paint',
  'Ceiling Walls Finish Paint',
  'Rails & Floor Painting',
  'Light Fixtures',
  'Exits & Floor Signs',
  'Camera Installation',
  'Alarms Replacement',
  'Sprinkler System Check',
  'Fire Extingsher', // sic
];

// ---------------------------------------------------------------------------
// §8.6 — TEMP/LOBBY: flat, row-driven task list — NO fixed task list.
// Col B = TASKS (rows 3–46) · Col C = STATUS. Photos in cols D+ → ignore.
// Statuses: Done · In progress · Not Started · Need to order · Ordered.
// Blocker = Need to order. Row 17 ("PHR Alarm System") manually red-flagged.
// ---------------------------------------------------------------------------
export const TEMP_LOBBY_CONFIG = {
  taskColumn: 'B',
  statusColumn: 'C',
  dataStartRow: 3,
  dataEndRow: 46,
  /** Rows manually red-flagged in the sheet (1-based sheet row numbers). */
  flaggedRows: [17] as number[],
} as const;

/** Floors common to Corridors + Staircase: 27→12 skipping 13 = 15 floors (§8). */
export const COMMON_AREA_FLOORS: number[] = [
  27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 12,
];
