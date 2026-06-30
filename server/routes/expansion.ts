// Aya Dashboard Expansion — ingestion endpoints for the 7 new tabs (§3, §8).
// READ-ONLY: reuses the existing service-account Sheets client; never writes.
// Reads FULL wide ranges so hidden/grouped columns are included (§3.1).
//
// All structure discovery + recompute lives in the pure engine (shared/lib);
// this router only fetches values and shapes the normalized JSON response.

import { Router } from 'express';
import { fetchSheetData, getSpreadsheetInfo } from '../services/googleSheets';
import { ALL_TABS, ROOM_TABS, recomputeModeFor, isRoomTab, slugifyTab, resolveTab } from '@shared/config/tabs';
import { getExpectedTaxonomy } from '@shared/config/expectedTaxonomies';
import { TEMP_LOBBY_CONFIG } from '@shared/config/commonAreas';
import type { Tab } from '@shared/types/dashboard';
import {
  discoverRoomTabStructure,
  buildRoomRows,
  discoverCommonAreaFloors,
  discoverLobbyTasks,
  commonAreaCompletion,
  exceptionSeverityForValue,
  exceptionReason,
  buildTowerRollup,
  type ExceptionSeverity,
} from '@shared/lib';
import type { RoomRow, RoomTab, Tower } from '@shared/types/dashboard';

const router = Router();

/** One problem item surfaced in the Exceptions Panel (§9.1). */
interface ExceptionItem {
  severity: ExceptionSeverity;
  tab: string;
  tower: 'HR' | 'LR';
  roomNo: string;
  line: string;
  type: string;
  package: string;
  part: string;
  rawValue: string;
  reason: string;
}

// Wide enough to cover every part column on the room tabs (97 parts + summaries
// + leading/trailing), including hidden/grouped columns. values.get returns
// hidden columns; over-wide ranges are harmless (ragged rows are fine).
const WIDE_RANGE = 'A1:GZ1000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Significant lowercase tokens of a name (length ≥ 2). */
function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

/**
 * Resolve a registered tab's expected sheetName to the actual title present in
 * the spreadsheet — tolerant of renames/inserted words (the lesson from the
 * "A.I Rooms WB Progress" break): exact match first, then "all expected tokens
 * present in the title".
 */
function resolveActualTitle(expected: string, available: string[]): string | undefined {
  const exact = available.find((t) => t.toLowerCase().trim() === expected.toLowerCase().trim());
  if (exact) return exact;
  const want = tokens(expected);
  return available.find((t) => {
    const have = new Set(tokens(t));
    return want.every((w) => have.has(w));
  });
}

function getSpreadsheetId(): string | undefined {
  return process.env.CONSTRUCTION_PROGRESS_SHEET_ID;
}

/** Read a tab's full grid (rawValues) by its actual title. */
async function readGrid(spreadsheetId: string, actualTitle: string): Promise<string[][]> {
  const data = await fetchSheetData(spreadsheetId, `'${actualTitle}'!${WIDE_RANGE}`);
  return data.rawValues as string[][];
}

