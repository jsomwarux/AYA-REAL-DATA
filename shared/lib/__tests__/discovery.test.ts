// Discovery unit tests (§3.1, §8). Pure, no I/O — synthetic grids that mirror the
// real tab layouts, including the proven LR Containers (90) ≠ LR Installation (83)
// divergence. Run: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  discoverRoomTabStructure,
  buildRoomRows,
  discoverCommonAreaFloors,
  discoverLobbyTasks,
} from '../index';
import { getTab, resolveTab } from '../../config/tabs';
import { getExpectedTaxonomy, type ExpectedTaxonomy } from '../../config/expectedTaxonomies';
import { STAIRCASE_SECTION_A_TASKS, STAIRCASE_SECTION_B_TASKS } from '../../config/commonAreas';
import type { Tab } from '../../types/dashboard';

// Build a room-tab header row from a taxonomy: 5 leading cols (Floor, blank=Room
// Line, Room Type, WHITE BOX, Room #), then "<NAME> PACKAGE" + its parts per
// package, then trailing cols.
function headerFromTaxonomy(tax: ExpectedTaxonomy): string[] {
  const row: string[] = ['Floor', '', 'Room Type', 'WHITE BOX', 'Room #'];
  for (const pkg of tax.packages) {
    row.push(`${pkg.name} PACKAGE`);
    for (const part of pkg.parts) row.push(part);
  }
  row.push('Completion %', 'Missing');
  return row;
}

// ---------------------------------------------------------------------------
// Discovery reads each tab's OWN structure — LR Containers (90) ≠ LR Install (83)
// ---------------------------------------------------------------------------
test('discovery: separates LR Containers (10/90) from LR Installation (10/83)', () => {
  const lrContainers = getExpectedTaxonomy('LR Containers Distribution')!;
  const lrInstall = getExpectedTaxonomy('LR-Installation Progress')!;

  const cGrid = [headerFromTaxonomy(lrContainers), ['7', 'LR-LINE1', 'King', 'TRUE', '701']];
  const iGrid = [headerFromTaxonomy(lrInstall), ['7', 'LR-LINE1', 'King', 'TRUE', '701']];

  const cStruct = discoverRoomTabStructure(cGrid, lrContainers);
  const iStruct = discoverRoomTabStructure(iGrid, lrInstall);

  // Same algorithm, different live structures → different counts.
  assert.equal(cStruct.packages.length, 10);
  assert.equal(cStruct.packages.reduce((s, p) => s + p.parts.length, 0), 90);
  assert.equal(iStruct.packages.length, 10);
  assert.equal(iStruct.packages.reduce((s, p) => s + p.parts.length, 0), 83);

  // No validation warnings when the live headers match the expected taxonomy.
  assert.deepEqual(cStruct.warnings, []);
  assert.deepEqual(iStruct.warnings, []);

  // Package names discovered in order, matching the taxonomy.
  assert.deepEqual(
    cStruct.packages.map((p) => p.name.toUpperCase()),
    lrContainers.packages.map((p) => p.name.toUpperCase()),
  );

  // A package that genuinely differs between the two tabs is read independently:
  // LR Containers MINIBAR has 11 parts; LR Installation MINIBAR has 8.
  const cMinibar = cStruct.packages.find((p) => p.name.toUpperCase() === 'MINIBAR')!;
  const iMinibar = iStruct.packages.find((p) => p.name.toUpperCase() === 'MINIBAR')!;
  assert.equal(cMinibar.parts.length, 11);
  assert.equal(iMinibar.parts.length, 8);
});

test('discovery: all four room tabs hit their expected package/part counts', () => {
  const cases: Array<[string, number, number]> = [
    ['HR Containers Distribution', 12, 97],
    ['HR Installation Progress', 12, 97],
    ['LR-Installation Progress', 10, 83],
    ['LR Containers Distribution', 10, 90],
  ];
  for (const [name, pkgs, parts] of cases) {
    const tax = getExpectedTaxonomy(name)!;
    const struct = discoverRoomTabStructure([headerFromTaxonomy(tax), ['7', 'X', 'King', 'TRUE', '701']], tax);
    assert.equal(struct.packages.length, pkgs, `${name} packages`);
    assert.equal(struct.packages.reduce((s, p) => s + p.parts.length, 0), parts, `${name} parts`);
    assert.deepEqual(struct.warnings, [], `${name} warnings`);
  }
});

