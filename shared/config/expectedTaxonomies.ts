// Aya Dashboard Expansion — expected per-tab taxonomies (§4, §5a, §5b).
//
// These are for VALIDATION + DISPLAY LABELS ONLY. The reader discovers each
// tab's real packages + parts dynamically from its own header row (§3.1); if the
// live headers deviate from these lists, the reader still works and logs a
// validation warning. Tabs do NOT share a taxonomy — not even within a tower
// (proven: LR Containers ≠ LR Installation). Typos are preserved verbatim.

export interface ExpectedPackage {
  name: string;
  parts: string[];
}

export interface ExpectedTaxonomy {
  /** Exact sheetName of the tab this taxonomy describes (matches tabs.ts). */
  tab: string;
  packages: ExpectedPackage[];
}

// ---------------------------------------------------------------------------
// §4 — HR taxonomy: expected for BOTH HR tabs. 12 packages, 97 parts.
// HR Containers and HR Installation share these parts (different column orders),
// but each HR tab is still read independently and validated (§4).
// ---------------------------------------------------------------------------
const HR_PACKAGES: ExpectedPackage[] = [
  {
    name: 'HEADBOARD',
    parts: [
      'Headboard Panel',
      'Headboard Wooden LED Track',
      'Headboard Niche',
      'Headboard Niche Door',
      'Headboard Hanging Panel',
      'Headboard Shelving Unit',
      'Headboard Connecting Door To Speak Easy',
      'Headboard Sliding Door Mechanism',
    ],
  },
  {
    name: 'TV UNIT',
    parts: [
      'TV Background',
      'TV Unit Sliding Door',
      'TV/Closet door Tambour Panel',
      'TV Unit Marble',
      'TV Unit Molding',
      'TV Unit Shelves',
    ],
  },
  {
    name: 'MINIBAR',
    parts: [
      'Minibar',
      'Minibar Marble Top',
      'Minibar Mirror',
      'Minibar Hanging Metal',
      'Minibar Glass Shelves',
      'Minibar Molding',
      'Minibar Door',
      'Minibar Ventilation',
    ],
  },
  {
    name: 'SPEAK EASY',
    parts: [
      'Speak Easy Bar Counter',
      'Foot Rest For Bar Counter',
      'Speak Easy Bar Metal Shelving',
      'Speak Easy Glass Shelves',
      'Speak Easy Minibar',
      'Speak Easy Minibar Door',
      'Speak Easy Minibar Ventilation',
      'Speak Easy Bar Sconces',
      'Speak Easy Mirror Plywood',
      'Speak Easy Mirror',
    ],
  },
  {
    name: 'HIGH RISE SMALL CAVE BAR',
    parts: [
      'Cave Bar',
      'Cave Bar Ceiling',
      'Cave Bar Marble Top',
      'Cave Bar Mirror',
      'Bar Foot Rest',
    ],
  },
  {
    name: 'CLOSET',
    parts: [
      'Closet',
      'Molding',
      'Closet Marble',
      'Transformer Door',
      'Hanging Rod',
      'Drawer Divider',
      'Closet Ventilation',
      'Closet Bottom Door',
    ],
  },
  {
    name: 'GREEN WALL / HANGING PANEL',
    parts: [
      'Wall Hanging Panel',
      'Green Wall',
      'Green Wall Side Panel For Sliding Door',
    ],
  },
  {
    name: 'BED',
    parts: ['Bed Base Frame', 'Bed Base Foundation', 'Headboard Upholstery'],
  },
  {
    name: 'SOFT GOODS',
    parts: [
      'Carpet',
      'Curtains Blackout & Sheer',
      'Ottoman',
      'Night Stand',
      'Wooden Base Sofa',
      'Side Table',
      'Wooden Table / Marble Top Table',
      'Brown Leather Chair',
      'Bar Stools',
    ],
  },
  {
    name: 'BATHROOM',
    parts: [
      'Shower Window Frame',
      'Marble Base Vanity',
      'Vanity Metal Leg Base',
      'Vanity Metal Base Shelves',
      'Vanity Wooden Frame',
      'Vanity Wooden Frame Bottom Marble',
      'Vanity Wooden Frame Marble Backsplash',
      'Mirror Vanity',
      'Toilet',
      'Bathroom Mirror Sliding Door',
      'Mechanism Bathroom Sliding Door',
    ],
  },
  {
    name: 'LIGHTING',
    parts: [
      'Wooden Vanity Side Shelves LED Strip',
      'Speak Easy Bar LED',
      'Closet LED Strips',
      'Bed Base LED Strips',
      'Headboard LED Strip',
      'TV LED Strip',
      'Cave LED Strip',
      'Platform LED Strip',
      'Headboard Shelving Unit LED Strip',
      'Headboard Niche LED Strip',
      'Cave Bar Pendant Light',
      'Cave Bar Side LED Strip',
      'Sconces',
      'Reading Lamp',
      'Desk Lamp',
      'Green Wall Light and Art',
    ],
  },
  {
    name: 'ACCESSORIES',
    parts: [
      'Minibar Outlet Cover',
      'TV Mechanism',
      'Niche Mechanism',
      'Screws For Headboard Upholstry', // sic
      'Hooks For Wall Hanging Panel',
      'Closet Door Hinge',
      'Closet Hanging Rod',
      'TV Cabinet Lift Handle',
      'TV Cabinet Installation Hardware',
      'TV Cabinet Sliding Door Accessories',
    ],
  },
];

