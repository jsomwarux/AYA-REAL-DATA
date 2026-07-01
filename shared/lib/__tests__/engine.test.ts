// Engine unit tests (§6, §7). Pure, deterministic, no I/O.
// Run: npm test  (node:test via tsx — no extra deps).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseContainerRef,
  recomputePackagePct,
  receivedWeight,
  installedWeight,
  flagMismatch,
  normalizeManualPct,
  bucketForValue,
  commonAreaCompletion,
  exceptionSeverityForValue,
  exceptionReason,
} from '../index';
import { getTab } from '../../config/tabs';
import type { Tab } from '../../types/dashboard';

const containersTab = getTab('HR Containers Distribution') as Tab; // vocab 'containers'
const hrTab = getTab('HR Installation Progress') as Tab; // vocab 'hr'
const lrTab = getTab('LR-Installation Progress') as Tab; // vocab 'lr'
const corridorsTab = getTab('CORRIDORS') as Tab; // common area

// ---------------------------------------------------------------------------
// parseContainerRef — both "&" and "and" splits, partial "& In China" (§6.1)
// ---------------------------------------------------------------------------
test('parseContainerRef: single / & / and / partial / bare / non-container', () => {
  assert.deepEqual(parseContainerRef('Container 5'), { numbers: [5], partial: false });
  assert.deepEqual(parseContainerRef('Container 3 & 4'), { numbers: [3, 4], partial: false });
  assert.deepEqual(parseContainerRef('Container 3 and 4'), { numbers: [3, 4], partial: false });
  assert.deepEqual(parseContainerRef('Container 5 & In China'), { numbers: [5], partial: true });
  assert.deepEqual(parseContainerRef('22'), { numbers: [22], partial: false });
  assert.deepEqual(parseContainerRef('In China'), { numbers: [], partial: false });
  assert.deepEqual(parseContainerRef('Installed'), { numbers: [], partial: false });
  // A plain multi-container split is NOT partial (only "& In China" is).
  assert.deepEqual(parseContainerRef('Container 16 & 25'), { numbers: [16, 25], partial: false });
  // Comma separators, and the "Contanier" typo seen in the sheet, still parse; not partial.
  assert.deepEqual(parseContainerRef('Container 7, 11 & 23'), { numbers: [7, 11, 23], partial: false });
  assert.deepEqual(parseContainerRef('Contanier 16 & 25'), { numbers: [16, 25], partial: false });
  assert.deepEqual(parseContainerRef('Container 7 & 25 & In China'), { numbers: [7, 25], partial: true });
  // never throws on junk
  assert.deepEqual(parseContainerRef(null), { numbers: [], partial: false });
  assert.deepEqual(parseContainerRef(''), { numbers: [], partial: false });
});

// ---------------------------------------------------------------------------
// recompute "% received" (§7.1) — arrived resolution, N/A exclusion, blank tally
// ---------------------------------------------------------------------------
test('recompute received: ALL arrived, N/A excluded, blank kept + unrecorded', () => {
  const parts = ['22', 'Container 3 & 4', 'Not Found', 'N/A', '', 'LOCAL'];
  const r = recomputePackagePct(parts, 'received'); // ARRIVED_CONTAINERS default 'ALL'
  // received: 22, "3 & 4", LOCAL = 3 ; Not Found/blank = 0 ; N/A excluded
  assert.equal(r.numerator, 3);
  assert.equal(r.denominator, 5); // 6 cells − 1 N/A
  assert.equal(r.unrecordedCount, 1);
  assert.equal(r.naCount, 1);
  assert.equal(Math.round(r.pct * 100), 60);
});

test('recompute received: ARRIVED_CONTAINERS subset flips not-arrived numbers to 0', () => {
  const parts = ['22', 'Container 3 & 4', 'LOCAL', '', 'N/A'];
  const r = recomputePackagePct(parts, 'received', { arrivedContainers: new Set([3, 4]) });
  // 22 NOT in arrived → 0 ; "3 & 4" both arrived → 1 ; LOCAL → 1
  assert.equal(r.numerator, 2);
  assert.equal(r.denominator, 4); // blank counts, N/A excluded
  assert.equal(Math.round(r.pct * 100), 50);
});

test('receivedWeight: "X & In China" partial = 0, LOCAL = 1', () => {
  assert.equal(receivedWeight('Container 5 & In China'), 0);
  assert.equal(receivedWeight('LOCAL'), 1);
  assert.equal(receivedWeight('Container 5', new Set([5])), 1);
  assert.equal(receivedWeight('Container 5', new Set([6])), 0);
});

