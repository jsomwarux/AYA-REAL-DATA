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

test('deriveFloorFromRoomNo: drop last two digits', () => {
  assert.equal(deriveFloorFromRoomNo('2701'), '27');
  assert.equal(deriveFloorFromRoomNo('701'), '7');
  assert.equal(deriveFloorFromRoomNo('5'), '');
});