// ---------------------------------------------------------------------------
// §5a — LR-Installation taxonomy. 10 packages, 83 parts.
// Package order on the tab: Green Wall → Headboard → TV Unit → Minibar →
// Closet → Bed → Soft Good → Bathroom → Lighting → Accessories.
// ---------------------------------------------------------------------------
const LR_INSTALLATION_PACKAGES: ExpectedPackage[] = [
  {
    name: 'GREEN WALL / HANGING PANEL',
    parts: ['Wall Hanging Panel', 'Green Wall'],
  },
  {
    name: 'HEADBOARD',
    parts: [
      'Headboard Panel',
      'Headboard Wooden LED Track',
      'Ceiling Panel',
      'Platform Panel',
      'Headboard Niche',
      'Headboard /L Shape Panel',
      'Headboard Wooden Cabinet',
      'Headboard Wooden Desk',
    ],
  },
  {
    name: 'TV UNIT',
    parts: [
      'TV Background',
      'TV Unit Desk',
      'TV Unit Marble Desk',
      'TV Unit Desk Marble Support',
      'TV Unit Sliding Door',
      'TV Unit Molding',
      'TV Tambour Panel',
      'TV Unit Shelves',
    ],
  },
  {
    name: 'MINIBAR',
    parts: [
      'COMBO Minibar/Closet/Panels',
      'Minibar With Door Drawer&Divider',
      'Minibar Ventilation',
      'Minibar Molding',
      'Minibar Hanging Metal',
      'Minibar Glass Shelves',
      'Minibar Mirror',
      'Minibar Marble Top',
    ],
  },
  {
    name: 'CLOSET',
    parts: [
      'Closet',
      'Closet Bottom Door',
      'Molding',
      'Drawer Divider',
      'Closet Ventilation',
      'Closet Marble',
      'Transformer Door',
      'Hanging Rod',
    ],
  },
  {
    name: 'BED',
    parts: [
      'Bed Base Frame',
      'Bed Base Foundation',
      'Headboard Upholstery',
      'L-Shaped Headboard Upholstery',
    ],
  },
  {
    // Live sheet header is "SOFT GOODS" (plural); spec §5a transcribed it as
    // "SOFT GOOD". Aligned to live to silence the validation warning (parts match).
    name: 'SOFT GOODS',
    parts: [
      'Marble Desk',
      'Ottoman / Bench',
      'Carpet',
      'Curtains Or Roller Shades Blackout & Sheer',
      'Marble Night Stand',
      'Marble End Table',
      'Wooden Side Table',
      'Sofa With Pillows',
      'Lounge Chair',
      'Brown Leather Chair',
    ],
  },
  {
    name: 'BATHROOM',
    parts: [
      'Shower Window Frame',
      'Bathroom Shelves',
      'Marble Base Vanity',
      'Vanity Metal Leg Base',
      'Vanity Metal Base Shelves',
      'Vanity Wooden Frame',
      'Vanity Wooden Frame Bottom Marble',
      'Vanity Wooden Frame Marble Backsplash',
      'Mirror Vanity',
      'Shower head handles / handset',
      'Towel bar/hooks toilet paper',
      'Toilet',
      'Bathroom Mirror Sliding Door',
    ],
  },
  {
    name: 'LIGHTING',
    parts: [
      'Wooden Vanity Side Shelves LED Strip',
      'Speak Easy Bar LED',
      'Closet LED Strips',
      'Bed Base LED Strips',
      'Headboard LED Strip',
      'TV LED Strip',
      'Cave LED Strip',
      'Platform LED Strip',
      'Headboard Shelving Unit LED Strip',
      'Headboard Niche LED Strip',
      'Sconces',
      'Reading Lamp',
      'Desk Lamp',
      'Green Wall Light and Art',
    ],
  },
  {
    name: 'ACCESSORIES',
    parts: [
      'Minibar Outlet Cover',
      'TV Mechanism',
      'Niche Mechanism',
      'Screws For Headboard Upholstry', // sic
      'Hooks For Wall Hanging Panel',
      'Closet Door Hinge',
      'TV Cabinet Installation Hardware',
      'TV Cabinet Sliding Door Accessories',
    ],
  },
];

