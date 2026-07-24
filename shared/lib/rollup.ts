// Aya Dashboard Expansion — Floor → Room rollup join (§9 item 2).
// Pure, no I/O. Joins a tower's Containers + Installation RoomRows by Room # +
// package name, grouped Tower → Floor → Room → package{received, installed}.
// The %s themselves come from the engine (buildRoomRows); this only joins.

import type {
  RoomRow,
  PackageResult,
  Tower,
  RollupTower,
  RollupFloor,
  RollupRoom,
  RollupPackage,
} from '../types/dashboard';

/** Numeric value of a label's digits, for sorting (e.g. "27TH" → 27). */
function num(label: string): number {
  const n = parseInt((label || '').replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

function findPackage(room: RoomRow | undefined, name: string): PackageResult | null {
  if (!room) return null;
  const key = name.toUpperCase();
  return room.packages.find((p) => p.name.toUpperCase() === key) ?? null;
}

/**
 * Key rooms by "roomNo#occurrence" so sub-rooms that share a Room # are kept
 * distinct. Some suites span two rows under one number (a main row + an "LV"
 * row) and Type strings drift across tabs, so occurrence order — consistent
 * across the parallel-maintained tabs — is the reliable join discriminator.
 */
function keyByRoomOccurrence(rooms: RoomRow[]): Map<string, RoomRow> {
  const counts = new Map<string, number>();
  const map = new Map<string, RoomRow>();
  for (const r of rooms) {
    const occ = counts.get(r.roomNo) ?? 0;
    counts.set(r.roomNo, occ + 1);
    map.set(`${r.roomNo}#${occ}`, r);
  }
  return map;
}

/** Room #s appearing on more than one row. */
function duplicatedRoomNos(rooms: RoomRow[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rooms) counts.set(r.roomNo, (counts.get(r.roomNo) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

/**
 * Join one tower's Containers + Installation room rows into the rollup structure.
 * Rooms are keyed by Room # + occurrence (so duplicate/suite rows survive and pair
 * main↔main / LV↔LV across tabs); packages are the ordered union of package names.
 * Floors are grouped and sorted high→low; rooms within a floor sorted low→high.
 */
export function buildTowerRollup(
  tower: Tower,
  containersTab: string,
  installationTab: string,
  containersRooms: RoomRow[],
  installationRooms: RoomRow[],
): RollupTower {
  const byRoomC = keyByRoomOccurrence(containersRooms);
  const byRoomI = keyByRoomOccurrence(installationRooms);

  // Ordered union of room keys: Containers order first, then Installation-only.
  const roomKeys: string[] = [];
  const seenRooms = new Set<string>();
  for (const k of [...byRoomC.keys(), ...byRoomI.keys()]) {
    if (!seenRooms.has(k)) {
      seenRooms.add(k);
      roomKeys.push(k);
    }
  }

  // Ordered union of package names (case-insensitive), Containers order first.
  const pkgNames: string[] = [];
  const seenPkgs = new Set<string>();
  for (const room of [...containersRooms, ...installationRooms]) {
    for (const p of room.packages) {
      const key = p.name.toUpperCase();
      if (!seenPkgs.has(key)) {
        seenPkgs.add(key);
        pkgNames.push(p.name);
      }
    }
  }

  const rollupRooms: RollupRoom[] = roomKeys.map((key) => {
    const rc = byRoomC.get(key);
    const ri = byRoomI.get(key);
    const meta = rc ?? ri!; // at least one exists since key came from the union

    const packages: RollupPackage[] = pkgNames
      .map((name) => ({
        name,
        received: findPackage(rc, name),
        installed: findPackage(ri, name),
      }))
      .filter((p) => p.received || p.installed);

    // Installation % (the sheet's own Room %) + applicable installed-part count
    // (non-N/A parts on the installation side — context, not a weight).
    const installedPct = ri?.installedPct ?? null;
    let installedApplicable = 0;
    if (ri) for (const pkg of ri.packages) for (const p of pkg.parts) if (p.bucket !== 'excluded') installedApplicable++;

    return { key, roomNo: meta.roomNo, floor: meta.floor, line: meta.line, type: meta.type, installedPct, installedApplicable, packages };
  });

  // The sheet's own "Floor %" per floor (merged col B on the Installation tab, already
  // carried forward per row). First non-null wins; rows of one floor all agree.
  const sheetFloorPct = new Map<string, number>();
  for (const r of installationRooms) {
    if (r.floorPct !== null && !sheetFloorPct.has(r.floor)) sheetFloorPct.set(r.floor, r.floorPct);
  }

  // Group by floor, sort floors high→low, rooms low→high (stable on key for dups).
  const floorMap = new Map<string, RollupRoom[]>();
  for (const room of rollupRooms) {
    const list = floorMap.get(room.floor);
    if (list) list.push(room);
    else floorMap.set(room.floor, [room]);
  }

  const floors: RollupFloor[] = [...floorMap.entries()]
    .map(([floor, rooms]) => {
      const sorted = rooms.slice().sort((a, b) => num(a.roomNo) - num(b.roomNo) || a.key.localeCompare(b.key));
      const roomsAvgPct = averageInstalled(sorted);
      const sheetPct = sheetFloorPct.get(floor) ?? null;
      return {
        floor,
        installedPct: sheetPct ?? roomsAvgPct,
        roomsAvgPct,
        installedFromSheet: sheetPct !== null,
        rooms: sorted,
      };
    })
    .sort((a, b) => num(b.floor) - num(a.floor));

  const duplicateRooms = [
    ...new Set([...duplicatedRoomNos(containersRooms), ...duplicatedRoomNos(installationRooms)]),
  ].sort((a, b) => num(a) - num(b));

  return { tower, containersTab, installationTab, installedPct: averageInstalled(rollupRooms), floors, duplicateRooms };
}

/** Average of rooms' Room % values (never a sum of %s), null when no room has one.
 *  A plain per-room average on purpose: it is exactly how the sheet derives its own
 *  Floor % from the Room % column, so tower / floor / room agree with the sheet. */
function averageInstalled(rooms: RollupRoom[]): number | null {
  let sum = 0, n = 0;
  for (const r of rooms) {
    if (r.installedPct === null) continue;
    sum += r.installedPct;
    n++;
  }
  return n > 0 ? Math.round(sum / n) : null;
}
