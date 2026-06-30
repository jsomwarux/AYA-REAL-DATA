// Aya Dashboard Expansion — value → bucket/status classification (§7.3).
// Pure, no I/O, NEVER throws: any unrecognized value falls through to 'other'.
// This drives Gil's #1 view (the LOUD "problem" tier), so the per-vocab maps
// below are transcribed directly from §7.3.

import type {
  Tab,
  UrgencyBucket,
  StatusState,
  CommonArea,
} from '../types/dashboard';
import { norm, isBlank, isNA, isLocal } from './normalize';
import { parseContainerRef, allContainersArrived } from './containers';
import { ARRIVED_CONTAINERS } from '../config/runtime';

export interface BucketOptions {
  /** Overrides ARRIVED_CONTAINERS (tests / runtime). */
  arrivedContainers?: Set<number> | 'ALL';
}

/** Normalize for matching: lowercase + collapse whitespace + tighten slashes
 *  ("ON-site/ Missing Other" → "on-site/missing other"). */
function key(raw: string | null | undefined): string {
  return norm(raw).replace(/\s*\/\s*/g, '/');
}

// ---------------------------------------------------------------------------
// Containers vocab — HR Containers + LR Containers (§6.1, §7.3)
// ---------------------------------------------------------------------------
function bucketContainers(
  raw: string | null | undefined,
  arrived: Set<number> | 'ALL',
): UrgencyBucket {
  if (isBlank(raw)) return 'unrecorded';
  if (isNA(raw)) return 'excluded';

  const k = key(raw);

  // LOUD — Gil's priority (§7.3, §161)
  if (k === 'not found') return 'problem';
  if (k === 'damaged') return 'problem';

  if (isLocal(raw)) return 'received';

  // Container number(s): all-arrived → received; partial ("X & In China") or
  // not-yet-arrived numbers → incoming-low.
  const ref = parseContainerRef(raw);
  if (ref.numbers.length > 0) {
    if (ref.partial) return 'incoming';
    return allContainersArrived(ref.numbers, arrived) ? 'received' : 'incoming';
  }

  // Upstream — higher priority (warning)
  if (
    k === 'in china' ||
    k === 'remaining' ||
    k === 'remaining/in china' ||
    k === 'in production' ||
    k === 'production needed'
  ) {
    return 'upstream';
  }

  // Incoming — low
  if (k === 'in transit' || k === 'in ny port' || k === 'in transit/in ny port') {
    return 'incoming';
  }

  return 'other';
}

// ---------------------------------------------------------------------------
// HR Installation vocab — superset of Containers + install states (§6.2, §7.3)
// ---------------------------------------------------------------------------
function bucketHrInstall(
  raw: string | null | undefined,
  arrived: Set<number> | 'ALL',
): UrgencyBucket {
  if (isBlank(raw)) return 'unrecorded';
  if (isNA(raw)) return 'excluded';

  const k = key(raw);

  if (k === 'installed') return 'received';
  if (k === 'missing parts') return 'problem'; // LOUD adds Missing Parts (§7.3)
  if (k === 'in progress') return 'incoming'; // in-motion (0.5 in %); not an exception

  // Present-but-not-installed location states → incoming (not done, not LOUD)
  if (
    k === 'in room not installed' ||
    k === 'on-site not installed' ||
    k === 'container not installed' ||
    k === 'on-site/office' ||
    k === 'in warehouse'
  ) {
    return 'incoming';
  }

  // Superset: everything else resolves through the Containers vocab.
  return bucketContainers(raw, arrived);
}

// ---------------------------------------------------------------------------
// LR Installation vocab — its OWN dropdown (§6.3, §7.3, §3.4)
// ---------------------------------------------------------------------------
function bucketLrInstall(
  raw: string | null | undefined,
  arrived: Set<number> | 'ALL',
): UrgencyBucket {
  if (isBlank(raw)) return 'unrecorded';
  if (isNA(raw)) return 'excluded';

  const k = key(raw);

  if (k === 'installed') return 'received';

  // LOUD (§3.4): Damaged + UNKNOWN LOCATION are the loudest problems.
  if (k === 'damaged') return 'problem';
  if (k === 'unknown location') return 'problem';

  // Attention tier (§3.4)
  if (k === 'on-site/missing other') return 'attention';
  if (k === 'confirm item') return 'attention';
  if (k === 'not in room') return 'attention'; // missing from room — actionable

  // In-room actionable (present, pending install). The IN_ROOM_COUNTS_AS_INSTALLED
  // toggle affects the % weight (recompute), not the severity bucket.
  if (k === 'in-room' || k === 'in room') return 'incoming';
  if (k === 'in room not installed') return 'incoming';

  // Incoming / upstream locations
  if (k === 'in warehouse' || k === 'in ny port' || k === 'unpacked/tbd') return 'incoming';
  if (k === 'in china') return 'upstream';

  // Bare "Container N" references appear in LR Installation cells too.
  if (parseContainerRef(raw).numbers.length > 0) return 'incoming';

  return 'other';
}

// ---------------------------------------------------------------------------
// Common-area status (§7.3 common areas, §8)
// ---------------------------------------------------------------------------

/** True if a status value means the task is finished (Completed / Done). */
export function isDoneStatus(raw: string | null | undefined): boolean {
  const k = key(raw);
  return k === 'completed' || k === 'done' || k === 'complete';
}

/** Classify a common-area task cell. `area` is accepted for symmetry; both
 *  blocker phrasings (Waiting on product / Need to order) map to 'blocker'. */
export function statusForCommonArea(
  raw: string | null | undefined,
  _area?: CommonArea,
): StatusState {
  if (isBlank(raw)) return 'not-started';
  if (isNA(raw)) return 'other'; // excluded from completion via isNA(), not via status
  const k = key(raw);

  if (isDoneStatus(raw)) return 'done';
  if (k === 'in progress' || k === 'in-progress') return 'in-progress';
  if (k === 'waiting on product' || k === 'need to order') return 'blocker';
  if (k === 'ordered') return 'in-motion';
  if (k === 'not yet' || k === 'not started') return 'not-started';

  return 'other';
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Classify any cell value for any registered tab.
 * - Room tabs → UrgencyBucket (per the tab's vocab).
 * - Common-area tabs → StatusState.
 * Never throws; unknown values become 'other'.
 */
export function bucketForValue(
  raw: string | null | undefined,
  tab: Tab,
  opts?: BucketOptions,
): UrgencyBucket | StatusState {
  if (tab.kind === 'commonArea') {
    return statusForCommonArea(raw, tab.area);
  }
  const arrived = opts?.arrivedContainers ?? ARRIVED_CONTAINERS;
  switch (tab.vocab) {
    case 'containers':
      return bucketContainers(raw, arrived);
    case 'hr':
      return bucketHrInstall(raw, arrived);
    case 'lr':
      return bucketLrInstall(raw, arrived);
    default:
      return 'other';
  }
}
