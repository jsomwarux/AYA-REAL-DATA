// Aya Dashboard Expansion — container-reference parsing (§6.1, §6.2, §7.1).
// Pure, no I/O, never throws.

import type { ContainerRef } from '../types/dashboard';
import { norm } from './normalize';

/**
 * Parse a container cell into its referenced container numbers + a partial flag.
 *
 * Handles every documented split format (§6.1, change #3):
 *   "Container 5"            → { numbers: [5],    partial: false }
 *   "Container 3 & 4"        → { numbers: [3, 4], partial: false }
 *   "Container 3 and 4"      → { numbers: [3, 4], partial: false }   (word "and")
 *   "Container 5 & In China" → { numbers: [5],    partial: true  }   (one arrived, rest upstream)
 *   "22"                     → { numbers: [22],   partial: false }   (bare number, §3.3)
 *
 * Non-container values ("In China", "Installed", "Not Found", blank, …) parse to
 * { numbers: [], partial: false } — no numbers, so callers treat them as 0.
 *
 * `partial` is true only when a container number IS present AND the cell explicitly
 * says "In China" — i.e. this container landed, the rest is still upstream (§6.1). A
 * plain multi-container split ("16 & 25") or a typo'd label is NOT partial.
 */
export function parseContainerRef(raw: string | null | undefined): ContainerRef {
  const s = (raw ?? '').trim();
  if (s === '') return { numbers: [], partial: false };

  // Strip a leading "Container"/"Containers" label, tolerating the "Contanier"
  // misspelling seen in the sheet: any leading word starting "cont…".
  const body = s.replace(/^\s*cont[a-z]*\s*/i, '');

  // Split on "&", the standalone word "and", or a comma — all seen as separators
  // ("Container 7, 11 & 23"). Case-insensitive.
  const tokens = body
    .split(/\s*(?:&|\band\b|,)\s*/i)
    .map((t) => t.trim())
    .filter((t) => t !== '');

  const numbers: number[] = [];
  for (const tok of tokens) {
    const m = tok.match(/^#?\s*(\d{1,3})$/); // a bare/“#” container number, 1–3 digits
    if (m) numbers.push(parseInt(m[1], 10));
  }

  // Partial = a container number plus an explicit "In China" remainder. A plain
  // split or a typo'd non-numeric token does NOT make it partial.
  return { numbers, partial: numbers.length > 0 && /china/i.test(s) };
}

/** Whether every referenced container number has arrived, per ARRIVED_CONTAINERS. */
export function allContainersArrived(
  numbers: number[],
  arrived: Set<number> | 'ALL',
): boolean {
  if (numbers.length === 0) return false;
  if (arrived === 'ALL') return true;
  return numbers.every((n) => arrived.has(n));
}

/** True if the raw cell is purely an "In China" remainder marker (no number). */
export function isInChinaOnly(raw: string | null | undefined): boolean {
  const n = norm(raw);
  return n === 'in china' || n === 'remaining' || n === 'remaining / in china' || n === 'remaining/in china';
}
