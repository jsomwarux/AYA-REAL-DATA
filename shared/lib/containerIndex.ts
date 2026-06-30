// Aya Dashboard Expansion — Container view index (§9 item 3).
// Pure, no I/O. Inverts the room tabs: container # → the rooms/parts that
// reference it ("when Container X lands, these unblock"). Primary source is the
// two Containers tabs; Installation-tab "Container N" refs can be folded in.

import type { RoomRow, Tower, ContainerBlockedPart, ContainerGroup } from '../types/dashboard';
import { parseContainerRef } from './containers';

export interface ContainerIndexInput {
  tower: Tower;
  tab: string;
  source: 'containers' | 'installation';
  rooms: RoomRow[];
}

function roomNum(roomNo: string): number {
  const n = parseInt((roomNo || '').replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Build the container → blocked-parts index across the given room tabs.
 * Both "&" and "and" splits collapse to the same numbers via parseContainerRef,
 * and duplicate numbers within a single cell ("3 & 3") are de-duplicated — but two
 * different cells referencing the same container are kept (distinct unblock targets).
 * `arrived` per ARRIVED_CONTAINERS: 'ALL' marks every container delivered.
 */
export function buildContainerIndex(
  inputs: ContainerIndexInput[],
  arrived: Set<number> | 'ALL',
): ContainerGroup[] {
  // container # → ("tower|room|pkg|part" → merged entry). The inner map de-dupes
  // the same physical part seen on both a Containers and an Installation tab.
  const byNumber = new Map<number, Map<string, ContainerBlockedPart>>();

  for (const input of inputs) {
    for (const room of input.rooms) {
      for (const pkg of room.packages) {
        for (const part of pkg.parts) {
          const ref = parseContainerRef(part.rawValue);
          if (ref.numbers.length === 0) continue;
          // De-dup numbers within this one cell (e.g. "Container 3 & 3").
          for (const number of [...new Set(ref.numbers)]) {
            let perNum = byNumber.get(number);
            if (!perNum) {
              perNum = new Map();
              byNumber.set(number, perNum);
            }
            const key = `${input.tower}|${room.roomNo}|${pkg.name}|${part.header}`;
            const existing = perNum.get(key);
            if (existing) {
              if (!existing.sources.includes(input.source)) existing.sources.push(input.source);
              existing.partial = existing.partial || ref.partial;
              // keep the first-seen rawValue/tab (Containers tabs come first)
            } else {
              perNum.set(key, {
                tower: input.tower,
                tab: input.tab,
                sources: [input.source],
                roomNo: room.roomNo,
                line: room.line,
                type: room.type,
                package: pkg.name,
                part: part.header,
                rawValue: part.rawValue,
                partial: ref.partial,
              });
            }
          }
        }
      }
    }
  }

  const groups: ContainerGroup[] = [...byNumber.entries()].map(([number, perNum]) => {
    const entries = [...perNum.values()].sort(
      (a, b) =>
        a.tower.localeCompare(b.tower) ||
        roomNum(a.roomNo) - roomNum(b.roomNo) ||
        a.package.localeCompare(b.package) ||
        a.part.localeCompare(b.part),
    );
    const distinctRooms = new Set(entries.map((e) => `${e.tower}:${e.roomNo}`));
    return {
      number,
      arrived: arrived === 'ALL' ? true : arrived.has(number),
      roomCount: distinctRooms.size,
      partCount: entries.length,
      partialCount: entries.filter((e) => e.partial).length,
      entries,
    };
  });

  return groups.sort((a, b) => a.number - b.number);
}