// ---------------------------------------------------------------------------
// §5b — LR Containers Distribution taxonomy. 10 packages, 90 parts.
// Distinct part composition from LR Installation. Package order on the tab:
// Headboard → TV Unit → Minibar → Closet → Green Wall → Bed → Soft Goods →
// Bathroom → Lighting → Accessories.
// ---------------------------------------------------------------------------
const LR_CONTAINERS_PACKAGES: ExpectedPackage[] = [
  {
    name: 'HEADBOARD',
    parts: [
      'Headboard Panel',
      'Headboard Wooden LED Track',
      'Ceiling Panel',
      'Platform Panel',
      'Headboard Niche',
      'Headboard / L Shape Panel',
      'Headboard Wooden Cabinet',
      'Headboard Wooden Desk',
    ],
  },
  {
    name: 'TV UNIT',
    parts: [
      'TV Background',
      'TV Unit Desk',
      'TV Unit Marble Desk',
      'TV Unit Desk Marble Support',
      'TV Unit Sliding Door',
      'TV Unit Molding',
      'TV Tambour Panel',
      'TV Unit Shelves',
    ],
  },
  {
    name: 'MINIBAR',
    parts: [
      'Minibar/Closet/Panel Combo',
      'Minibar',
      'Minibar Ventilation',
      'Minibar Molding',
      'Minibar Hanging Metal',
      'Minibar Glass Shelves',
      'Minibar Mirror',
      'Minibar Marble Top',
      'Minibar Plywood',
      'Minibar Wooden Parts',
      'Minibar Door',
    ],
  },
  {
    name: 'CLOSET',
    parts: [
      'Closet',
      'Closet Bottom Door',
      'Molding',
      'Drawer Divider',
      'Closet Ventilation',
      'Closet Marble',
      'Transformer Door',
      'Hanging Rod',
    ],
  },
  {
    name: 'GREEN WALL / HANGING PANEL',
    parts: ['Wall Hanging Panel', 'Green Wall'],
  },
  {
    name: 'BED',
    parts: [
      'Bed Base Frame',
      'Bed Base Foundation',
      'Headboard Upholstery',
      'L-Shaped Headboard Upholstery',
    ],
  },
  {
    name: 'SOFT GOODS',
    parts: [
      'Marble Desk',
      'Ottoman / Bench',
      'Carpet',
      'Curtains Blackout & Sheer',
      'Night Stand',
      'Marble End Table',
      'Wooden Side Table',
      'Sofa',
      'Sofa Pillow',
      'Lounge Chair',
      'Brown Leather Chair',
      'Bar Stools',
    ],
  },
  {
    name: 'BATHROOM',
    parts: [
      'Shower Window Frame',
      'Marble Base Vanity',
      'Vanity Metal Leg Base',
      'Vanity Metal Base Shelves',
      'Vanity Wooden Frame',
      'Vanity Wooden Frame Bottom Marble',
      'Vanity Wooden Frame Marble Backsplash',
      'Bathroom Shelves',
      'Mirror Vanity',
      'Toilet',
      'Bathroom Mirror Sliding Door',
      'Mechanism Bathroom Sliding Door',
    ],
  },
  {
    name: 'LIGHTING',
    parts: [
      'Wooden Vanity Side Shelves LED Strip',
      'Speak Easy Bar LED',
      'Closet LED Strips',
      'Bed Base LED Strips',
      'Headboard LED Strip',
      'TV LED Strip',
      'Cave LED Strip',
      'Platform LED Strip',
      'Headboard Shelving Unit LED Strip',
      'Headboard Niche LED Strip',
      'Cave Bar Pendant Light',
      'Cave Bar Side LED Strip',
      'Sconces',
      'Reading Lamp',
      'Desk Lamp',
      'Green Wall Light and Art',
    ],
  },
  {
    name: 'ACCESSORIES',
    parts: [
      'Minibar Outlet Cover',
      'TV Mechanism',
      'Niche Mechanism',
      'Screws For Headboard Upholstry', // sic
      'Hooks For Wall Hanging Panel',
      'Closet Door Hinge',
      'TV Cabinet Lift Handle',
      'TV Cabinet Installation Hardware',
      'TV Cabinet Sliding Door Accessories',
    ],
  },
];

/** Expected taxonomies keyed by tab sheetName. Both HR tabs reference the same
 *  HR taxonomy (§4); the LR tabs are distinct (§5a vs §5b). */
export const EXPECTED_TAXONOMIES: ExpectedTaxonomy[] = [
  { tab: 'HR Containers Distribution', packages: HR_PACKAGES },
  { tab: 'HR Installation Progress', packages: HR_PACKAGES },
  { tab: 'LR-Installation Progress', packages: LR_INSTALLATION_PACKAGES },
  { tab: 'LR Containers Distribution', packages: LR_CONTAINERS_PACKAGES },
];

/** Look up the expected taxonomy for a tab by sheetName. */
export function getExpectedTaxonomy(tab: string): ExpectedTaxonomy | undefined {
  return EXPECTED_TAXONOMIES.find((t) => t.tab === tab);
}

/** Total expected part count for a taxonomy (validation helper). */
export function countParts(taxonomy: ExpectedTaxonomy): number {
  return taxonomy.packages.reduce((sum, p) => sum + p.parts.length, 0);
}
