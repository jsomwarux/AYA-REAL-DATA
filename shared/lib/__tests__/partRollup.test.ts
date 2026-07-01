import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rollupByPart } from '../partRollup';

test('rollupByPart: collapses rooms into one line per (package, part), sorted by count desc', () => {
  // Mirrors "In Production": 126 Transformer Door rows → 1 line.
  const items = [
    { package: 'CLOSET', part: 'Transformer Door', room: '2701' },
    { package: 'CLOSET', part: 'Transformer Door', room: '2702' },
    { package: 'CLOSET', part: 'Transformer Door', room: '2703' },
    { package: 'BATHROOM', part: 'Vanity Wooden Frame', room: '2701' },
  ];
  const g = rollupByPart(items, (i) => i.package, (i) => i.part);
  assert.equal(g.length, 2); // two distinct part types
  assert.equal(g[0].part, 'Transformer Door'); // biggest first
  assert.equal(g[0].items.length, 3); // 3 rooms behind it
  assert.equal(g[1].items.length, 1);
});

test('rollupByPart: same part name in different packages stays distinct', () => {
  const items = [
    { package: 'MINIBAR', part: 'Molding', room: '1' },
    { package: 'CLOSET', part: 'Molding', room: '2' },
  ];
  assert.equal(rollupByPart(items, (i) => i.package, (i) => i.part).length, 2);
});

test('rollupByPart: empty → empty', () => {
  assert.deepEqual(rollupByPart([], (i: any) => i.package, (i: any) => i.part), []);
});
