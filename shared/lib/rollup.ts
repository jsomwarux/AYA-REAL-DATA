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

    // Installation % (sheet Completion %) + applicable installed-part count (the weight
    // for floor/tower averages: non-N/A parts on the installation side).
    const installedPct = ri?.installedPct ?? null;
    let installedApplicable = 0;
    if (ri) for (const pkg of ri.packages) for (const p of pkg.parts) if (p.bucket !== 'excluded') installedApplicable++;

    return { key, roomNo: meta.roomNo, floor: meta.floor, line: meta.line, type: meta.type, installedPct, installedApplicable, packages };
  });

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
      return { floor, installedPct: weightedInstalled(sorted), rooms: sorted };
    })
    .sort((a, b) => num(b.floor) - num(a.floor));

  const duplicateRooms = [
    ...new Set([...duplicatedRoomNos(containersRooms), ...duplicatedRoomNos(installationRooms)]),
  ].sort((a, b) => num(a) - num(b));

  return { tower, containersTab, installationTab, installedPct: weightedInstalled(rollupRooms), floors, duplicateRooms };
}

/** Part-count-weighted average of rooms' Completion% values (never a sum of %s).
 *  Weight = each room's applicable installed-part count; falls back to a simple
 *  average if no room has applicable parts but some have a Completion% value. */
function weightedInstalled(rooms: RollupRoom[]): number | null {
  let wsum = 0, w = 0, simpleSum = 0, simpleN = 0;
  for (const r of rooms) {
    if (r.installedPct === null) continue;
    simpleSum += r.installedPct;
    simpleN++;
    if (r.installedApplicable > 0) {
      wsum += r.installedPct * r.installedApplicable;
      w += r.installedApplicable;
    }
  }
  if (w > 0) return Math.round(wsum / w);
  if (simpleN > 0) return Math.round(simpleSum / simpleN);
  return null;
}
