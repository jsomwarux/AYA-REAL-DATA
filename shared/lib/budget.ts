// Aya Dashboard — Budget engine (Schedule Summary source).
// Pure, no I/O. Turns the "Schedule Summary " tab's grid into the Budget payload:
// line items → category rollup + money-first totals. Unit-tested in __tests__/budget.test.ts.
//
// Ground rules (locked with the client):
//  • Line item = column A non-empty AND column C (Estimated Cost) parses as a number.
//    This keeps real line items whose name starts with "Total" (e.g. "Total Demo",
//    "Total BOH") IN, and skips blank spacer rows.
//  • The totals block is excluded by stopping at the FIRST row where trim(A) === "TOTAL"
//    (exact, case-insensitive). Everything from that row down (Contingency, TEST >>, the
//    second summary block) is never summed.
//  • Aggregation uses ONLY columns A (name), C (Estimated Cost), D (Paid), F (Category).
//    The sheet's extra T (Paid) / U (Balance) columns are ignored.
//  • Blank Estimated Cost → excluded (not zero-filled). Explicit $0 → a real $0 line item.
//  • Blank Category → an explicit "Uncategorized" bucket (never dropped).

/** 10% contingency, per the Schedule Summary totals block (12,259,501 → +1,225,950). */
export const CONTINGENCY_RATE = 0.1;
/** Hotel key/unit count for the "cost per unit" card. NOT a per-bedroom/bathroom figure. */
export const BUDGET_UNITS = 166;

// Display-name map — fixes sheet typos for PRESENTATION ONLY. Grouping and all math use
// the RAW trimmed category value; this only prettifies the label. Any category not listed
// here renders verbatim. (Auditable: add/remove entries here, nothing else changes.)
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  Libarary: 'Library',
  'Mechanical Elevetor': 'Mechanical Elevator',
};

export interface BudgetLineItem {
  id: number; // sheet row number (1-based)
  name: string; // column A
  category: string; // column F, raw trimmed ("" → grouped as Uncategorized)
  displayCategory: string; // pretty label (typos fixed; blank → "Uncategorized")
  estimatedCost: number; // column C
  paid: number; // column D
  requiredForLowRise: boolean; // column E checkbox
}

export interface BudgetCategory {
  name: string; // raw grouping key (or "Uncategorized")
  displayName: string; // pretty label
  total: number; // Σ Estimated Cost in this category
  pct: number; // % of estimatedBeforeContingency
  count: number; // # line items
}

export interface BudgetTotals {
  estimatedBeforeContingency: number; // Σ column C
  contingencyRate: number; // CONTINGENCY_RATE
  contingency: number; // Σ C × rate
  total: number; // Σ C × (1 + rate) — the headline "Total Budget"
  paid: number; // Σ column D
  paidPct: number; // paid / total × 100
  remaining: number; // total − paid
  units: number; // BUDGET_UNITS
  costPerUnit: number; // total / units
}

export interface BudgetSummary {
  totals: BudgetTotals;
  categories: BudgetCategory[]; // sorted by total desc
  items: BudgetLineItem[];
  meta: { headerRow: number; firstItemRow: number; lastItemRow: number; totalRow: number; lineItemCount: number };
}

type Cell = string | number | boolean | null | undefined;
type Grid = ReadonlyArray<ReadonlyArray<Cell>>;

/** Parse a money/number cell. UNFORMATTED reads arrive as JS numbers; formatted reads as
 *  "$1,234.50". Returns null for blank/non-numeric (so blank Estimated Cost is excluded). */
