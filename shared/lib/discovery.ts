// Aya Dashboard Expansion — pure structure discovery (§3.1).
// NEVER match by column letter; NEVER assume two tabs share a taxonomy. Each tab's
// packages + parts are discovered live from its own header row. These functions are
// pure (rawValues in → structure/rows out) so they unit-test without any I/O.

import type {
  RoomTab,
  RoomRow,
  PackageResult,
  PartCell,
  CommonAreaFloor,
  CommonAreaTaskCell,
  LobbyTask,
  CommonArea,
} from '../types/dashboard';
import type { ExpectedTaxonomy } from '../config/expectedTaxonomies';
import { norm, isBlank } from './normalize';
import { bucketForValue, statusForCommonArea, isDoneStatus } from './buckets';
import {
  recomputePackagePct,
  receivedWeight,
  installedWeight,
  normalizeManualPct,
  flagMismatch,
  commonAreaCompletion,
  type RecomputeOptions,
} from './recompute';
import { recomputeModeFor } from '../config/tabs';

type Grid = ReadonlyArray<ReadonlyArray<string | null | undefined>>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function cell(grid: Grid, r: number, c: number): string {
  const v = grid[r]?.[c];
  return v == null ? '' : String(v);
}

/** Clean a header for storage/matching: collapse internal whitespace (incl. the
 *  newlines the sheet wraps headers with, e.g. "Wallpaper\n& Corners") and trim. */
