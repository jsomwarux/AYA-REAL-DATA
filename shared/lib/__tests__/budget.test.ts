// Budget engine tests (Schedule Summary source). Pure, no I/O.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildScheduleSummaryBudget, parseBudgetNumber, CONTINGENCY_RATE, BUDGET_UNITS } from '../budget';

// A fixture that mirrors the real tab's traps: a banner row, a header row with a SECOND
// "Paid" column (must be ignored), spacer rows, "Total Demo"/"Total BOH" real line items,
// typo categories, an explicit $0 item, a blank-cost item (excluded), a blank-category
// item (→ Uncategorized), then the TOTAL boundary + Contingency/TEST/second-summary below.
// Columns: 0=A name, 1=B, 2=C EstimatedCost, 3=D Paid, 4=E lowRise, 5=F Category, 6=G, 7=H "Paid" TRAP.
const GRID: (string | number)[][] = [
  ['', '', '', '', '', '', 'LOW RISE', ''], // row 1 banner
  ['', 'Weeks for commpletion', 'Estimated Cost', 'Paid', 'Required for low rise', 'Category', '5/15/2026', 'Paid'], // row 2 header
  ['', '', '', '', '', '', '', ''], // row 3 spacer
  ['Building Exterior', 4, 35000, 0, 'TRUE', 'Exterior Cleaning', 0, 999], // row 4  (trap Paid=999 must be ignored)
  ['', '', '', '', '', '', '', ''], // row 5 spacer
  ['Total Demo', '', 67603.05, 67603, 'TRUE', 'Labor', 0, 0], // row 6  real line item (name starts "Total"), tests cents precision
  ['Total BOH (Back of House)', '', 50000, 25000, 'TRUE', 'Construction & Material', 0, 0], // row 7 real line item
  ['Library Books', '', 62728, 0, 'FALSE', 'Libarary', 0, 0], // row 8  typo category
  ['Elevator Fix', '', 95000, 24128, 'TRUE', 'Mechanical Elevetor', 0, 0], // row 9 typo category
  ['Base board (not bought yet)', '', 0, 0, 'TRUE', 'Rooms', 0, 0], // row 10 explicit $0 → kept
  ['Sprinkler (no quote)', '', '', 0, 'TRUE', 'Rooms', 0, 0], // row 11 blank cost → EXCLUDED
  ['Misc uncategorized', '', 10000, 5000, 'TRUE', '', 0, 0], // row 12 blank category → Uncategorized
  ['', '', '', '', '', '', '', ''], // row 13 spacer
  ['TOTAL', '', 999999, 999999, '', '', 0, 0], // row 14 BOUNDARY — stop here
  ['Contingency', '', '10%', '', '', '', 0, 0], // row 15 excluded
  ['TEST >>', '', 0, 0, '', '', 0, 0], // row 16 excluded
  ['TOTAL ESTIMATED COST (Before Contingency)', '', 320331.05, '', '', '', 0, 0], // row 17 excluded
];

const EXPECTED_C = 35000 + 67603.05 + 50000 + 62728 + 95000 + 0 + 10000; // 320331.05
const EXPECTED_D = 0 + 67603 + 25000 + 0 + 24128 + 0 + 5000; // 121731
const close = (a: number, b: number, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('boundary: keeps "Total Demo"/"Total BOH", stops at standalone TOTAL, drops Contingency/TEST/second-summary', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const names = r.items.map((i) => i.name);
  assert.ok(names.includes('Total Demo'));
  assert.ok(names.includes('Total BOH (Back of House)'));
  assert.ok(!names.includes('TOTAL'));
  assert.ok(!names.includes('Contingency'));
  assert.ok(!names.includes('TEST >>'));
  assert.ok(!names.some((n) => n.startsWith('TOTAL ESTIMATED COST')));
  assert.equal(r.meta.totalRow, 14); // 1-based row of "TOTAL"
});

test('line-item rule: blank-cost excluded, explicit $0 kept, spacer rows skipped', () => {
  const r = buildScheduleSummaryBudget(GRID);
  assert.equal(r.meta.lineItemCount, 7);
  assert.ok(!r.items.some((i) => i.name === 'Sprinkler (no quote)')); // blank C excluded
  const zero = r.items.find((i) => i.name.startsWith('Base board'));
  assert.ok(zero && zero.estimatedCost === 0); // explicit $0 kept
  assert.equal(r.meta.firstItemRow, 4);
  assert.equal(r.meta.lastItemRow, 12);
});

