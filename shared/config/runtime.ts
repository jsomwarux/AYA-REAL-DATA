// Aya Dashboard Expansion — developer-edited runtime config (§3.3, §3.5, §10).
// These are intentionally one-line knobs: edit + redeploy, no rebuild logic.

/**
 * Which container numbers have physically arrived (§3.3).
 *
 * - `'ALL'` (default): every bare container number in the sheet counts as received.
 * - `Set<number>`: only the listed numbers count as arrived; all others are treated
 *   as not-yet-arrived (incoming) when recomputing "% received".
 *
 * Update this as containers land — no rebuild per container.
 * Unconfirmed hint (verify, do NOT hardcode blindly): blue ~22–23 may = arrived,
 * orange ~24–25 may = incoming.
 */
export const ARRIVED_CONTAINERS: Set<number> | 'ALL' = 'ALL';

/**
 * Whether the LR Installation "In-Room" (green) value counts as installed (§3.5).
 *
 * Default `false`: per "present ≠ installed" (§7), In-Room items recompute to 0%
 * and still surface in the actionable in-room list. Flip to `true` only if Gil's
 * team confirms In-Room means placed/done.
 */
export const IN_ROOM_COUNTS_AS_INSTALLED: boolean = false;