function cleanHeader(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

/** Parse a checkbox / boolean cell. Tolerant of TRUE/✓/yes/x. */
export function parseBool(raw: string | null | undefined): boolean {
  const n = norm(raw);
  return n === 'true' || n === '✓' || n === 'yes' || n === 'x' || n === 'checked' || n === '1';
}

/** Headers that end a package's part run / mark the trailing region (§3.1 step 4). */
function isTrailingStopHeader(header: string): boolean {
  const n = norm(header);
  if (n === '') return false;
  return (
    n.startsWith('completion') ||
    n === 'missing' ||
    n.startsWith('missing-open') ||
    n.startsWith('missing open') ||
    n === 'final qa' ||
    n.startsWith('ready to sell') ||
    n === 'notes'
  );
}

function isPackageHeader(header: string): boolean {
  return norm(header).includes('package');
}

/** Derive a package's display name from its summary header (strip "package"/%). */
function cleanPackageName(header: string): string {
  return header
    .replace(/package/gi, '')
    .replace(/%/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:]+|[\s\-:]+$/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Room-tab structure discovery (§3.1)
// ---------------------------------------------------------------------------

export interface DiscoveredPart {
  header: string;
  colIndex: number;
}

export interface DiscoveredPackage {
  name: string;
  summaryColIndex: number; // the PACKAGE column = manual %
  parts: DiscoveredPart[];
}

export interface LeadingColumns {
  floor?: number;
  /** "Floor %" (col B) — the sheet's own installation % for the whole floor.
   *  Merged across the floor's rows, so it is carried forward like Floor. */
  floorPct?: number;
  roomLine?: number; // blank-header leading column, or a "Lines" header
  roomType?: number;
  whiteBox?: number;
  /** "Room %" (col F) — the sheet's own installation % for that room. */
  roomPct?: number;
  roomNo: number;
}

export interface RoomTabStructure {
  headerRowIndex: number;
  firstDataRowIndex: number;
  leading: LeadingColumns;
  packages: DiscoveredPackage[];
  /** Trailing "Completion %" column index (HR DL / LR CU) — the sheet-sourced
   *  installation %. undefined if the tab has no such column (e.g. Containers tabs). */
  completionCol?: number;
  warnings: string[];
}

/** Find the header row: the first row (within the first few) that contains both a
 *  "Room #" anchor and at least one "PACKAGE" column. Falls back gracefully. */
function findHeaderRowIndex(grid: Grid): number {
  const limit = Math.min(grid.length, 8);
  let roomOnly = -1;
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    let hasRoom = false;
    let hasPackage = false;
    for (const c of row) {
      const n = norm(c);
      if (n === 'room #' || n === 'room#' || n.includes('room #')) hasRoom = true;
      if (n.includes('package')) hasPackage = true;
    }
    if (hasRoom && hasPackage) return r;
    if (hasRoom && roomOnly === -1) roomOnly = r;
  }
  return roomOnly !== -1 ? roomOnly : 0;
}

function mapLeadingColumns(header: ReadonlyArray<string | null | undefined>, firstPackageIdx: number): LeadingColumns {
  const leading: LeadingColumns = { roomNo: -1 };
  for (let c = 0; c < firstPackageIdx; c++) {
    const n = norm(header[c]);
    if (n === '') {
      if (leading.roomLine === undefined) leading.roomLine = c; // blank header = Room Line
      continue;
    }
    // The "%" columns are matched FIRST: "Floor %" contains "floor" and "Room %"
    // contains "room", so a looser match would let them shadow the Floor / Room #
    // label columns they sit next to.
    if (/^floor\s*%$/.test(n)) {
      if (leading.floorPct === undefined) leading.floorPct = c;
    } else if (/^room\s*%$/.test(n)) {
      if (leading.roomPct === undefined) leading.roomPct = c;
    } else if (n.includes('floor')) {
      if (leading.floor === undefined) leading.floor = c;
    } else if (n.includes('room type') || n === 'type') leading.roomType = c;
    else if (n.includes('white box') || n.includes('whitebox') || n.includes('white-box')) leading.whiteBox = c;
    else if (n === 'room #' || n === 'room#' || n.includes('room #') || n === 'room no' || n === 'room') leading.roomNo = c;
    // Room Line is usually a blank header, but the sheet also labels it "LINES".
    else if (n === 'lines' || n === 'line' || n.includes('room line')) {
      if (leading.roomLine === undefined) leading.roomLine = c;
    }
  }
  return leading;
}

/**
 * Discover a room tab's package/part structure from its grid (§3.1).
 * `expected` (optional) is used ONLY to emit validation warnings — discovery
 * itself is driven entirely by the live headers.
 */
export function discoverRoomTabStructure(grid: Grid, expected?: ExpectedTaxonomy): RoomTabStructure {
  const warnings: string[] = [];
  const headerRowIndex = findHeaderRowIndex(grid);
  const header = grid[headerRowIndex] ?? [];

  // Package-summary columns = headers containing "PACKAGE".
  const packageIndices: number[] = [];
  for (let c = 0; c < header.length; c++) {
    if (isPackageHeader(cell(grid, headerRowIndex, c))) packageIndices.push(c);
  }

  const firstPackageIdx = packageIndices.length > 0 ? packageIndices[0] : header.length;
  const leading = mapLeadingColumns(header, firstPackageIdx);
  if (leading.roomNo === -1) {
    warnings.push('Could not locate a "Room #" leading column.');
  }

  // Parts for each package = non-empty, non-trailing headers up to the next
  // package summary (or the trailing region for the last package).
  const packages: DiscoveredPackage[] = [];
  for (let k = 0; k < packageIndices.length; k++) {
    const pi = packageIndices[k];
    const next = k + 1 < packageIndices.length ? packageIndices[k + 1] : header.length;

    let name = cleanPackageName(cell(grid, headerRowIndex, pi));
    if (name === '') {
      // Fall back to a merged banner name in the row above, then to an ordinal.
      const banner = cleanPackageName(cell(grid, headerRowIndex - 1, pi));
      name = banner !== '' ? banner : `PACKAGE ${k + 1}`;
    }

    const parts: DiscoveredPart[] = [];
    for (let c = pi + 1; c < next; c++) {
      const h = cell(grid, headerRowIndex, c);
      if (isTrailingStopHeader(h)) break; // trailing region begins
      if (isBlank(h)) continue; // hidden/spacer column
      parts.push({ header: cleanHeader(h), colIndex: c });
    }
    packages.push({ name, summaryColIndex: pi, parts });
  }

  // First data row = first row after the header with a non-blank Room # cell.
  let firstDataRowIndex = headerRowIndex + 1;
  if (leading.roomNo >= 0) {
    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      if (!isBlank(cell(grid, r, leading.roomNo))) {
        firstDataRowIndex = r;
        break;
      }
    }
  }

  // Validation against the expected taxonomy (warnings only — keep working).
  if (expected) {
    const expPkgCount = expected.packages.length;
    if (packages.length !== expPkgCount) {
      warnings.push(`Discovered ${packages.length} packages; expected ${expPkgCount} (${expected.tab}).`);
    }
    const expTotalParts = expected.packages.reduce((s, p) => s + p.parts.length, 0);
    const gotTotalParts = packages.reduce((s, p) => s + p.parts.length, 0);
    if (gotTotalParts !== expTotalParts) {
      warnings.push(`Discovered ${gotTotalParts} parts; expected ${expTotalParts} (${expected.tab}).`);
    }
    const expNames = new Set(expected.packages.map((p) => norm(p.name)));
    for (const p of packages) {
      if (!expNames.has(norm(p.name))) {
        warnings.push(`Discovered package "${p.name}" not in expected taxonomy (${expected.tab}).`);
      }
    }
  }

  // Trailing "Completion %" column (HR col DL / LR col CU) — the sheet-sourced
  // installation %. Located by header so it survives column shifts.
  let completionCol: number | undefined;
  for (let c = 0; c < header.length; c++) {
    if (/^completion\s*%?$/.test(norm(cell(grid, headerRowIndex, c)))) {
      completionCol = c;
      break;
    }
  }

  return { headerRowIndex, firstDataRowIndex, leading, packages, completionCol, warnings };
}