test('discovery: trailing columns (Completion %, Missing) are ignored as parts', () => {
  const tax: ExpectedTaxonomy = { tab: 'X', packages: [{ name: 'HEADBOARD', parts: ['Panel', 'Track'] }] };
  const struct = discoverRoomTabStructure([headerFromTaxonomy(tax), ['7', 'L1', 'King', 'TRUE', '701']]);
  assert.equal(struct.packages.length, 1);
  assert.deepEqual(struct.packages[0].parts.map((p) => p.header), ['Panel', 'Track']);
});

test('discovery: never throws on empty/garbage grids', () => {
  assert.doesNotThrow(() => discoverRoomTabStructure([]));
  assert.doesNotThrow(() => discoverRoomTabStructure([['just', 'noise'], ['1', '2']]));
});

test('discovery: newline-wrapped headers are collapsed to single spaces', () => {
  const header = ['Floor', '', 'Room Type', 'WHITE BOX', 'Room #', 'HEADBOARD PACKAGE', 'Headboard\nPanel', 'Wooden \nLED Track', 'Completion %'];
  const struct = discoverRoomTabStructure([header, ['7', 'L1', 'King', 'TRUE', '701']]);
  assert.deepEqual(struct.packages[0].parts.map((p) => p.header), ['Headboard Panel', 'Wooden LED Track']);
});

test('resolveTab: accepts exact name, full slug, and short prefix; rejects ambiguous', () => {
  assert.equal(resolveTab('LR Containers Distribution')?.sheetName, 'LR Containers Distribution'); // exact
  assert.equal(resolveTab('lr-containers-distribution')?.sheetName, 'LR Containers Distribution'); // full slug
  assert.equal(resolveTab('lr-containers')?.sheetName, 'LR Containers Distribution'); // short prefix
  assert.equal(resolveTab('hr-containers')?.sheetName, 'HR Containers Distribution');
  assert.equal(resolveTab('lr-installation')?.sheetName, 'LR-Installation Progress');
  assert.equal(resolveTab('corridors')?.sheetName, 'CORRIDORS');
  assert.equal(resolveTab('temp-lobby')?.sheetName, 'TEMP/LOBBY');
  assert.equal(resolveTab('hr'), undefined); // ambiguous → both HR tabs
  assert.equal(resolveTab('nonsense'), undefined);
});

// ---------------------------------------------------------------------------
// buildRoomRows — recompute + mismatch + buckets on a known room (received mode)
// ---------------------------------------------------------------------------
test('buildRoomRows: recomputes %, flags stale manual %, buckets parts (received)', () => {
  const containersTab = getTab('HR Containers Distribution') as Tab; // received mode
  const header = [
    'Floor', '', 'Room Type', 'WHITE BOX', 'Room #',
    'HEADBOARD PACKAGE', 'Panel', 'Track', 'Niche', 'Door',
    'Completion %', 'Missing',
  ];
  //                                       summary  Panel  Track(2 arrived)   Niche  Door
  const data = ['7', 'HR-LINE1', 'King', 'TRUE', '2701', '50%', '22', 'Container 3 & 4', 'N/A', ''];
  const grid = [header, data];

  const struct = discoverRoomTabStructure(grid);
  const rows = buildRoomRows(grid, struct, containersTab);

  assert.equal(rows.length, 1);
  const room = rows[0];
  assert.equal(room.roomNo, '2701');
  assert.equal(room.floor, '7'); // from the Floor leading column
  assert.equal(room.line, 'HR-LINE1');
  assert.equal(room.type, 'King');

  const pkg = room.packages[0];
  assert.equal(pkg.name, 'HEADBOARD');
  // received: Panel '22'=1, Track '3 & 4'=1, Niche 'N/A'=excluded, Door blank=0 → 2/3 = 67%
  assert.equal(pkg.recomputedPct, 67);
  assert.equal(pkg.manualPct, 50);
  assert.equal(pkg.mismatch, true);
  assert.equal(pkg.unrecordedCount, 1);

  assert.equal(pkg.parts[0].bucket, 'received'); // 22
  assert.equal(pkg.parts[2].bucket, 'excluded'); // N/A
  assert.equal(pkg.parts[3].bucket, 'unrecorded'); // blank
  assert.equal(pkg.parts[3].isBlank, true);
});