test('ignores the second "Paid" column (col H trap) — uses column D only', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const ext = r.items.find((i) => i.name === 'Building Exterior')!;
  assert.equal(ext.paid, 0); // NOT 999 from the trap column
});

test('precision: numeric (UNFORMATTED) values are preserved to the cent', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const demo = r.items.find((i) => i.name === 'Total Demo')!;
  assert.equal(demo.estimatedCost, 67603.05);
  close(r.totals.estimatedBeforeContingency, EXPECTED_C);
  close(r.totals.paid, EXPECTED_D);
});

test('totals math: contingency, total, remaining, costPerUnit, paidPct', () => {
  const r = buildScheduleSummaryBudget(GRID);
  close(r.totals.contingency, EXPECTED_C * CONTINGENCY_RATE);
  close(r.totals.total, EXPECTED_C * (1 + CONTINGENCY_RATE));
  close(r.totals.remaining, EXPECTED_C * 1.1 - EXPECTED_D);
  close(r.totals.costPerUnit, (EXPECTED_C * 1.1) / BUDGET_UNITS);
  close(r.totals.paidPct, (EXPECTED_D / (EXPECTED_C * 1.1)) * 100);
  assert.equal(r.totals.units, 166);
  assert.equal(r.totals.contingencyRate, 0.1);
});

test('category rollup: groups on RAW value, ties to ΣC, sorted desc, blank → Uncategorized', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const sum = r.categories.reduce((s, c) => s + c.total, 0);
  close(sum, r.totals.estimatedBeforeContingency); // ties exactly
  // sorted descending
  for (let i = 1; i < r.categories.length; i++) assert.ok(r.categories[i - 1].total >= r.categories[i].total);
  const uncat = r.categories.find((c) => c.name === 'Uncategorized')!;
  assert.ok(uncat && uncat.total === 10000 && uncat.displayName === 'Uncategorized');
  const rooms = r.categories.find((c) => c.name === 'Rooms')!;
  assert.equal(rooms.total, 0); // explicit $0 item still forms a (zero) category entry
});

test('display-name map: presentation only — grouping key stays raw, label is prettified', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const lib = r.categories.find((c) => c.name === 'Libarary')!;
  assert.equal(lib.displayName, 'Library');
  const elev = r.categories.find((c) => c.name === 'Mechanical Elevetor')!;
  assert.equal(elev.displayName, 'Mechanical Elevator');
  const ext = r.categories.find((c) => c.name === 'Exterior Cleaning')!;
  assert.equal(ext.displayName, 'Exterior Cleaning'); // unmapped → verbatim
  // item-level display category too
  assert.equal(r.items.find((i) => i.name === 'Elevator Fix')!.displayCategory, 'Mechanical Elevator');
});

test('category pct is share of before-contingency estimated total', () => {
  const r = buildScheduleSummaryBudget(GRID);
  const elev = r.categories.find((c) => c.name === 'Mechanical Elevetor')!;
  close(elev.pct, (95000 / EXPECTED_C) * 100);
});

test('parseBudgetNumber: handles $, commas, parens, blanks, JS numbers', () => {
  assert.equal(parseBudgetNumber('$1,234.50'), 1234.5);
  assert.equal(parseBudgetNumber(1234.5), 1234.5);
  assert.equal(parseBudgetNumber('(500)'), -500);
  assert.equal(parseBudgetNumber(''), null);
  assert.equal(parseBudgetNumber('-'), null);
  assert.equal(parseBudgetNumber('n/a'), null);
  assert.equal(parseBudgetNumber(true), null);
});

test('case-insensitive boundary: lowercase "total" also stops; extra words do not', () => {
  const g: (string | number)[][] = [
    ['', '', '', '', '', ''],
    ['', 'w', 'Estimated Cost', 'Paid', 'Required for low rise', 'Category'],
    ['Real item', '', 100, 0, 'TRUE', 'Rooms'],
    ['total', '', 999, 0, '', ''], // lowercase standalone → boundary
    ['Below', '', 500, 0, 'TRUE', 'Rooms'],
  ];
  const r = buildScheduleSummaryBudget(g);
  assert.equal(r.meta.lineItemCount, 1);
  assert.equal(r.totals.estimatedBeforeContingency, 100);
});