/** Build fully-recomputed room rows from a grid + its discovered structure. */
export function buildRoomRows(
  grid: Grid,
  structure: RoomTabStructure,
  tab: RoomTab,
  opts: RecomputeOptions = {},
): RoomRow[] {
  const mode = recomputeModeFor(tab);
  const { leading } = structure;
  const rows: RoomRow[] = [];
  let currentFloor = ''; // carried forward across merged Floor cells
  let currentFloorPct: number | null = null; // ditto for the merged Floor % cell

  /** Whole-percent value of a %-column cell, or null (blank / no such column). */
  const pctAt = (r: number, col: number | undefined): number | null => {
    if (col === undefined) return null;
    const v = normalizeManualPct(cell(grid, r, col));
    return v === null ? null : Math.round(v);
  };

  for (let r = structure.firstDataRowIndex; r < grid.length; r++) {
    if (leading.roomNo < 0 || isBlank(cell(grid, r, leading.roomNo))) continue;

    const roomNo = cell(grid, r, leading.roomNo).trim();
    const line = leading.roomLine !== undefined ? cell(grid, r, leading.roomLine).trim() : '';
    const type = leading.roomType !== undefined ? cell(grid, r, leading.roomType).trim() : '';

    // Floor: the sheet merges the Floor cell across a floor's rooms, so the value
    // only appears on the first room — carry it forward. Fall back to deriving it
    // from the room number (drop the last two digits: 2701→27, 701→7).
    const floorCell = leading.floor !== undefined ? cell(grid, r, leading.floor).trim() : '';
    if (floorCell) currentFloor = floorCell;
    const floor = currentFloor || deriveFloorFromRoomNo(roomNo);

    // "Floor %" is merged the same way as Floor — carry the last seen value forward.
    const floorPctCell = pctAt(r, leading.floorPct);
    if (floorPctCell !== null) currentFloorPct = floorPctCell;
    const floorPct = leading.floorPct === undefined ? null : currentFloorPct;

    const packages: PackageResult[] = structure.packages.map((pkg) => {
      const rawParts = pkg.parts.map((p) => cell(grid, r, p.colIndex));
      const result = recomputePackagePct(rawParts, mode, opts);

      const parts: PartCell[] = pkg.parts.map((p) => {
        const rawValue = cell(grid, r, p.colIndex);
        const weight =
          mode === 'received'
            ? receivedWeight(rawValue, opts.arrivedContainers)
            : installedWeight(rawValue, opts.inRoomCountsAsInstalled);
        return {
          header: p.header,
          rawValue,
          bucket: bucketForValue(rawValue, tab, { arrivedContainers: opts.arrivedContainers }) as PartCell['bucket'],
          weight,
          isBlank: isBlank(rawValue),
        };
      });

      const manualRaw = cell(grid, r, pkg.summaryColIndex);
      const manualPct = normalizeManualPct(manualRaw);

      return {
        name: pkg.name,
        recomputedPct: Math.round(result.pct * 100),
        manualPct: manualPct === null ? null : Math.round(manualPct),
        mismatch: flagMismatch(result.pct, manualRaw),
        unrecordedCount: result.unrecordedCount,
        naOnly: pkg.parts.length > 0 && result.naCount === pkg.parts.length, // every part N/A
        parts,
      };
    });

    // Installation % is taken DIRECTLY from the sheet (never recomputed): the "Room %"
    // column the sheet now maintains, falling back to the older trailing "Completion %"
    // column when a tab still tracks it there.
    const installedPct = pctAt(r, leading.roomPct) ?? pctAt(r, structure.completionCol);

    rows.push({ roomNo, floor, floorPct, line, type, installedPct, packages });
  }

  return rows;
}

