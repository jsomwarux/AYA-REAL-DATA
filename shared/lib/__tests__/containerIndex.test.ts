// Container view index tests (§9 item 3). Pure, no I/O.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildContainerIndex, type ContainerIndexInput } from '../index';
import type { RoomRow, PackageResult, PartCell } from '../../types/dashboard';

function part(header: string, rawValue: string): PartCell {
  return { header, rawValue, bucket: 'other', weight: 0, isBlank: rawValue === '' };
}
function pkg(name: string, parts: PartCell[]): PackageResult {
  return { name, recomputedPct: 0, manualPct: null, mismatch: false, unrecordedCount: 0, parts };
}
function room(roomNo: string, parts: PartCell[]): RoomRow {
  return { roomNo, floor: roomNo.slice(0, -2), line: 'L', type: 'K', packages: [pkg('PKG', parts)] };
}
function input(rooms: RoomRow[], over: Partial<ContainerIndexInput> = {}): ContainerIndexInput {
  return { tower: 'LR', tab: 'LR Containers Distribution', source: 'containers', rooms, ...over };
}

test('container index: groups rooms/parts by container number', () => {
  const groups = buildContainerIndex(
    [input([room('701', [part('Headboard', 'Container 3'), part('Mirror', 'Container 3')])])],
    'ALL',
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].number, 3);
  assert.equal(groups[0].partCount, 2); // two parts unblocked by container 3
  assert.equal(groups[0].roomCount, 1);
});

test('container index: "&" and "and" splits both add the part to each container', () => {
  const amp = buildContainerIndex([input([room('701', [part('A', 'Container 3 & 4')])])], 'ALL');
  const and = buildContainerIndex([input([room('701', [part('A', 'Container 3 and 4')])])], 'ALL');
  assert.deepEqual(amp.map((g) => g.number), [3, 4]);
  assert.deepEqual(and.map((g) => g.number), [3, 4]); // identical handling across separators
});

test('container index: "Container X & In China" flags the entry partial', () => {
  const groups = buildContainerIndex([input([room('701', [part('A', 'Container 5 & In China')])])], 'ALL');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].number, 5);
  assert.equal(groups[0].partialCount, 1);
  assert.equal(groups[0].entries[0].partial, true);
});

test('container index: duplicate number within one cell counted once', () => {
  const groups = buildContainerIndex([input([room('701', [part('A', 'Container 3 & 3')])])], 'ALL');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].partCount, 1);
});

test('container index: arrived vs pending reflects ARRIVED_CONTAINERS config', () => {
  const rooms = [room('701', [part('A', 'Container 3'), part('B', 'Container 9')])];
  const all = buildContainerIndex([input(rooms)], 'ALL');
  assert.deepEqual(all.map((g) => g.arrived), [true, true]); // ALL → everything delivered

  const some = buildContainerIndex([input(rooms)], new Set([3]));
  const g3 = some.find((g) => g.number === 3)!;
  const g9 = some.find((g) => g.number === 9)!;
  assert.equal(g3.arrived, true); // configured arrived
  assert.equal(g9.arrived, false); // pending → "when it lands, unblocks"
});

test('container index: non-container values are ignored', () => {
  const groups = buildContainerIndex(
    [input([room('701', [part('A', 'Installed'), part('B', 'In China'), part('C', 'N/A'), part('D', '')])])],
    'ALL',
  );
  assert.equal(groups.length, 0);
});

test('container index: folds Installation "Container N" refs alongside Containers', () => {
  const groups = buildContainerIndex(
    [
      input([room('701', [part('A', 'Container 7')])], { source: 'containers', tab: 'LR Containers Distribution' }),
      input([room('701', [part('B', 'Container 7')])], { source: 'installation', tab: 'LR-Installation Progress' }),
    ],
    'ALL',
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].partCount, 2); // two different parts (A, B)
  assert.deepEqual(
    [...new Set(groups[0].entries.flatMap((e) => e.sources))].sort(),
    ['containers', 'installation'],
  );
});

test('container index: same part on both tabs merges to one entry (counts not inflated)', () => {
  const groups = buildContainerIndex(
    [
      input([room('701', [part('Green Wall', 'Container 3')])], { source: 'containers', tab: 'LR Containers Distribution' }),
      input([room('701', [part('Green Wall', 'Container 3')])], { source: 'installation', tab: 'LR-Installation Progress' }),
    ],
    'ALL',
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].partCount, 1); // merged, not double-counted
  assert.equal(groups[0].roomCount, 1);
  assert.deepEqual(groups[0].entries[0].sources.slice().sort(), ['containers', 'installation']);
});
