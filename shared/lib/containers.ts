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
 * `partial` is true only when at least one container number IS present AND there is
 * also a non-numeric remainder (e.g. "In China") — i.e. a genuine partial arrival.
 */
export function parseContainerRef(raw: string | null | undefined): ContainerRef {
  const s = (raw ?? '').trim();
  if (s === '') return { numbers: [], partial: false };

  // Strip an optional leading "Container" / "Containers" label.
  const body = s.replace(/^\s*containers?\s*/i, '');

  // Split on "&" or the standalone word "and" (case-insensitive), either separator.
  const tokens = body
    .split(/\s*(?:&|\band\b)\s*/i)
    .map((t) => t.trim())
    .filter((t) => t !== '');

  const numbers: number[] = [];
  let hasNonNumeric = false;

  for (const tok of tokens) {
    const m = tok.match(/^#?\s*(\d{1,3})$/); // a bare/“#” container number, 1–3 digits
    if (m) {
      numbers.push(parseInt(m[1], 10));
    } else {
      hasNonNumeric = true;
    }
  }

  return { numbers, partial: numbers.length > 0 && hasNonNumeric };
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
