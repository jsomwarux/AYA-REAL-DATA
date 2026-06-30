// Aya Dashboard Expansion — small pure string helpers shared across the engine.
// No I/O. Keep these total (never throw) and tolerant of null/undefined cells —
// Google's values.get returns ragged rows, so cells are frequently undefined.

/** Trim + collapse internal whitespace + lowercase. Safe on null/undefined. */
export function norm(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** A cell is "blank" (unrecorded) when it has no visible content. Distinct from
 *  N/A (§7). Magenta "no container recorded" cells read back as empty strings. */
export function isBlank(raw: string | null | undefined): boolean {
  return norm(raw) === '';
}

/** N/A — excluded from denominators entirely (§7). Accepts a few spellings. */
export function isNA(raw: string | null | undefined): boolean {
  const n = norm(raw);
  return n === 'n/a' || n === 'na' || n === 'n.a.' || n === 'n/a.';
}

/** LOCAL — counts as received on Containers tabs (§7.1). */
export function isLocal(raw: string | null | undefined): boolean {
  return norm(raw) === 'local';
}