/** Build the normalized payload for one tab. */
async function buildTabPayload(tab: Tab, spreadsheetId: string, availableTitles: string[]) {
  const resolvedTitle = resolveActualTitle(tab.sheetName, availableTitles);
  if (!resolvedTitle) {
    return {
      ok: false as const,
      tab: tab.sheetName,
      error: 'tab_not_found',
      message: `No tab matching "${tab.sheetName}". Available: ${availableTitles.join(', ')}`,
    };
  }

  const grid = await readGrid(spreadsheetId, resolvedTitle);

  if (isRoomTab(tab)) {
    const expected = getExpectedTaxonomy(tab.sheetName);
    const structure = discoverRoomTabStructure(grid, expected);
    const rooms = buildRoomRows(grid, structure, tab);
    return {
      ok: true as const,
      tab: tab.sheetName,
      resolvedTitle,
      kind: 'room' as const,
      type: tab.type,
      vocab: tab.vocab,
      tower: tab.tower,
      mode: recomputeModeFor(tab),
      headerRowIndex: structure.headerRowIndex,
      packages: structure.packages.map((p) => ({
        name: p.name,
        partCount: p.parts.length,
        parts: p.parts.map((x) => x.header),
      })),
      discovered: {
        packageCount: structure.packages.length,
        partCount: structure.packages.reduce((s, p) => s + p.parts.length, 0),
      },
      expected: expected
        ? {
            packageCount: expected.packages.length,
            partCount: expected.packages.reduce((s, p) => s + p.parts.length, 0),
          }
        : null,
      roomCount: rooms.length,
      rooms,
      warnings: structure.warnings,
    };
  }

  // Common-area tabs
  if (tab.area === 'lobby') {
    const tasks = discoverLobbyTasks(grid, {
      taskCol: TEMP_LOBBY_CONFIG.taskColumn.charCodeAt(0) - 65, // 'B' → 1
      statusCol: TEMP_LOBBY_CONFIG.statusColumn.charCodeAt(0) - 65, // 'C' → 2
      startRow: TEMP_LOBBY_CONFIG.dataStartRow - 1,
      flaggedRows: [...TEMP_LOBBY_CONFIG.flaggedRows],
    });
    const completion = commonAreaCompletion(tasks.map((t) => t.rawValue));
    return {
      ok: true as const,
      tab: tab.sheetName,
      resolvedTitle,
      kind: 'commonArea' as const,
      area: 'lobby' as const,
      taskCount: tasks.length,
      completion: { done: completion.done, total: completion.total, pct: Math.round(completion.pct * 100) },
      tasks,
      warnings: [],
    };
  }

  const { floors, warnings } = discoverCommonAreaFloors(grid, tab.area);
  return {
    ok: true as const,
    tab: tab.sheetName,
    resolvedTitle,
    kind: 'commonArea' as const,
    area: tab.area,
    floorCount: floors.length,
    floors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/expansion — registry + which tabs resolve in the live spreadsheet. */
router.get('/', async (_req, res) => {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'CONSTRUCTION_PROGRESS_SHEET_ID not configured' });
  }
  try {
    const info = await getSpreadsheetInfo(spreadsheetId);
    const availableTitles = (info.sheets?.map((s) => s.title).filter(Boolean) as string[]) || [];
    const tabs = ALL_TABS.map((t) => ({
      tab: t.sheetName,
      slug: slugifyTab(t.sheetName),
      kind: t.kind,
      resolvedTitle: resolveActualTitle(t.sheetName, availableTitles) ?? null,
    }));
    res.json({ spreadsheetTitle: info.title, availableTitles, tabs });
  } catch (err) {
    console.error('[expansion] list error:', err);
    res.status(500).json({ error: 'Failed to read spreadsheet info', message: String(err) });
  }
});

/**
 * GET /api/expansion/exceptions — the LEAD view (§9 item 1). Scans ALL 4 room
 * tabs and returns the flat list of problem items (LOUD + Attention) plus
 * per-severity counts. Defined BEFORE /:tab so the literal path wins over the
 * param route.
 */
router.get('/exceptions', async (_req, res) => {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'CONSTRUCTION_PROGRESS_SHEET_ID not configured' });
  }

  try {
    const info = await getSpreadsheetInfo(spreadsheetId);
    const availableTitles = (info.sheets?.map((s) => s.title).filter(Boolean) as string[]) || [];

    const perTab = await Promise.all(
      ROOM_TABS.map(async (tab) => {
        const resolvedTitle = resolveActualTitle(tab.sheetName, availableTitles);
        if (!resolvedTitle) return { tab, items: [] as ExceptionItem[], missing: true };

        const grid = await readGrid(spreadsheetId, resolvedTitle);
        const structure = discoverRoomTabStructure(grid, getExpectedTaxonomy(tab.sheetName));
        const rooms = buildRoomRows(grid, structure, tab);

        const items: ExceptionItem[] = [];
        for (const room of rooms) {
          for (const pkg of room.packages) {
            for (const part of pkg.parts) {
              const severity = exceptionSeverityForValue(part.rawValue, tab);
              if (!severity) continue;
              items.push({
                severity,
                tab: tab.sheetName,
                tower: tab.tower,
                roomNo: room.roomNo,
                line: room.line,
                type: room.type,
                package: pkg.name,
                part: part.header,
                rawValue: part.rawValue,
                reason: exceptionReason(part.rawValue),
              });
            }
          }
        }
        return { tab, items, missing: false };
      }),
    );

    const items = perTab.flatMap((t) => t.items);
    const counts = {
      loud: items.filter((i) => i.severity === 'loud').length,
      attention: items.filter((i) => i.severity === 'attention').length,
      total: items.length,
    };

    res.json({
      generatedAt: new Date().toISOString(),
      counts,
      items,
      tabsScanned: ROOM_TABS.map((t) => t.sheetName),
      missingTabs: perTab.filter((t) => t.missing).map((t) => t.tab.sheetName),
    });
  } catch (err) {
    console.error('[expansion] exceptions error:', err);
    res.status(500).json({ error: 'Failed to build exceptions', message: String(err) });
  }
});

