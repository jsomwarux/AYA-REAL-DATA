// Aya Dashboard Expansion — outstanding parts by delivery stage.
// Pure, no I/O. The sheet tracks each part's delivery status via the location
// vocabulary (§6.1), so the real "what's still coming" signal is parts grouped by
// stage — NOT a per-container arrived flag. Sourced from the Containers tabs.

import type { RoomRow, Tower, DeliveryStage, OutstandingPart, StageGroup } from '../types/dashboard';
import { parseContainerRef, isInChinaOnly } from './containers';
import { norm } from './normalize';

export interface OutstandingInput {
  tower: Tower;
  tab: string;
  rooms: RoomRow[];
}

/** Incoming stages, ordered closest-to-here → furthest. */
export const INCOMING_STAGES: DeliveryStage[] = [
  'in-ny-port',
  'in-transit',
  'partial-china',
  'in-china',
  'in-production',
  'production-needed',
  'unrecorded',
];

/**
 * Classify one Containers-tab cell into a delivery stage by its literal location
 * value. A full "Container N" counts as received (the "container number assigned =
 * landed" convention, flagged in the UI); "Container N & In China" is a partial.
 * Never throws — unknown values → 'other'.
 */
export function deliveryStage(raw: string | null | undefined): DeliveryStage {
  const n = norm(raw);
  if (n === '') return 'unrecorded';
  if (n === 'n/a' || n === 'na') return 'excluded';
  if (n === 'not found' || n === 'damaged') return 'problem';
  if (n === 'local') return 'received';
  if (n === 'in ny port' || n === 'ny port' || n === 'in ny') return 'in-ny-port';
  if (n === 'in transit') return 'in-transit';
  if (n === 'in production') return 'in-production';
  if (n === 'production needed') return 'production-needed';
  if (isInChinaOnly(raw)) return 'in-china';
  const ref = parseContainerRef(raw);
  if (ref.numbers.length > 0) return ref.partial ? 'partial-china' : 'received';
  return 'other';
}

function roomNum(roomNo: string): number {
  const n = parseInt((roomNo || '').replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

export interface OutstandingResult {
  stages: StageGroup[]; // incoming stages only, ordered closest → furthest
  summary: { incoming: number; received: number; problems: number; excluded: number };
}

/** Group not-yet-received parts by delivery stage. Received / problem (loud) /
 *  N/A are tallied for the header + Exceptions link but excluded from the stages. */
export function buildOutstanding(inputs: OutstandingInput[]): OutstandingResult {
  const byStage = new Map<DeliveryStage, OutstandingPart[]>();
  let received = 0;
  let problems = 0;
  let excluded = 0;

  for (const input of inputs) {
    for (const room of input.rooms) {
      for (const pkg of room.packages) {
        for (const part of pkg.parts) {
          const stage = deliveryStage(part.rawValue);
          if (stage === 'received') {
            received++;
            continue;
          }
          if (stage === 'problem') {
            problems++;
            continue;
          }
          if (stage === 'excluded' || stage === 'other') {
            excluded++;
            continue;
          }
          const entry: OutstandingPart = {
            tower: input.tower,
            roomNo: room.roomNo,
            floor: room.floor,
            line: room.line,
            type: room.type,
            package: pkg.name,
            part: part.header,
            rawValue: part.rawValue,
            stage,
          };
          const list = byStage.get(stage);
          if (list) list.push(entry);
          else byStage.set(stage, [entry]);
        }
      }
    }
  }

  const stages: StageGroup[] = INCOMING_STAGES.filter((s) => byStage.has(s)).map((s) => {
    const parts = byStage.get(s)!.sort(
      (a, b) =>
        a.tower.localeCompare(b.tower) ||
        roomNum(a.roomNo) - roomNum(b.roomNo) ||
        a.package.localeCompare(b.package) ||
        a.part.localeCompare(b.part),
    );
    return { stage: s, count: parts.length, parts };
  });

  const incoming = stages.reduce((n, g) => n + g.count, 0);
  return { stages, summary: { incoming, received, problems, excluded } };
}