/** Derive a floor label from a room number by dropping the last two digits
 *  (2701 → "27", 701 → "7"). Returns '' for non-numeric room numbers. */
export function deriveFloorFromRoomNo(roomNo: string): string {
  const digits = (roomNo || '').replace(/\D/g, '');
  return digits.length > 2 ? digits.slice(0, -2) : '';
}

// ---------------------------------------------------------------------------
// Common-area discovery (§8.4 / §8.5)
// ---------------------------------------------------------------------------

interface CommonAreaHeader {
  headerRowIndex: number;
  area: { floor?: number; whiteBox?: number; fullyComplete?: number };
  taskCols: { header: string; colIndex: number; section?: 'A' | 'B' }[];
}

function findFloorHeaderRow(grid: Grid): number {
  const limit = Math.min(grid.length, 6);
  for (let r = 0; r < limit; r++) {
    for (const c of grid[r] ?? []) {
      if (norm(c) === 'floor') return r;
    }
  }
  return 1; // spec default: headers in row 2
}

/** Map fixed cols + task cols for a Corridors/Staircase grid. Staircase sections
 *  are split where a task header first repeats (names overlap across A/B, §8.5). */
function discoverCommonAreaHeader(grid: Grid, area: CommonArea): CommonAreaHeader {
  const headerRowIndex = findFloorHeaderRow(grid);
  const header = grid[headerRowIndex] ?? [];
  const fixed: CommonAreaHeader['area'] = {};
  const fixedCols = new Set<number>();

  for (let c = 0; c < header.length; c++) {
    const n = norm(header[c]);
    if (n === 'floor') { fixed.floor = c; fixedCols.add(c); }
    else if (n.includes('white box') || n.includes('whitebox')) { fixed.whiteBox = c; fixedCols.add(c); }
    else if (n.includes('fully completed') || n.includes('fully done')) { fixed.fullyComplete = c; fixedCols.add(c); }
    else if (n === 'area') { fixedCols.add(c); }
  }

  // Task columns = non-empty headers that aren't fixed columns, in order.
  const rawTaskCols: { header: string; colIndex: number }[] = [];
  for (let c = 0; c < header.length; c++) {
    if (fixedCols.has(c)) continue;
    const h = cell(grid, headerRowIndex, c);
    if (isBlank(h)) continue;
    rawTaskCols.push({ header: cleanHeader(h), colIndex: c });
  }

  const taskCols: CommonAreaHeader['taskCols'] = rawTaskCols.map((t) => ({ ...t }));

  if (area === 'staircase') {
    // Section B begins at the first header that repeats an earlier task name.
    const seen = new Set<string>();
    let splitAt = -1;
    for (let i = 0; i < taskCols.length; i++) {
      const n = norm(taskCols[i].header);
      if (seen.has(n)) { splitAt = i; break; }
      seen.add(n);
    }
    taskCols.forEach((t, i) => {
      t.section = splitAt >= 0 && i >= splitAt ? 'B' : 'A';
    });
  }

  return { headerRowIndex, area: fixed, taskCols };
}