/** Read + recompute one room tab's rows, or null if the tab can't be resolved. */
async function readRoomTabRows(
  tab: RoomTab,
  spreadsheetId: string,
  availableTitles: string[],
): Promise<{ rows: RoomRow[]; resolvedTitle: string } | null> {
  const resolvedTitle = resolveActualTitle(tab.sheetName, availableTitles);
  if (!resolvedTitle) return null;
  const grid = await readGrid(spreadsheetId, resolvedTitle);
  const structure = discoverRoomTabStructure(grid, getExpectedTaxonomy(tab.sheetName));
  return { rows: buildRoomRows(grid, structure, tab), resolvedTitle };
}

/**
 * GET /api/expansion/rollup — Floor → Room rollup (§9 item 2). For each tower,
 * JOINs the Containers + Installation tabs by Room # + package name and returns
 * Tower → Floor → Room → package{received, installed}. All %s come from the
 * engine; manual %s ride along for the mismatch flag. Ordered before /:tab.
 */
router.get('/rollup', async (_req, res) => {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'CONSTRUCTION_PROGRESS_SHEET_ID not configured' });
  }

  try {
    const info = await getSpreadsheetInfo(spreadsheetId);
    const availableTitles = (info.sheets?.map((s) => s.title).filter(Boolean) as string[]) || [];

    const towers: Tower[] = ['HR', 'LR'];
    const missingTabs: string[] = [];

    const built = await Promise.all(
      towers.map(async (tower) => {
        const containersTab = ROOM_TABS.find((t) => t.tower === tower && t.type === 'containers')!;
        const installationTab = ROOM_TABS.find((t) => t.tower === tower && t.type === 'installation')!;

        const [c, i] = await Promise.all([
          readRoomTabRows(containersTab, spreadsheetId, availableTitles),
          readRoomTabRows(installationTab, spreadsheetId, availableTitles),
        ]);
        if (!c) missingTabs.push(containersTab.sheetName);
        if (!i) missingTabs.push(installationTab.sheetName);

        return buildTowerRollup(
          tower,
          containersTab.sheetName,
          installationTab.sheetName,
          c?.rows ?? [],
          i?.rows ?? [],
        );
      }),
    );

    res.json({ generatedAt: new Date().toISOString(), towers: built, missingTabs });
  } catch (err) {
    console.error('[expansion] rollup error:', err);
    res.status(500).json({ error: 'Failed to build rollup', message: String(err) });
  }
});

/** GET /api/expansion/:tab — normalized data for one tab (slug or exact name). */
router.get('/:tab', async (req, res) => {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'CONSTRUCTION_PROGRESS_SHEET_ID not configured' });
  }

  const param = req.params.tab;
  const tab = resolveTab(param);
  if (!tab) {
    return res.status(404).json({
      error: 'unknown_tab',
      message: `No registered tab for "${param}".`,
      available: ALL_TABS.map((t) => ({ name: t.sheetName, slug: slugifyTab(t.sheetName) })),
    });
  }

  try {
    const info = await getSpreadsheetInfo(spreadsheetId);
    const availableTitles = (info.sheets?.map((s) => s.title).filter(Boolean) as string[]) || [];
    const payload = await buildTabPayload(tab, spreadsheetId, availableTitles);
    res.status(payload.ok ? 200 : 404).json(payload);
  } catch (err) {
    console.error(`[expansion] error for "${param}":`, err);
    res.status(500).json({ error: 'Failed to read tab', message: String(err) });
  }
});

export default router;
