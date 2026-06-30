// Aya Dashboard Expansion — recompute engine (§3.2, §7).
// Pure, no I/O. Recompute every % from the part cells; never trust the manual %.

import type { RecomputeMode } from '../types/dashboard';
import { norm, isNA, isBlank, isLocal } from './normalize';
import { parseContainerRef, allContainersArrived } from './containers';
import { isDoneStatus } from './buckets';
import { ARRIVED_CONTAINERS, IN_ROOM_COUNTS_AS_INSTALLED } from '../config/runtime';

export interface RecomputeOptions {
  /** Overrides ARRIVED_CONTAINERS (§3.3). */
  arrivedContainers?: Set<number> | 'ALL';
  /** Overrides IN_ROOM_COUNTS_AS_INSTALLED (§3.5). */
  inRoomCountsAsInstalled?: boolean;
}

export interface PackagePctResult {
  /** Recomputed completion as a 0..1 fraction (numerator / denominator). */
  pct: number;
  numerator: number;
  /** Cells counted toward the denominator (everything except N/A). */
  denominator: number;
  /** Blank cells — counted as not-done in the denominator AND tallied here (§7). */
  unrecordedCount: number;
  /** N/A cells — excluded from the denominator entirely (§7). */
  naCount: number;
}

// ---------------------------------------------------------------------------
// Per-cell weights
// ---------------------------------------------------------------------------

/** "% received" weight (§7.1): arrived container number(s) (ALL listed arrived)
 *  or LOCAL = 1; everything else (incl. "X & In China" partial, upstream,
 *  Not Found, Damaged, blank) = 0. */
export function receivedWeight(
  raw: string | null | undefined,
  arrived: Set<number> | 'ALL' = ARRIVED_CONTAINERS,
): number {
  if (isBlank(raw) || isNA(raw)) return 0;
  if (isLocal(raw)) return 1;
  const ref = parseContainerRef(raw);
  if (ref.numbers.length > 0 && !ref.partial && allContainersArrived(ref.numbers, arrived)) {
    return 1;
  }
  return 0;
}

/** "% installed" weight (§7.2): Installed = 1; In Progress = 0.5 (HR only ever
 *  emits this); In-Room (LR) = 0 unless IN_ROOM_COUNTS_AS_INSTALLED; else 0
 *  (present-but-not-installed is still 0). */
export function installedWeight(
  raw: string | null | undefined,
  inRoomCountsAsInstalled: boolean = IN_ROOM_COUNTS_AS_INSTALLED,
): number {
  if (isBlank(raw) || isNA(raw)) return 0;
  const n = norm(raw);
  if (n === 'installed') return 1;
  if (n === 'in progress') return 0.5;
  if (n === 'in-room' || n === 'in room') return inRoomCountsAsInstalled ? 1 : 0;
  return 0;
}

// ---------------------------------------------------------------------------
// Package recompute
// ---------------------------------------------------------------------------

/**
 * Recompute a package's completion from its part cells (§3.2, §7).
 * N/A is excluded from the denominator; BLANK is 0 but KEPT in the denominator
 * and tallied as unrecorded.
 */
export function recomputePackagePct(
  rawValues: ReadonlyArray<string | null | undefined>,
  mode: RecomputeMode,
  opts: RecomputeOptions = {},
): PackagePctResult {
  const arrived = opts.arrivedContainers ?? ARRIVED_CONTAINERS;
  const inRoom = opts.inRoomCountsAsInstalled ?? IN_ROOM_COUNTS_AS_INSTALLED;

  let numerator = 0;
  let denominator = 0;
  let unrecordedCount = 0;
  let naCount = 0;

  for (const raw of rawValues) {
    if (isNA(raw)) {
      naCount++;
      continue; // excluded from denominator
    }
    denominator++;
    if (isBlank(raw)) {
      unrecordedCount++;
      continue; // 0, but stays in denominator
    }
    numerator += mode === 'received' ? receivedWeight(raw, arrived) : installedWeight(raw, inRoom);
  }

  const pct = denominator > 0 ? numerator / denominator : 0;
  return { pct, numerator, denominator, unrecordedCount, naCount };
}

// ---------------------------------------------------------------------------
// Mismatch flagging (§3.2)
// ---------------------------------------------------------------------------

/** Normalize a manual package-% cell to a 0..100 number, or null if unparseable.
 *  Accepts "75%", "75", 75, 0.75. Values ≤ 1 (and not "%") are read as fractions. */
export function normalizeManualPct(
  manual: number | string | null | undefined,
): number | null {
  if (manual === null || manual === undefined) return null;
  if (typeof manual === 'number') {
    if (!Number.isFinite(manual)) return null;
    return manual <= 1 ? manual * 100 : manual;
  }
  const s = manual.trim();
  if (s === '') return null;
  const hasPct = s.includes('%');
  const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  if (Number.isNaN(num)) return null;
  if (hasPct) return num;
  return num <= 1 ? num * 100 : num;
}

/**
 * Flag a stale manual % (§3.2). `recomputed` is a 0..1 fraction (from
 * recomputePackagePct). Both sides round to whole percents before comparing.
 * Returns false when there is no manual value to compare against.
 */
export function flagMismatch(
  recomputed: number,
  manual: number | string | null | undefined,
): boolean {
  const m = normalizeManualPct(manual);
  if (m === null) return false;
  return Math.round(recomputed * 100) !== Math.round(m);
}

// ---------------------------------------------------------------------------
// Common-area completion (§8)
// ---------------------------------------------------------------------------

export interface CompletionResult {
  done: number;
  /** Cells counted (everything except N/A; blanks count as not-done). */
  total: number;
  /** done / total as a 0..1 fraction. */
  pct: number;
}

/** Completion for a common-area row/section: done / total, excluding N/A (§8). */
export function commonAreaCompletion(
  rawValues: ReadonlyArray<string | null | undefined>,
): CompletionResult {
  let done = 0;
  let total = 0;
  for (const raw of rawValues) {
    if (isNA(raw)) continue; // excluded
    total++;
    if (isDoneStatus(raw)) done++;
  }
  return { done, total, pct: total > 0 ? done / total : 0 };
}
