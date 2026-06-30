// Outstanding-parts-by-stage tests (reframed Container view). Pure, no I/O.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deliveryStage, buildOutstanding, INCOMING_STAGES, type OutstandingInput } from '../index';
import type { RoomRow, PackageResult, PartCell } from '../../types/dashboard';

function part(header: string, rawValue: string): PartCell {
  return { header, rawValue, bucket: 'other', weight: 0, isBlank: rawValue === '' };
}
function room(roomNo: string, parts: PartCell[]): RoomRow {
  return { roomNo, floor: roomNo.slice(0, -2), line: 'L', type: 'K', packages: [{ name: 'PKG', recomputedPct: 0, manualPct: null, mismatch: false, unrecordedCount: 0, parts } as PackageResult] };
}
function input(rooms: RoomRow[]): OutstandingInput {
  return { tower: 'LR', tab: 'LR Containers Distribution', rooms };
}

test('deliveryStage: classifies the full location vocabulary', () => {
  assert.equal(deliveryStage('LOCAL'), 'received');
  assert.equal(deliveryStage('Container 5'), 'received'); // full container = landed convention
  assert.equal(deliveryStage('Container 3 & 4'), 'received');
  assert.equal(deliveryStage('Container 5 & In China'), 'partial-china');
  assert.equal(deliveryStage('In NY Port'), 'in-ny-port');
  assert.equal(deliveryStage('In transit'), 'in-transit');
  assert.equal(deliveryStage('In China'), 'in-china');
  assert.equal(deliveryStage('Remaining / In China'), 'in-china');
  assert.equal(deliveryStage('In Production'), 'in-production');
  assert.equal(deliveryStage('Production Needed'), 'production-needed');
  assert.equal(deliveryStage(''), 'unrecorded');
  assert.equal(deliveryStage('N/A'), 'excluded');
  assert.equal(deliveryStage('Not Found'), 'problem'); // loud → Exceptions, excluded here
  assert.equal(deliveryStage('Damaged'), 'problem');
  assert.equal(deliveryStage('something weird'), 'other'); // never throws
});

test('buildOutstanding: groups by stage, excludes received/problem, tallies summary', () => {
  const rooms = [
    room('701', [
      part('A', 'Container 5'), // received
      part('B', 'In China'), // incoming
      part('C', 'In transit'), // incoming
      part('D', 'Not Found'), // problem (excluded)
      part('E', 'N/A'), // excluded
      part('F', ''), // unrecorded (incoming)
      part('G', 'Production Needed'), // incoming
    ]),
  ];
  const { stages, summary } = buildOutstanding([input(rooms)]);

  assert.equal(summary.received, 1); // Container 5
  assert.equal(summary.problems, 1); // Not Found → goes to Exceptions
  assert.equal(summary.excluded, 1); // N/A
  assert.equal(summary.incoming, 4); // In China, In transit, blank, Production Needed

  const present = stages.map((g) => g.stage);
  assert.deepEqual(present, ['in-transit', 'in-china', 'production-needed', 'unrecorded']); // ordered closest→furthest, only non-empty
  assert.ok(present.every((s) => INCOMING_STAGES.includes(s)));
  // a part carries its location for filtering/display
  const china = stages.find((g) => g.stage === 'in-china')!;
  assert.equal(china.parts[0].rawValue, 'In China');
  assert.equal(china.parts[0].floor, '7');
});

test('buildOutstanding: partial "& In China" is its own stage, not lumped with In China', () => {
  const { stages } = buildOutstanding([input([room('701', [part('A', 'Container 7 & In China'), part('B', 'In China')])])]);
  const partial = stages.find((g) => g.stage === 'partial-china');
  const china = stages.find((g) => g.stage === 'in-china');
  assert.equal(partial?.count, 1);
  assert.equal(china?.count, 1);
});
