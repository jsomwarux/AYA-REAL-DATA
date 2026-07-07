import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  fetchExpansionRollup,
  type RollupTower,
  type RollupFloor,
  type RollupRoom,
  type RollupPackage,
  type RollupPackageSide,
  type RollupPart,
  type UrgencyBucket,
} from "@/lib/api";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dedupeProblemParts, type ProblemObservation, type ProblemPart } from "@shared/lib/problems";
import { exceptionReason } from "@shared/lib/buckets";
import { LABELS } from "@/lib/labels";
import { AlertCircle, ChevronRight, Loader2, Building2, Layers, DoorClosed, PackageOpen } from "lucide-react";

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const BUCKET_CLASS: Record<UrgencyBucket, string> = {
  received: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  incoming: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  upstream: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  problem: "bg-red-500/15 text-red-300 border-red-500/30",
  attention: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  unrecorded: "bg-fuchsia-500/10 text-fuchsia-300/80 border-fuchsia-500/20",
  excluded: "bg-white/5 text-muted-foreground border-white/10",
  other: "bg-white/5 text-slate-300 border-white/10",
};

function pctText(pct: number): string {
  if (pct >= 67) return "text-emerald-300";
  if (pct >= 34) return "text-amber-300";
  if (pct > 0) return "text-orange-300";
  return "text-muted-foreground";
}
function pctBar(pct: number): string {
  if (pct >= 67) return "bg-emerald-500";
  if (pct >= 34) return "bg-amber-500";
  if (pct > 0) return "bg-orange-500";
  return "bg-white/20";
}