test('buildRoomRows: floor carries forward across merged (blank) Floor cells', () => {
  const containersTab = getTab('HR Containers Distribution') as Tab;
  const header = ['Floor', '', 'Room Type', 'WHITE BOX', 'Room #', 'HEADBOARD PACKAGE', 'Panel', 'Completion %'];
  const grid = [
    header,
    ['27', 'L1', 'King', 'TRUE', '2701', '0%', 'In China'],
    ['', 'L2', 'King', 'TRUE', '2702', '0%', 'In China'], // merged Floor cell → blank, inherits 27
  ];
  const struct = discoverRoomTabStructure(grid);
  const rows = buildRoomRows(grid, struct, containersTab);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].floor, '27');
  assert.equal(rows[1].floor, '27'); // carried forward
});

// ---------------------------------------------------------------------------
// Installation %: the sheet's own "Floor %" (col B) + "Room %" (col F) columns
// ---------------------------------------------------------------------------
test('buildRoomRows: reads Room % / Floor % without shadowing the Floor and Room # labels', () => {
  const installTab = getTab('HR Installation Progress') as Tab;
  // The live Installation layout: A Floor, B Floor %, C LINES, D Room Type,
  // E WHITE BOX, F Room %, G Room #, then packages.
  const header = ['Floor', 'Floor %', 'LINES', 'Room Type', 'WHITE BOX', 'Room %', 'Room #', 'HEADBOARD PACKAGE', 'Panel'];
  const grid = [
    header,
    ['27', '26%', 'HR- Line 1', 'King', '100%', '38%', '2701', '100%', 'Installed'],
    ['', '', 'HR- Line 2', 'Queen', '100%', '33%', '2702', '95%', 'Installed'], // merged Floor / Floor %
    ['26', '27%', 'HR- Line 1', 'King', '100%', '38%', '2601', '100%', 'Installed'],
  ];

  const struct = discoverRoomTabStructure(grid);
  assert.equal(struct.leading.floor, 0); // "Floor %" must not claim the Floor column
  assert.equal(struct.leading.floorPct, 1);
  assert.equal(struct.leading.roomPct, 5);
  assert.equal(struct.leading.roomNo, 6);
  assert.equal(struct.leading.roomLine, 2); // "LINES" header, not a blank one

  const rows = buildRoomRows(grid, struct, installTab);
  assert.deepEqual(rows.map((r) => r.roomNo), ['2701', '2702', '2601']);
  assert.deepEqual(rows.map((r) => r.floor), ['27', '27', '26']);
  assert.deepEqual(rows.map((r) => r.line), ['HR- Line 1', 'HR- Line 2', 'HR- Line 1']);
  assert.deepEqual(rows.map((r) => r.installedPct), [38, 33, 38]); // Room %, per room
  assert.deepEqual(rows.map((r) => r.floorPct), [26, 26, 27]); // Floor % carried across the merge
});

test('buildRoomRows: falls back to the trailing Completion % when there is no Room % column', () => {
  const installTab = getTab('HR Installation Progress') as Tab;
  const header = ['Floor', '', 'Room Type', 'WHITE BOX', 'Room #', 'HEADBOARD PACKAGE', 'Panel', 'Completion %'];
  const grid = [header, ['27', 'L1', 'King', 'TRUE', '2701', '100%', 'Installed', '61%']];
  const rows = buildRoomRows(grid, discoverRoomTabStructure(grid), installTab);
  assert.equal(rows[0].installedPct, 61);
  assert.equal(rows[0].floorPct, null); // no Floor % column on this layout
});

test('discoverCommonAreaFloors: reads floors from the sheet, drops all-blank phantom rows, keeps all-Not-Started', () => {
  // Row 1 = decorative banner; row 2 = headers; data from row 3 (§8). Fixed cols
  // for corridors: A=AREA B=WHITE BOX C=FULLY COMPLETED D=FLOOR, tasks E+.
  const grid = [
    ['', '', '', '', 'CORRIDORS'],
    ['AREA', 'WHITE BOX', 'FULLY COMPLETED', 'FLOOR', 'Wallpaper Removal', 'Sheetrock'],
    ['HIGH RISE', 'FALSE', 'FALSE', '12TH', 'Completed', 'Completed'],
    ['', 'FALSE', 'FALSE', '11TH', 'Not Started', 'Not Started'], // all not-started → kept (real)
    ['', 'FALSE', 'FALSE', '10TH', '', ''], // all blank → phantom, dropped
    ['', 'FALSE', 'FALSE', '7TH', 'Completed', 'Completed'],
  ];
  const { floors } = discoverCommonAreaFloors(grid, 'corridors');
  assert.deepEqual(floors.map((f) => f.floor), ['12TH', '11TH', '7TH']); // 10TH dropped, no synthesized 8/9
  assert.equal(floors[1].tasks.every((t) => t.status === 'not-started'), true); // 11TH kept as real
});

