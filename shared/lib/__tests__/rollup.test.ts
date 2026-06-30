// Tower-rollup join tests (§9 item 2). Pure, no I/O.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTowerRollup, deriveFloorFromRoomNo } from '../index';
import type { RoomRow, PackageResult } from '../../types/dashboard';

function pkg(name: string, recomputedPct: number, manualPct: number | null, mismatch = false, unrecordedCount = 0): PackageResult {
  return { name, recomputedPct, manualPct, mismatch, unrecordedCount, parts: [] };
}
function room(roomNo: string, floor: string, line: string, type: string, packages: PackageResult[]): RoomRow {
  return { roomNo, floor, line, type, packages };
}

test('buildTowerRollup: joins received (Containers) + installed (Installation) per package', () => {
  const containers = [
    room('701', '7', 'LR-LINE1', 'Double Full', [pkg('HEADBOARD', 100, 100), pkg('MINIBAR', 50, 50)]),
    room('601', '6', 'LR-LINE1', 'King', [pkg('HEADBOARD', 0, 0), pkg('MINIBAR', 0, 0)]),
  ];
  const installation = [
    room('701', '7', 'LR-LINE1', 'Double Full', [pkg('HEADBOARD', 83, 95, true), pkg('MINIBAR', 43, 50, true)]),
    room('601', '6', 'LR-LINE1', 'King', [pkg('HEADBOARD', 0, 0), pkg('MINIBAR', 0, 0)]),
  ];

  const r = buildTowerRollup('LR', 'LR Containers Distribution', 'LR-Installation Progress', containers, installation);

  assert.equal(r.tower, 'LR');
  assert.equal(r.containersTab, 'LR Containers Distribution');
  assert.deepEqual(r.floors.map((f) => f.floor), ['7', '6']); // high → low

  const room701 = r.floors[0].rooms[0];
  assert.equal(room701.roomNo, '701');
  const hb = room701.packages.find((p) => p.name === 'HEADBOARD')!;
  assert.equal(hb.received?.recomputedPct, 100); // % RECEIVED from Containers tab
  assert.equal(hb.installed?.recomputedPct, 83); // % INSTALLED from Installation tab
  assert.equal(hb.installed?.manualPct, 95);
  assert.equal(hb.installed?.mismatch, true); // stale manual % surfaced
});

test('buildTowerRollup: package present in only one tab → other side is null', () => {
  const containers = [room('701', '7', 'L1', 'K', [pkg('SPEAK EASY', 100, 100)])];
  const installation = [room('701', '7', 'L1', 'K', [pkg('HEADBOARD', 50, 50)])];

  const r = buildTowerRollup('HR', 'HR Containers Distribution', 'HR Installation Progress', containers, installation);
  const pkgs = r.floors[0].rooms[0].packages;

  const se = pkgs.find((p) => p.name === 'SPEAK EASY')!;
  const hb = pkgs.find((p) => p.name === 'HEADBOARD')!;
  assert.equal(se.received?.recomputedPct, 100);
  assert.equal(se.installed, null);
  assert.equal(hb.received, null);
  assert.equal(hb.installed?.recomputedPct, 50);
});

test('buildTowerRollup: rooms grouped by floor (desc), rooms sorted asc', () => {
  const c = [
    room('2702', '27', 'L', 'K', [pkg('HEADBOARD', 0, 0)]),
    room('2601', '26', 'L', 'K', [pkg('HEADBOARD', 0, 0)]),
    room('2701', '27', 'L', 'K', [pkg('HEADBOARD', 0, 0)]),
  ];
  const r = buildTowerRollup('HR', 'c', 'i', c, []);
  assert.deepEqual(r.floors.map((f) => f.floor), ['27', '26']);
  assert.deepEqual(r.floors[0].rooms.map((x) => x.roomNo), ['2701', '2702']); // sorted asc
});

test('buildTowerRollup: duplicate Room # (suite main + LV) kept distinct, paired by occurrence', () => {
  // Mirrors live HR 1105: a main suite row + an LV row share Room # and Line; Type
  // drifts across tabs ("King -Suite Room" vs "King -Suite"), so only occurrence
  // order reliably pairs them. Main HEADBOARD is 100% received, LV is 0%.
  const containers = [
    room('1105', '11', 'HR- Line 5', 'King -Suite Room', [pkg('HEADBOARD', 100, 100)]),
    room('1105', '11', 'HR- Line 5', 'King -Suite LV Room', [pkg('HEADBOARD', 0, 0)]),
  ];
  const installation = [
    room('1105', '11', 'HR- Line 5', 'King -Suite', [pkg('HEADBOARD', 0, 0)]),
    room('1105', '11', 'HR- Line 5', 'King -Suite LV Room', [pkg('HEADBOARD', 0, 0)]),
  ];

  const r = buildTowerRollup('HR', 'HR Containers Distribution', 'HR Installation Progress', containers, installation);

  const rooms = r.floors[0].rooms;
  assert.equal(rooms.length, 2); // both sub-rooms preserved, not collapsed
  assert.deepEqual(rooms.map((x) => x.key), ['1105#0', '1105#1']); // distinct UI keys
  assert.deepEqual(rooms.map((x) => x.type), ['King -Suite Room', 'King -Suite LV Room']);

  // occurrence pairing: main(0) joins main, LV(1) joins LV
  assert.equal(rooms[0].packages[0].received?.recomputedPct, 100); // main received
  assert.equal(rooms[0].packages[0].installed?.recomputedPct, 0); // main installed
  assert.equal(rooms[1].packages[0].received?.recomputedPct, 0); // LV received

  assert.deepEqual(r.duplicateRooms, ['1105']); // surfaced, not silent
});

test('buildTowerRollup: no duplicates → duplicateRooms empty', () => {
  const r = buildTowerRollup('LR', 'c', 'i', [room('701', '7', 'L', 'K', [pkg('BED', 0, 0)])], []);
  assert.deepEqual(r.duplicateRooms, []);
});

test('deriveFloorFromRoomNo: drop last two digits', () => {
  assert.equal(deriveFloorFromRoomNo('2701'), '27');
  assert.equal(deriveFloorFromRoomNo('701'), '7');
  assert.equal(deriveFloorFromRoomNo('5'), '');
});