/** Discover Corridors/Staircase floor rows with derived completion + checkbox flags. */
export function discoverCommonAreaFloors(
  grid: Grid,
  area: Extract<CommonArea, 'corridors' | 'staircase'>,
): { floors: CommonAreaFloor[]; warnings: string[] } {
  const warnings: string[] = [];
  const { headerRowIndex, area: fixed, taskCols } = discoverCommonAreaHeader(grid, area);
  if (fixed.floor === undefined) warnings.push(`${area}: could not locate FLOOR column.`);

  const floors: CommonAreaFloor[] = [];
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const floorVal = fixed.floor !== undefined ? cell(grid, r, fixed.floor).trim() : '';
    if (isBlank(floorVal)) continue;

    const tasks: CommonAreaTaskCell[] = taskCols.map((t) => {
      const rawValue = cell(grid, r, t.colIndex);
      return {
        header: t.header,
        section: t.section,
        rawValue,
        status: statusForCommonArea(rawValue, area),
      };
    });

    // Drop a phantom floor row: a FLOOR label whose every task cell is blank (no
    // data tracked). A floor that's all "Not Started" is NOT phantom — it has
    // values — so it is kept.
    if (tasks.every((t) => isBlank(t.rawValue))) continue;

    const completion = commonAreaCompletion(tasks.map((t) => t.rawValue));
    const derivedComplete = completion.total > 0 && completion.done === completion.total;
    const fullyComplete = fixed.fullyComplete !== undefined ? parseBool(cell(grid, r, fixed.fullyComplete)) : false;
    const whiteBox = fixed.whiteBox !== undefined ? parseBool(cell(grid, r, fixed.whiteBox)) : false;

    floors.push({
      area,
      floor: floorVal,
      whiteBox,
      fullyComplete,
      derivedComplete,
      mismatch: fullyComplete !== derivedComplete,
      tasks,
    });
  }

  return { floors, warnings };
}

// ---------------------------------------------------------------------------
// Temp/Lobby discovery (§8.6) — flat, row-driven
// ---------------------------------------------------------------------------

export function discoverLobbyTasks(
  grid: Grid,
  opts: { taskCol?: number; statusCol?: number; startRow?: number; flaggedRows?: number[] } = {},
): LobbyTask[] {
  const taskCol = opts.taskCol ?? 1; // col B
  const statusCol = opts.statusCol ?? 2; // col C
  const startRow = opts.startRow ?? 2; // row 3 (0-based 2)
  const flagged = new Set(opts.flaggedRows ?? []);

  const tasks: LobbyTask[] = [];
  for (let r = startRow; r < grid.length; r++) {
    const task = cleanHeader(cell(grid, r, taskCol));
    if (isBlank(task)) continue;
    const rawValue = cell(grid, r, statusCol);
    tasks.push({
      task,
      rawValue,
      status: statusForCommonArea(rawValue, 'lobby'),
      flagged: flagged.has(r + 1), // sheet rows are 1-based
    });
  }
  return tasks;
}

export { isDoneStatus };
