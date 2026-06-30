// Aya Dashboard Expansion — tab registry (§2).
// Registers the 7 new tabs with metadata. PURELY ADDITIVE: the existing
// "A.I Rooms WB Progress" tab is intentionally NOT registered here.
//
// IMPORTANT (§3.1): recompute mode + value vocabulary derive from TYPE / vocab,
// never from the tower. HR Containers and LR Containers share the 'containers'
// vocab despite being different towers; the installation tabs split hr/lr.

import type {
  Tab,
  RoomTab,
  CommonAreaTab,
  RecomputeMode,
} from '../types/dashboard';

/** The 4 room tabs (§2). */
export const ROOM_TABS: RoomTab[] = [
  { kind: 'room', sheetName: 'HR Containers Distribution', type: 'containers', vocab: 'containers', tower: 'HR' },
  { kind: 'room', sheetName: 'HR Installation Progress',   type: 'installation', vocab: 'hr',        tower: 'HR' },
  { kind: 'room', sheetName: 'LR Containers Distribution', type: 'containers', vocab: 'containers', tower: 'LR' },
  { kind: 'room', sheetName: 'LR-Installation Progress',   type: 'installation', vocab: 'lr',        tower: 'LR' },
];

/** The 3 common-area tabs (§8). Names follow the sheet's section banners. */
export const COMMON_AREA_TABS: CommonAreaTab[] = [
  { kind: 'commonArea', sheetName: 'CORRIDORS',  area: 'corridors' },
  { kind: 'commonArea', sheetName: 'STAIRCASE',  area: 'staircase' },
  { kind: 'commonArea', sheetName: 'TEMP/LOBBY', area: 'lobby' },
];

/** All 7 registered tabs. */
export const ALL_TABS: Tab[] = [...ROOM_TABS, ...COMMON_AREA_TABS];

/** Recompute mode for a room tab, derived from its TYPE (§7.1 / §7.2). */
export function recomputeModeFor(tab: RoomTab): RecomputeMode {
  return tab.type === 'containers' ? 'received' : 'installed';
}

/** Look up a registered tab by its exact sheet name. */
export function getTab(sheetName: string): Tab | undefined {
  return ALL_TABS.find((t) => t.sheetName === sheetName);
}

/** Type guard: is this a room tab? */
export function isRoomTab(tab: Tab): tab is RoomTab {
  return tab.kind === 'room';
}

/** Type guard: is this a common-area tab? */
export function isCommonAreaTab(tab: Tab): tab is CommonAreaTab {
  return tab.kind === 'commonArea';
}