// ---------------------------------------------------------------------------
// Common-area floors (§8.4) — derived completion vs FULLY COMPLETED checkbox
// ---------------------------------------------------------------------------
test('discoverCommonAreaFloors: corridors completion + checkbox-mismatch flag', () => {
  const header = ['AREA', 'WHITE BOX', 'FULLY COMPLETED', 'FLOOR', 'Task A', 'Task B', 'Task C'];
  const grid = [
    header,
    ['HIGH RISE', 'TRUE', 'FALSE', '27', 'Completed', 'In progress', 'Waiting on product'],
    ['HIGH RISE', 'TRUE', 'TRUE', '26', 'Completed', 'Completed', 'Completed'],
    ['HIGH RISE', 'TRUE', 'TRUE', '25', 'Completed', 'In progress', 'Completed'], // checkbox lies
  ];
  const { floors } = discoverCommonAreaFloors(grid, 'corridors');
  assert.equal(floors.length, 3);

  assert.equal(floors[0].floor, '27');
  assert.equal(floors[0].tasks.length, 3);
  assert.equal(floors[0].derivedComplete, false);
  assert.equal(floors[0].mismatch, false); // checkbox false, derived false

  assert.equal(floors[1].derivedComplete, true);
  assert.equal(floors[1].mismatch, false); // checkbox true, derived true

  assert.equal(floors[2].derivedComplete, false);
  assert.equal(floors[2].fullyComplete, true);
  assert.equal(floors[2].mismatch, true); // checkbox claims done, tasks disagree
  assert.equal(floors[0].tasks[2].status, 'blocker'); // Waiting on product
});

test('discoverCommonAreaFloors: staircase keeps sections A (10) and B (14) distinct', () => {
  const header = ['AREA', 'FULLY DONE', 'WHITE BOX', 'FLOOR', ...STAIRCASE_SECTION_A_TASKS, ...STAIRCASE_SECTION_B_TASKS];
  const values = ['HIGH RISE', 'FALSE', 'TRUE', '27',
    ...STAIRCASE_SECTION_A_TASKS.map(() => 'Completed'),
    ...STAIRCASE_SECTION_B_TASKS.map(() => 'Not Yet'),
  ];
  const { floors } = discoverCommonAreaFloors([header, values], 'staircase');
  assert.equal(floors.length, 1);
  const a = floors[0].tasks.filter((t) => t.section === 'A');
  const b = floors[0].tasks.filter((t) => t.section === 'B');
  assert.equal(a.length, 10);
  assert.equal(b.length, 14);
  // Overlapping names land in different sections (namespaced).
  assert.equal(a[0].header, b[0].header); // both "Molded & Damage Walls Removal"
  assert.notEqual(a[0].section, b[0].section);
});

// ---------------------------------------------------------------------------
// Temp/Lobby (§8.6) — flat list, row-17 flag, status mapping
// ---------------------------------------------------------------------------
test('discoverLobbyTasks: reads col B/C, flags sheet row 17, maps statuses', () => {
  const grid: string[][] = [['LOBBY banner'], ['', 'TASKS', 'STATUS']];
  // sheet rows 3..17 → grid indices 2..16 (15 tasks)
  for (let sheetRow = 3; sheetRow <= 17; sheetRow++) {
    const isAlarm = sheetRow === 17;
    grid.push(['', isAlarm ? 'PHR Alarm System' : `Task ${sheetRow}`, isAlarm ? 'Not Started' : 'Done']);
  }
  const tasks = discoverLobbyTasks(grid, { taskCol: 1, statusCol: 2, startRow: 2, flaggedRows: [17] });

  assert.equal(tasks.length, 15);
  assert.equal(tasks[0].status, 'done'); // "Done"
  const alarm = tasks.find((t) => t.task === 'PHR Alarm System')!;
  assert.equal(alarm.flagged, true);
  assert.equal(tasks.filter((t) => t.flagged).length, 1); // only row 17
});
