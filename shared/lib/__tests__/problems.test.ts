import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dedupeProblemParts, type ProblemObservation } from '../problems';

test('dedupeProblemParts: a part loud on BOTH sides counts once (received status wins)', () => {
  // Mirrors Room 2701: received Not Found (10) + installed Not Found (a subset).
  // The same physical parts must collapse — a part not received can't be installed.
  const obs: ProblemObservation[] = [
    { package: 'TV UNIT', part: 'TV Unit Molding', side: 'received', status: 'Not Found' },
    { package: 'TV UNIT', part: 'TV Unit Molding', side: 'installed', status: 'Not Found' }, // same part
    { package: 'TV UNIT', part: 'TV Unit Shelves', side: 'received', status: 'Not Found' },
    { package: 'TV UNIT', part: 'TV Unit Shelves', side: 'installed', status: 'Not Found' }, // same part
    { package: 'CLOSET', part: 'Drawer Divider', side: 'received', status: 'Not Found' }, // received-only
  ];
  const out = dedupeProblemParts(obs);
  assert.equal(out.length, 3); // Molding, Shelves, Divider — each once
  const molding = out.find((p) => p.part === 'TV Unit Molding')!;
  assert.equal(molding.status, 'Not Found');
  assert.equal(molding.side, 'received'); // received wins
});

test('dedupeProblemParts: installed-only problems (Damaged after arrival / Missing Parts) are kept distinct', () => {
  const obs: ProblemObservation[] = [
    { package: 'MINIBAR', part: 'Minibar Door', side: 'received', status: 'Not Found' },
    { package: 'BED', part: 'Bed Base Frame', side: 'installed', status: 'Missing Parts' }, // installed-only
    { package: 'CLOSET', part: 'Molding', side: 'installed', status: 'Damaged' }, // received not loud → kept
  ];
  const out = dedupeProblemParts(obs);
  assert.equal(out.length, 3);
  assert.equal(out.find((p) => p.part === 'Bed Base Frame')!.side, 'installed');
  assert.equal(out.find((p) => p.part === 'Molding')!.status, 'Damaged');
});

test('dedupeProblemParts: empty in → empty out', () => {
  assert.deepEqual(dedupeProblemParts([]), []);
});