export function parseBudgetNumber(cell: Cell): number | null {
  if (cell == null || cell === '') return null;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  if (typeof cell === 'boolean') return null;
  let s = String(cell).trim();
  if (s === '' || s === '-') return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); } // (1,234) = negative
  s = s.replace(/[$,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function str(cell: Cell): string {
  return cell == null ? '' : String(cell).trim();
}

function displayCategoryFor(rawTrimmed: string): string {
  if (rawTrimmed === '') return 'Uncategorized';
  return CATEGORY_DISPLAY_NAMES[rawTrimmed] ?? rawTrimmed;
}

/** Locate the header row (the one with "Estimated Cost") and the columns we aggregate on.
 *  Falls back to the fixed layout A/C/D/E/F if headers can't be found. */
function locateColumns(grid: Grid): { headerRow: number; name: number; cost: number; paid: number; category: number; lowRise: number } {
  let headerRow = -1;
  for (let r = 0; r < Math.min(grid.length, 6); r++) {
    const row = grid[r] ?? [];
    if (row.some((c) => /^estimated cost$/i.test(str(c)))) { headerRow = r; break; }
  }
  if (headerRow === -1) {
    // No recognizable header — assume the documented layout (header on row 2 → index 1).
    return { headerRow: 1, name: 0, cost: 2, paid: 3, category: 4 + 1, lowRise: 4 };
  }
  const header = grid[headerRow] ?? [];
  const findExact = (re: RegExp) => header.findIndex((c) => re.test(str(c)));
  const cost = findExact(/^estimated cost$/i);
  // First "Paid" only — the sheet has a second "Paid" (col T) we must NOT use.
  const paid = header.findIndex((c) => /^paid$/i.test(str(c)));
  const category = findExact(/^category$/i);
  const lowRise = header.findIndex((c) => /required for low rise/i.test(str(c)));
  return {
    headerRow,
    name: 0, // column A has no header — it's the line-item name
    cost: cost >= 0 ? cost : 2,
    paid: paid >= 0 ? paid : 3,
    category: category >= 0 ? category : 5,
    lowRise: lowRise >= 0 ? lowRise : 4,
  };
}

export function buildScheduleSummaryBudget(grid: Grid): BudgetSummary {
  const col = locateColumns(grid);

  const items: BudgetLineItem[] = [];
  let totalRow = -1;
  for (let r = col.headerRow + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const name = str(row[col.name]);
    // Boundary: the totals block begins at the first standalone "TOTAL" row.
    if (name.toUpperCase() === 'TOTAL') { totalRow = r; break; }
    const cost = parseBudgetNumber(row[col.cost]);
    if (name === '' || cost === null) continue; // spacer row / blank Estimated Cost
    const category = str(row[col.category]);
    items.push({
      id: r + 1,
      name,
      category,
      displayCategory: displayCategoryFor(category),
      estimatedCost: cost,
      paid: parseBudgetNumber(row[col.paid]) ?? 0,
      requiredForLowRise: /^(true|yes|✓|checked|1)$/i.test(str(row[col.lowRise])),
    });
  }

  const estimatedBeforeContingency = items.reduce((s, i) => s + i.estimatedCost, 0);
  const paid = items.reduce((s, i) => s + i.paid, 0);
  const contingency = estimatedBeforeContingency * CONTINGENCY_RATE;
  const total = estimatedBeforeContingency * (1 + CONTINGENCY_RATE);
  const remaining = total - paid;
  const costPerUnit = BUDGET_UNITS > 0 ? total / BUDGET_UNITS : 0;
  const paidPct = total > 0 ? (paid / total) * 100 : 0;

  // Category rollup — group on the RAW trimmed value (blank → "Uncategorized").
  const byCat = new Map<string, { total: number; count: number }>();
  for (const it of items) {
    const key = it.category === '' ? 'Uncategorized' : it.category;
    const e = byCat.get(key) ?? { total: 0, count: 0 };
    e.total += it.estimatedCost;
    e.count += 1;
    byCat.set(key, e);
  }
  const categories: BudgetCategory[] = [...byCat.entries()]
    .map(([name, e]) => ({
      name,
      displayName: name === 'Uncategorized' ? 'Uncategorized' : (CATEGORY_DISPLAY_NAMES[name] ?? name),
      total: e.total,
      pct: estimatedBeforeContingency > 0 ? (e.total / estimatedBeforeContingency) * 100 : 0,
      count: e.count,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totals: { estimatedBeforeContingency, contingencyRate: CONTINGENCY_RATE, contingency, total, paid, paidPct, remaining, units: BUDGET_UNITS, costPerUnit },
    categories,
    items,
    meta: {
      headerRow: col.headerRow + 1,
      firstItemRow: items.length ? items[0].id : -1,
      lastItemRow: items.length ? items[items.length - 1].id : -1,
      totalRow: totalRow + 1,
      lineItemCount: items.length,
    },
  };
}
