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
 * Join one tower's Containers + Installation room rows into the rollup structure.
 * Rooms are the ordered union of room numbers across both tabs; packages are the
 * ordered union of package names. Floors are grouped and sorted high→low; rooms
 * within a floor sorted low→high.
 */
export function buildTowerRollup(
  tower: Tower,
  containersTab: string,
  installationTab: string,
  containersRooms: RoomRow[],
  installationRooms: RoomRow[],
): RollupTower {
  const byRoomC = new Map(containersRooms.map((r) => [r.roomNo, r]));
  const byRoomI = new Map(installationRooms.map((r) => [r.roomNo, r]));

  // Ordered union of room numbers: Containers order first, then Installation-only.
  const roomNos: string[] = [];
  const seenRooms = new Set<string>();
  for (const r of [...containersRooms, ...installationRooms]) {
    if (!seenRooms.has(r.roomNo)) {
      seenRooms.add(r.roomNo);
      roomNos.push(r.roomNo);
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

  const rollupRooms: RollupRoom[] = roomNos.map((roomNo) => {
    const rc = byRoomC.get(roomNo);
    const ri = byRoomI.get(roomNo);
    const meta = rc ?? ri!; // at least one exists since roomNo came from the union

    const packages: RollupPackage[] = pkgNames
      .map((name) => ({
        name,
        received: findPackage(rc, name),
        installed: findPackage(ri, name),
      }))
      .filter((p) => p.received || p.installed);

    return { roomNo, floor: meta.floor, line: meta.line, type: meta.type, packages };
  });

  // Group by floor, sort floors high→low, rooms low→high.
  const floorMap = new Map<string, RollupRoom[]>();
  for (const room of rollupRooms) {
    const list = floorMap.get(room.floor);
    if (list) list.push(room);
    else floorMap.set(room.floor, [room]);
  }

  const floors: RollupFloor[] = [...floorMap.entries()]
    .map(([floor, rooms]) => ({
      floor,
      rooms: rooms.slice().sort((a, b) => num(a.roomNo) - num(b.roomNo)),
    }))
    .sort((a, b) => num(b.floor) - num(a.floor));

  return { tower, containersTab, installationTab, floors };
}