// ---------------------------------------------------------------------------
// recompute "% installed" (§7.2) — In Progress 0.5, In-Room toggle (§3.5)
// ---------------------------------------------------------------------------
test('recompute installed: Installed=1, In Progress=0.5, In-Room=0 by default', () => {
  const parts = ['Installed', 'In Progress', 'In-Room', '', 'N/A', 'Damaged'];
  const r = recomputePackagePct(parts, 'installed');
  assert.equal(r.numerator, 1.5); // 1 + 0.5 + 0 + 0 + (excl) + 0
  assert.equal(r.denominator, 5);
  assert.equal(r.unrecordedCount, 1);
});

test('recompute installed: In-Room toggle flips In-Room to 1', () => {
  const parts = ['Installed', 'In-Room', 'In-Room'];
  const off = recomputePackagePct(parts, 'installed', { inRoomCountsAsInstalled: false });
  const on = recomputePackagePct(parts, 'installed', { inRoomCountsAsInstalled: true });
  assert.equal(off.numerator, 1);
  assert.equal(on.numerator, 3);
  assert.equal(installedWeight('In-Room', true), 1);
  assert.equal(installedWeight('In-Room', false), 0);
});

test('recompute: all-N/A package → 0% with 0 denominator (never divides by zero)', () => {
  const r = recomputePackagePct(['N/A', 'N/A'], 'received');
  assert.equal(r.denominator, 0);
  assert.equal(r.pct, 0);
  assert.equal(r.naCount, 2);
});

// ---------------------------------------------------------------------------
// flagMismatch (§3.2)
// ---------------------------------------------------------------------------
test('flagMismatch: rounds to whole %, null manual never mismatches', () => {
  assert.equal(flagMismatch(0.6, '60%'), false);
  assert.equal(flagMismatch(0.6, '75%'), true);
  assert.equal(flagMismatch(0.5, 0.5), false); // fraction manual
  assert.equal(flagMismatch(0.5, 50), false); // percent manual
  assert.equal(flagMismatch(0.6, null), false);
  assert.equal(flagMismatch(0.6, ''), false);
  assert.equal(normalizeManualPct('80%'), 80);
  assert.equal(normalizeManualPct(0.8), 80);
  assert.equal(normalizeManualPct('garbage'), null);
});

// ---------------------------------------------------------------------------
// bucketForValue — one bucket per vocabulary + key LOUD cases (§7.3, §3.4)
// ---------------------------------------------------------------------------
test('buckets: Containers vocab (HR + LR Containers)', () => {
  assert.equal(bucketForValue('Not Found', containersTab), 'problem'); // LOUD
  assert.equal(bucketForValue('Damaged', containersTab), 'problem'); // LOUD
  assert.equal(bucketForValue('', containersTab), 'unrecorded');
  assert.equal(bucketForValue('N/A', containersTab), 'excluded');
  assert.equal(bucketForValue('LOCAL', containersTab), 'received');
  assert.equal(bucketForValue('22', containersTab), 'received'); // ALL arrived
  assert.equal(bucketForValue('22', containersTab, { arrivedContainers: new Set([5]) }), 'incoming');
  assert.equal(bucketForValue('In China', containersTab), 'upstream');
  assert.equal(bucketForValue('In transit', containersTab), 'incoming');
  assert.equal(bucketForValue('Container 5 & In China', containersTab), 'incoming'); // partial
});

test('buckets: HR Installation vocab (superset + Missing Parts LOUD)', () => {
  assert.equal(bucketForValue('Installed', hrTab), 'received');
  assert.equal(bucketForValue('Missing Parts', hrTab), 'problem'); // LOUD adds Missing Parts
  assert.equal(bucketForValue('In Progress', hrTab), 'incoming');
  assert.equal(bucketForValue('In Warehouse', hrTab), 'incoming');
  assert.equal(bucketForValue('Not Found', hrTab), 'problem'); // inherited from Containers
});

test('buckets: LR Installation vocab (UNKNOWN LOCATION LOUD, Attention tier)', () => {
  assert.equal(bucketForValue('UNKNOWN LOCATION', lrTab), 'problem'); // LOUD (§3.4)
  assert.equal(bucketForValue('Damaged', lrTab), 'problem'); // LOUD
  assert.equal(bucketForValue('Confirm Item', lrTab), 'attention');
  assert.equal(bucketForValue('ON-site/ Missing Other', lrTab), 'attention');
  assert.equal(bucketForValue('In-Room', lrTab), 'incoming');
  assert.equal(bucketForValue('Installed', lrTab), 'received');
  assert.equal(bucketForValue('N/A', lrTab), 'excluded');
});