function normVal(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** In-room actionable parts (Installation side): HR → "In Room Not Installed";
 *  LR → "In-Room" or "In Room Not Installed". */
function inRoomItems(room: RollupRoom, tower: "HR" | "LR") {
  const targets = tower === "HR" ? ["in room not installed"] : ["in-room", "in room not installed"];
  const out: { pkg: string; part: string; raw: string }[] = [];
  for (const pkg of room.packages) {
    for (const p of pkg.installed?.parts ?? []) {
      if (targets.includes(normVal(p.rawValue))) out.push({ pkg: pkg.name, part: p.header, raw: p.rawValue });
    }
  }
  return out;
}

function roomMismatchCount(room: RollupRoom): number {
  let n = 0;
  for (const pkg of room.packages) {
    if (pkg.received?.mismatch) n++;
    // Installed side has no mismatch: its % comes straight from the sheet's Completion %.
  }
  return n;
}

// --- Loud problem bucket (§7.3, Gil's #1): Not Found / Damaged (received) +
//     Damaged / UNKNOWN LOCATION / Missing Parts (installed). We read the engine's
//     bucket === "problem" directly (never re-derive) and dedupe to DISTINCT parts
//     via the shared helper so a part loud on both sides counts ONCE (same helper
//     the Exceptions view uses, so per-room counts reconcile). ---

/** Distinct problematic parts in a room (received-side status wins; a part loud on
 *  both sides is one entry — a part not received can't be installed). */
function roomProblems(room: RollupRoom): ProblemPart[] {
  const obs: ProblemObservation[] = [];
  for (const pkg of room.packages) {
    for (const p of pkg.received?.parts ?? []) {
      if (p.bucket === "problem") obs.push({ package: pkg.name, part: p.header, side: "received", status: exceptionReason(p.rawValue) });
    }
    for (const p of pkg.installed?.parts ?? []) {
      if (p.bucket === "problem") obs.push({ package: pkg.name, part: p.header, side: "installed", status: exceptionReason(p.rawValue) });
    }
  }
  return dedupeProblemParts(obs);
}

/** Short, action-oriented label for a loud value ("Not Found" → "not found"). */
function shortReason(raw: string): string {
  const n = normVal(raw);
  if (n === "not found") return "not found";
  if (n === "damaged") return "damaged";
  if (n === "missing parts") return "missing";
  if (n === "unknown location") return "unknown loc";
  return "problem";
}

/** Loud parts on one side, excluding parts already loud on the received side (pass
 *  their headers) so the installed badge doesn't mirror received "Not Found". */
function sideLoud(parts: RollupPart[] | undefined, exclude?: Set<string>): { count: number; label: string } {
  if (!parts) return { count: 0, label: "" };
  const loud = parts.filter((p) => p.bucket === "problem" && !exclude?.has(p.header));
  if (loud.length === 0) return { count: 0, label: "" };
  const reasons = new Set(loud.map((p) => shortReason(p.rawValue)));
  return { count: loud.length, label: reasons.size === 1 ? [...reasons][0] : "problem" };
}

/** Headers of parts that are loud on the received side (to exclude from installed). */
function receivedLoudHeaders(pkg: RollupPackage): Set<string> {
  return new Set((pkg.received?.parts ?? []).filter((p) => p.bucket === "problem").map((p) => p.header));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FloorRoomRollup() {
  useDocumentTitle("Floor → Room Rollup");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expansion-rollup"],
    queryFn: fetchExpansionRollup,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const [openFloors, setOpenFloors] = useState<Set<string>>(new Set());
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set());
  const [openPkgs, setOpenPkgs] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toastSuccess("Refreshed", "Rollup re-joined from Containers + Installation tabs.");
    } catch {
      toastError("Refresh Failed", "Could not refresh the rollup. Please try again.");
    }
  };

  const lastUpdated = data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : null;

  return (
    <DashboardLayout
      title="Floor → Room Rollup"
      subtitle={lastUpdated ? `Received vs Installed · synced ${lastUpdated}` : "Per-package received vs installed, by tower → floor → room"}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    >
      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Couldn't load rollup</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Joining Containers + Installation tabs…
        </div>
      )}

      {data && (
        <>
          {data.missingTabs.length > 0 && (
            <Card className="mb-5 border-amber-500/30 bg-amber-500/10">
              <CardContent className="flex items-center gap-3 p-3 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-300" />
                <span className="text-amber-100">Could not read: {data.missingTabs.join(", ")}.</span>
              </CardContent>
            </Card>
          )}

          {/* Legend — plain site language */}
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-semibold text-white">% delivered</span> is counted from the Containers parts; <span className="font-semibold text-white">% installed</span> is the sheet's own Completion % (shown per room / floor / tower).</span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-red-500/50 bg-red-500/15 px-1 font-semibold text-red-200">4 problems</span> {LABELS.problemsPhrase}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-fuchsia-300/80">no status</span> {LABELS.noStatusPhrase}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-white/15 bg-white/[0.04] px-1 text-muted-foreground">N/A</span> package doesn't apply to that room (not counted)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 text-amber-200">sheet says 50% — doesn't match</span> delivered side only, when the sheet disagrees
            </span>
          </div>

          <div className="space-y-8">
            {data.towers.map((tower) => (
              <TowerSection
                key={tower.tower}
                tower={tower}
                openFloors={openFloors}
                openRooms={openRooms}
                openPkgs={openPkgs}
                onToggleFloor={(k) => toggle(openFloors, k, setOpenFloors)}
                onToggleRoom={(k) => toggle(openRooms, k, setOpenRooms)}
                onTogglePkg={(k) => toggle(openPkgs, k, setOpenPkgs)}
              />
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Tower → Floor → Room → Package
// ---------------------------------------------------------------------------

interface ToggleProps {
  openFloors: Set<string>;
  openRooms: Set<string>;
  openPkgs: Set<string>;
  onToggleFloor: (k: string) => void;
  onToggleRoom: (k: string) => void;
  onTogglePkg: (k: string) => void;
}

// --- Delivered / installed roll-up (§ reconcile by SUMMING part counts, never by
//     averaging room %s). Applicable EXCLUDES N/A (bucket "excluded"); blank stays
//     in the denominator as not-delivered (its weight is 0). Delivered = received. ---
interface DeliveryCounts { dNum: number; dDen: number; iNum: number; iDen: number }

function roomDeliveryCounts(room: RollupRoom): DeliveryCounts {
  let dNum = 0, dDen = 0, iNum = 0, iDen = 0;
  for (const pkg of room.packages) {
    for (const p of pkg.received?.parts ?? []) {
      if (p.bucket !== "excluded") { dDen++; dNum += p.weight; } // received/delivered side
    }
    for (const p of pkg.installed?.parts ?? []) {
      if (p.bucket !== "excluded") { iDen++; iNum += p.weight; } // installed side
    }
  }
  return { dNum, dDen, iNum, iDen };
}

function sumCounts(list: DeliveryCounts[]): DeliveryCounts {
  return list.reduce(
    (a, c) => ({ dNum: a.dNum + c.dNum, dDen: a.dDen + c.dDen, iNum: a.iNum + c.iNum, iDen: a.iDen + c.iDen }),
    { dNum: 0, dDen: 0, iNum: 0, iDen: 0 },
  );
}
const floorDeliveryCounts = (floor: RollupFloor): DeliveryCounts => sumCounts(floor.rooms.map(roomDeliveryCounts));
const towerDeliveryCounts = (tower: RollupTower): DeliveryCounts => sumCounts(tower.floors.flatMap((f) => f.rooms.map(roomDeliveryCounts)));
const pctOf = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);

/** Prominent count-summed "% delivered" + bar, plus a smaller "% installed" taken
 *  straight from the sheet's Completion % (weighted-avg at floor/tower; null → n/a). */
function DeliveryStat({ counts, installedPct, size = "md" }: { counts: DeliveryCounts; installedPct: number | null; size?: "md" | "lg" }) {
  const delivered = pctOf(counts.dNum, counts.dDen);
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5" title={`Delivered: ${counts.dNum}/${counts.dDen} parts received (N/A excluded)`}>
        <span className={cn("font-semibold tabular-nums", big ? "text-base" : "text-sm", pctText(delivered))}>{delivered}%</span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">delivered</span>
        <div className={cn("h-1.5 overflow-hidden rounded bg-white/10", big ? "w-28" : "w-16 sm:w-20")}>
          <div className={cn("h-full rounded", pctBar(delivered))} style={{ width: `${delivered}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-75" title="Installed % — the sheet's own Completion % (not recomputed)">
        <span className="text-xs tabular-nums text-muted-foreground">{installedPct === null ? "n/a" : `${installedPct}%`}</span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">inst.</span>
        <div className="h-1 w-10 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-sky-400/70" style={{ width: `${installedPct ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}

/** "1105" → "1105"; "1105","1106" → "1105 & 1106"; a,b,c → "a, b & c". */
function formatRoomList(rooms: string[]): string {
  if (rooms.length <= 1) return rooms.join("");
  return `${rooms.slice(0, -1).join(", ")} & ${rooms[rooms.length - 1]}`;
}

function TowerSection({ tower, ...t }: { tower: RollupTower } & ToggleProps) {
  const roomCount = tower.floors.reduce((s, f) => s + f.rooms.length, 0);
  const towerColor = tower.tower === "HR" ? "text-blue-300" : "text-purple-300";
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Building2 className={cn("h-5 w-5", towerColor)} />
        <h2 className="text-lg font-semibold text-white">{tower.tower} Tower</h2>
        <span className="text-xs text-muted-foreground">
          {tower.floors.length} floors · {roomCount} rooms
        </span>
        {tower.duplicateRooms.length > 0 && (
          <span
            className="rounded border border-slate-400/25 bg-slate-400/10 px-1.5 py-0.5 text-[10px] text-slate-200"
            title={`Rooms ${formatRoomList(
              tower.duplicateRooms,
            )} are suites: each is tracked on more than one row in the sheet (the main bedroom plus the "LV" living room), so each shows here as separate room cards. This is expected — not a duplicate to fix.`}
          >
            {tower.duplicateRooms.length === 1 ? "Suite" : "Suites"} {formatRoomList(tower.duplicateRooms)} · shown as separate rooms
          </span>
        )}
        <div className="ml-auto">
          <DeliveryStat counts={towerDeliveryCounts(tower)} installedPct={tower.installedPct} size="lg" />
        </div>
      </div>
      <div className="space-y-2">
        {tower.floors.map((floor) => (
          <FloorRow key={floor.floor} tower={tower} floor={floor} {...t} />
        ))}
      </div>
    </section>
  );
}

function FloorRow({ tower, floor, ...t }: { tower: RollupTower; floor: RollupFloor } & ToggleProps) {
  const key = `${tower.tower}:${floor.floor}`;
  const open = t.openFloors.has(key);
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => t.onToggleFloor(key)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/5"
      >
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <Layers className="h-4 w-4 text-teal-400" />
        <span className="font-medium text-white">Floor {floor.floor}</span>
        <div className="ml-auto flex items-center gap-3">
          <DeliveryStat counts={floorDeliveryCounts(floor)} installedPct={floor.installedPct} />
          <span className="hidden text-xs text-muted-foreground sm:inline">{floor.rooms.length} rooms</span>
        </div>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-white/10 p-2">
          {floor.rooms.map((room) => (
            <RoomRow key={room.key} tower={tower} room={room} {...t} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomRow({ tower, room, ...t }: { tower: RollupTower; room: RollupRoom } & ToggleProps) {
  const key = `${tower.tower}:${room.key}`;
  const open = t.openRooms.has(key);
  const mismatches = roomMismatchCount(room);
  const inRoom = inRoomItems(room, tower.tower);
  const loud = roomProblems(room);

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => t.onToggleRoom(key)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
      >
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
        <DoorClosed className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-white">Room {room.roomNo}</span>
        {(room.line || room.type) && (
          <span className="truncate text-xs text-muted-foreground">{[room.line, room.type].filter(Boolean).join(" · ")}</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <DeliveryStat counts={roomDeliveryCounts(room)} installedPct={room.installedPct} />
          <span className="flex items-center gap-1.5">
            {loud.length > 0 && (
              <span className="rounded border border-red-500/50 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                {loud.length} problem{loud.length > 1 ? "s" : ""}
              </span>
            )}
            {mismatches > 0 && (
              <span
                title="Packages where the sheet's own number is different"
                className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200"
              >
                {mismatches} {mismatches === 1 ? "differs" : "differ"} from sheet
              </span>
            )}
            {inRoom.length > 0 && (
              <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
                {inRoom.length} in-room
              </span>
            )}
          </span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 p-3">
          {/* Loud problems (Not Found / Damaged / UNKNOWN LOCATION / Missing Parts) — top, loudest */}
          <ProblemSection items={loud} />

          {/* In-room actionable list */}
          <InRoomSection tower={tower.tower} items={inRoom} />

          {/* Packages */}
          <div className="space-y-1.5">
            {room.packages.map((pkg) => (
              <PackageRow key={pkg.name} towerName={tower.tower} roomKey={room.key} pkg={pkg} {...t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProblemSection({ items }: { items: ProblemPart[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/[0.08] p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300">
        <AlertCircle className="h-3.5 w-3.5" />
        Missing parts — locate or order
        <span className="text-red-300/70">({items.length})</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {items.map((it, i) => {
          // Only tag when it changes the ACTION: Damaged (replace) / other statuses.
          // Plain "Not Found" needs no tag — the section title already says missing.
          const isNotFound = it.status.toLowerCase() === "not found";
          const damaged = it.status.toLowerCase() === "damaged";
          return (
            <li key={i} className="flex items-center gap-1.5 text-xs">
              <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", damaged ? "bg-orange-400" : "bg-red-500")} />
              <span className="text-muted-foreground">{it.package}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="min-w-0 truncate text-white/90">{it.part}</span>
              {!isNotFound && (
                <span
                  className={cn(
                    "ml-auto flex-shrink-0 rounded border px-1 text-[10px] font-medium",
                    damaged ? "border-orange-500/40 bg-orange-500/10 text-orange-200" : "border-red-500/40 bg-red-500/10 text-red-200",
                  )}
                >
                  {it.status}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InRoomSection({ tower, items }: { tower: "HR" | "LR"; items: { pkg: string; part: string; raw: string }[] }) {
  const title = tower === "HR" ? "In Room Not Installed" : "In-Room / In Room Not Installed";
  return (
    <div className="rounded-md border border-sky-500/20 bg-sky-500/[0.04] p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-sky-300">
        <PackageOpen className="h-3.5 w-3.5" />
        {title}
        <span className="text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None in this room.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
              <span className="text-muted-foreground">{it.pkg}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate text-white/90">{it.part}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PackageRow({
  towerName,
  roomKey,
  pkg,
  ...t
}: { towerName: string; roomKey: string; pkg: RollupPackage } & ToggleProps) {
  const key = `${towerName}:${roomKey}:${pkg.name}`;
  const open = t.openPkgs.has(key);
  return (
    <div className="rounded border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => t.onTogglePkg(key)}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 text-left hover:bg-white/5 sm:grid-cols-[220px_1fr]"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
          <span className="text-sm font-medium text-white">{pkg.name}</span>
        </span>
        {/* Received % is per-package (recomputed from Containers parts). Installation is
            tracked as ONE Completion % per room (shown at the room level), not per package. */}
        <PctCell label="Received" side={pkg.received} loud={sideLoud(pkg.received?.parts)} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-3 sm:grid-cols-2">
          <PartList title="Received" side={pkg.received} />
          <PartList title="Installed" side={pkg.installed} />
        </div>
      )}
    </div>
  );
}

function PctCell({ label, side, loud }: { label: string; side: RollupPackageSide | null; loud: { count: number; label: string } }) {
  if (!side) {
    return <div className="text-xs text-muted-foreground">{label}: <span className="text-muted-foreground/60">—</span></div>;
  }
  // N/A: the package doesn't apply to this room (every part N/A). Show "N/A", NOT 0% —
  // distinct grey pill, no progress bar. Excluded from all rollups.
  if (side.naOnly) {
    return (
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <span
            title="Not applicable to this room (all parts N/A) — excluded from the math"
            className="rounded border border-white/15 bg-white/[0.04] px-1.5 py-0 text-xs font-medium text-muted-foreground"
          >
            N/A
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", pctText(side.recomputedPct))}>{side.recomputedPct}%</span>
        {loud.count > 0 && (
          <span
            title={LABELS.problemsTitle}
            className="rounded border border-red-500/50 bg-red-500/15 px-1 py-0 text-[10px] font-semibold text-red-200"
          >
            {loud.count} {loud.label}
          </span>
        )}
        {/* Quiet sheet-disagreement note — plain words, only when they actually differ */}
        {side.mismatch && side.manualPct !== null && (
          <span
            title={LABELS.sheetDiffersTitle}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0 text-[10px] text-amber-200"
          >
            {LABELS.sheetDiffers(side.manualPct)}
          </span>
        )}
        {side.unrecordedCount > 0 && (
          <span title={LABELS.noStatusTitle} className="text-[10px] text-fuchsia-300/80">
            {side.unrecordedCount} {LABELS.noStatusShort}
          </span>
        )}
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white/10">
        <div className={cn("h-full rounded", pctBar(side.recomputedPct))} style={{ width: `${side.recomputedPct}%` }} />
      </div>
    </div>
  );
}

function PartList({ title, side }: { title: string; side: RollupPackageSide | null }) {
  if (!side) {
    return <div className="text-xs text-muted-foreground">{title}: <span className="text-muted-foreground/60">not on this tab</span></div>;
  }
  return (
    <div>
      <h5 className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{title}</h5>
      <ul className="space-y-1">
        {side.parts.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-white/90">{p.header}</span>
            <BucketChip part={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BucketChip({ part }: { part: RollupPart }) {
  const label = part.isBlank ? "blank" : part.rawValue || "—";
  return (
    <span className={cn("flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px]", BUCKET_CLASS[part.bucket])}>
      {label}
    </span>
  );
}