test('buckets: common-area statuses (blocker phrasings)', () => {
  assert.equal(bucketForValue('Completed', corridorsTab), 'done');
  assert.equal(bucketForValue('In progress', corridorsTab), 'in-progress');
  assert.equal(bucketForValue('Waiting on product', corridorsTab), 'blocker');
  assert.equal(bucketForValue('Need to order', corridorsTab), 'blocker');
  assert.equal(bucketForValue('Ordered', corridorsTab), 'in-motion');
  assert.equal(bucketForValue('Not Yet', corridorsTab), 'not-started');
});

// ---------------------------------------------------------------------------
// Unknown values never crash → 'other'
// ---------------------------------------------------------------------------
test('buckets: any unknown value → "other", never throws (incl. null/undefined/emoji)', () => {
  for (const tab of [containersTab, hrTab, lrTab]) {
    assert.equal(bucketForValue('zxcv qwerty', tab), 'other');
    assert.doesNotThrow(() => bucketForValue(null as unknown as string, tab));
    assert.doesNotThrow(() => bucketForValue(undefined as unknown as string, tab));
    assert.doesNotThrow(() => bucketForValue('🚧🚧', tab));
  }
  assert.equal(bucketForValue('made up status', corridorsTab), 'other');
});

// ---------------------------------------------------------------------------
// commonAreaCompletion (§8) — done/total, N/A excluded, blank counts
// ---------------------------------------------------------------------------
test('commonAreaCompletion: done/total excludes N/A, blank counts as not-done', () => {
  const c = commonAreaCompletion(['Completed', 'Done', 'In progress', 'N/A', '']);
  assert.equal(c.done, 2);
  assert.equal(c.total, 4); // 5 − 1 N/A ; blank stays
  assert.equal(c.pct, 0.5);
});

// ---------------------------------------------------------------------------
// Exceptions Panel classifier (§9.1) — LOUD vs Attention vs not-an-exception
// ---------------------------------------------------------------------------
test('exceptionSeverityForValue: LOUD across all 4 room tabs', () => {
  assert.equal(exceptionSeverityForValue('Not Found', containersTab), 'loud'); // Containers
  assert.equal(exceptionSeverityForValue('Damaged', containersTab), 'loud'); // any tab
  assert.equal(exceptionSeverityForValue('Missing Parts', hrTab), 'loud'); // HR Install
  assert.equal(exceptionSeverityForValue('Damaged', hrTab), 'loud');
  assert.equal(exceptionSeverityForValue('UNKNOWN LOCATION', lrTab), 'loud'); // LR Install
  assert.equal(exceptionSeverityForValue('Damaged', lrTab), 'loud');
});

test('exceptionSeverityForValue: Attention (LR states + partial "& In China")', () => {
  assert.equal(exceptionSeverityForValue('ON-site/ Missing Other', lrTab), 'attention');
  assert.equal(exceptionSeverityForValue('Confirm Item', lrTab), 'attention');
  assert.equal(exceptionSeverityForValue('Container 5 & In China', containersTab), 'attention'); // partial
  assert.equal(exceptionSeverityForValue('Container 5 & In China', hrTab), 'attention'); // superset
});

test('exceptionSeverityForValue: normal values + common areas are NOT exceptions', () => {
  assert.equal(exceptionSeverityForValue('Installed', hrTab), null);
  assert.equal(exceptionSeverityForValue('22', containersTab), null); // arrived container
  assert.equal(exceptionSeverityForValue('In-Room', lrTab), null);
  assert.equal(exceptionSeverityForValue('Not in Room', lrTab), null); // not in §9.1 attention list
  assert.equal(exceptionSeverityForValue('', containersTab), null); // blank is unrecorded, not an exception
  assert.equal(exceptionSeverityForValue('N/A', containersTab), null);
  assert.equal(exceptionSeverityForValue('Damaged', corridorsTab), null); // common-area tab → no exceptions
});

test('exceptionReason: canonical labels', () => {
  assert.equal(exceptionReason('not found'), 'Not Found');
  assert.equal(exceptionReason('UNKNOWN LOCATION'), 'Unknown Location');
  assert.equal(exceptionReason('Container 5 & In China'), 'Partial — rest in China');
});
