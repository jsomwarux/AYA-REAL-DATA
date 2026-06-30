# Aya Dashboard Expansion — Build Spec v3 (CORRECTED, BUILD-READY)

**Status:** All seven tabs confirmed from full-sheet screenshots. This v3 supersedes v1 and v2.
**What changed from v2:**
1. **New tab: LR Containers Distribution** (the LR analog of HR Containers — receipt/location for LR rooms). Now **4 room tabs + 3 common-area tabs = 7**.
2. **Tabs do NOT share a taxonomy — not even within a tower.** LR Containers (10 pkg / 90 parts) ≠ LR Installation (10 pkg / 83 parts): Minibar, Soft Goods, Bathroom, Lighting, Accessories all differ in part composition, and package order differs. Therefore the engine **discovers packages + parts dynamically from each tab's own header row**; the documented part lists are validation/labels only.
3. Containers cells use a **third split format** — `Container X and Y` (word "and") in addition to `Container X & Y`. Parser handles both.
4. **Blank cells** (no container recorded; shown magenta in the sheet) are distinct from N/A — count as not-received and surface as gaps.

This file is the source of truth. Build agents read it before writing code.

---

## 1. Client & existing system
- **Client:** Aya (tri-state real estate firm). Contact: **Gil**.
- **Purely additive** extension of a live, already-paid dashboard. Do not modify or break the existing `A.I Rooms WB Progress` views.
- **Stack (reuse):** React + TypeScript · Tailwind · Node/Express · Google Sheets API v4 **read-only** via service account · Recharts · Replit, password-protected (whole team sees everything).
- **Source sheet:** "Construction Progress Update" — `https://docs.google.com/spreadsheets/d/1MkTzQ8ucTFPVHi0G390mUYSVMa9sBgq-HtEaTahgLcM/edit`
- **Display preference:** Gil deferred to the developer ("do what you think is optimal").

---

## 2. Tab scope (7 tabs)

**Room tabs (4):**
| Tab | Type | Recompute | Vocab | Expected structure |
|---|---|---|---|---|
| HR Containers Distribution | Containers | % received | Containers (§6.1) | 12 pkg / 97 parts *(v1; validate)* |
| HR Installation Progress | Installation | % installed | HR install superset (§6.2) | 12 pkg / 97 parts *(v1; validate)* |
| LR Containers Distribution | Containers | % received | Containers (§6.1) | **10 pkg / 90 parts (§5b)** |
| LR-Installation Progress | Installation | % installed | LR dropdown (§6.3) | 10 pkg / 83 parts (§5a) |

**Common-area tabs (3):** CORRIDORS · STAIRCASE · TEMP/LOBBY (§8).

**Ignore entirely:** HR Warehouse/to hotel · LR Warehouse/to hotel.
**Not part of this work:** `A.I Rooms WB Progress` (existing live source).

---

## 3. Locked engineering decisions (do not relitigate)

### 3.1 Discover packages + parts dynamically per tab — NEVER by column letter, NEVER assume tabs share a taxonomy
Room tabs use hidden, grouped columns; column order differs across tabs; **and part composition differs across tabs** (proven: LR Containers vs LR Installation). So:

**Per-tab discovery algorithm (room tabs):**
1. **Fixed leading columns** = everything before the first column whose header contains "PACKAGE": Floor · (blank header = Room Line, e.g. "LR-LINE1") · Room Type · WHITE BOX · Room #. Map by known header.
2. **Package-summary column** = any column whose header contains "PACKAGE" (case-insensitive). Its cell value is the **manual package %**.
3. **Parts** = the columns *after* a package summary, up to the next package summary (or a trailing/empty column). Each part's header string is its name. **Match a part within its package group only** — names repeat across packages (Molding, Glass Shelves, Mirror variants) and across tabs.
4. **Trailing columns** = after the last package's parts, headers matching {Completion %, Missing, Final QA, Ready to Sell?, Notes, Missing-Open Notes} or blank → ignore/recompute.

The documented taxonomies in §4–§5b are **expected structures for validation + display labels**, not rigid matching keys. If a tab's live headers deviate, the dynamic reader still works; log a validation warning.

**Common-area tabs:** read task columns by header from row 2 (Corridors/Staircase) or by row (Temp/Lobby). Staircase has two sections (A, B) whose task names overlap — keep namespaced by section (§8.5). Read all populated rows dynamically.

### 3.2 Recompute every % from the part cells — never trust the manual %
Room tabs: recompute each package % from its parts (§7), **display both** recomputed + manual %, **flag mismatches** (a useful "your sheet is stale here" list). Common-area tabs have no manual package %; completion is derived from task cells, and the per-floor FULLY COMPLETED / FULLY DONE checkbox is compared to derived completion and flagged on mismatch.

### 3.3 Arrived-container list is a one-line config
Which container numbers have physically arrived is **developer-edited config** (`ARRIVED_CONTAINERS`), updated as containers land — no rebuild per container. **Default `'ALL'`** (every bare container number counts as received). Unconfirmed hint (verify, don't hardcode): blue ~22–23 may = arrived; orange ~24–25 may = incoming.

### 3.4 DECIDED — UNKNOWN LOCATION is LR Installation's "Not Found" equivalent
LR Installation has no literal "Not Found." **UNKNOWN LOCATION** carries that meaning and is the **loudest** problem alongside **Damaged**. `ON-site/ Missing Other` + `Confirm Item` = Attention tier. (LR *Containers* uses the Containers vocab and DOES have literal "Not Found" — see §6.1.)

### 3.5 DECIDED — "In-Room" (LR Installation) defaults to NOT installed, behind a config toggle
`In-Room` (green) is distinct from `In Room not Installed`. Per §7 (present ≠ installed) and §3.2, **In-Room = 0% by default**, exposed as `IN_ROOM_COUNTS_AS_INSTALLED` (default `false`). When false, In-Room items still appear in the actionable in-room list. Flip to `true` only if Gil's team confirms In-Room means placed/done.

---

## 4. HR taxonomy (expected for BOTH HR tabs — validate) — 12 packages, 97 parts
~128 rooms. Fixed cols: Floor · (blank=Room Line) · Room Type (King, Queen, Q-SPEAKEASY, K-SPEAKEASY, K-Connect-SPKEZ) · WHITE BOX · Room #. Per v1, HR Containers and HR Installation share these parts in different column orders — **but the LR pair proved tabs can diverge, so the build reads each HR tab independently and validates.** Verbatim (typos preserved):

- **HEADBOARD (8):** Headboard Panel · Headboard Wooden LED Track · Headboard Niche · Headboard Niche Door · Headboard Hanging Panel · Headboard Shelving Unit · Headboard Connecting Door To Speak Easy · Headboard Sliding Door Mechanism
- **TV UNIT (6):** TV Background · TV Unit Sliding Door · TV/Closet door Tambour Panel · TV Unit Marble · TV Unit Molding · TV Unit Shelves
- **MINIBAR (8):** Minibar · Minibar Marble Top · Minibar Mirror · Minibar Hanging Metal · Minibar Glass Shelves · Minibar Molding · Minibar Door · Minibar Ventilation
- **SPEAK EASY (10):** Speak Easy Bar Counter · Foot Rest For Bar Counter · Speak Easy Bar Metal Shelving · Speak Easy Glass Shelves · Speak Easy Minibar · Speak Easy Minibar Door · Speak Easy Minibar Ventilation · Speak Easy Bar Sconces · Speak Easy Mirror Plywood · Speak Easy Mirror
- **HIGH RISE SMALL CAVE BAR (5):** Cave Bar · Cave Bar Ceiling · Cave Bar Marble Top · Cave Bar Mirror · Bar Foot Rest
- **CLOSET (8):** Closet · Molding · Closet Marble · Transformer Door · Hanging Rod · Drawer Divider · Closet Ventilation · Closet Bottom Door
- **GREEN WALL / HANGING PANEL (3):** Wall Hanging Panel · Green Wall · Green Wall Side Panel For Sliding Door
- **BED (3):** Bed Base Frame · Bed Base Foundation · Headboard Upholstery
- **SOFT GOODS (9):** Carpet · Curtains Blackout & Sheer · Ottoman · Night Stand · Wooden Base Sofa · Side Table · Wooden Table / Marble Top Table · Brown Leather Chair · Bar Stools
- **BATHROOM (11):** Shower Window Frame · Marble Base Vanity · Vanity Metal Leg Base · Vanity Metal Base Shelves · Vanity Wooden Frame · Vanity Wooden Frame Bottom Marble · Vanity Wooden Frame Marble Backsplash · Mirror Vanity · Toilet · Bathroom Mirror Sliding Door · Mechanism Bathroom Sliding Door
- **LIGHTING (16):** Wooden Vanity Side Shelves LED Strip · Speak Easy Bar LED · Closet LED Strips · Bed Base LED Strips · Headboard LED Strip · TV LED Strip · Cave LED Strip · Platform LED Strip · Headboard Shelving Unit LED Strip · Headboard Niche LED Strip · Cave Bar Pendant Light · Cave Bar Side LED Strip · Sconces · Reading Lamp · Desk Lamp · Green Wall Light and Art
- **ACCESSORIES (10):** Minibar Outlet Cover · TV Mechanism · Niche Mechanism · Screws For Headboard Upholstry *(sic)* · Hooks For Wall Hanging Panel · Closet Door Hinge · Closet Hanging Rod · TV Cabinet Lift Handle · TV Cabinet Installation Hardware · TV Cabinet Sliding Door Accessories

---

## 5a. LR-Installation taxonomy (expected) — 10 packages, 83 parts
40 rooms, floors 7→4 (701–710, 601–610, 501–510, 401–410). Room types: LR-LINE / LR-CAVE; Double Full / King / King ADA. Package order on this tab: Green Wall → Headboard → TV Unit → Minibar → Closet → Bed → Soft Good → Bathroom → Lighting → Accessories.

- **GREEN WALL / HANGING PANEL (2):** Wall Hanging Panel · Green Wall
- **HEADBOARD (8):** Headboard Panel · Headboard Wooden LED Track · Ceiling Panel · Platform Panel · Headboard Niche · Headboard /L Shape Panel · Headboard Wooden Cabinet · Headboard Wooden Desk
- **TV UNIT (8):** TV Background · TV Unit Desk · TV Unit Marble Desk · TV Unit Desk Marble Support · TV Unit Sliding Door · TV Unit Molding · TV Tambour Panel · TV Unit Shelves
- **MINIBAR (8):** COMBO Minibar/Closet/Panels · Minibar With Door Drawer&Divider · Minibar Ventilation · Minibar Molding · Minibar Hanging Metal · Minibar Glass Shelves · Minibar Mirror · Minibar Marble Top
- **CLOSET (8):** Closet · Closet Bottom Door · Molding · Drawer Divider · Closet Ventilation · Closet Marble · Transformer Door · Hanging Rod
- **BED (4):** Bed Base Frame · Bed Base Foundation · Headboard Upholstery · L-Shaped Headboard Upholstery
- **SOFT GOOD (10):** Marble Desk · Ottoman / Bench · Carpet · Curtains Or Roller Shades Blackout & Sheer · Marble Night Stand · Marble End Table · Wooden Side Table · Sofa With Pillows · Lounge Chair · Brown Leather Chair
- **BATHROOM (13):** Shower Window Frame · Bathroom Shelves · Marble Base Vanity · Vanity Metal Leg Base · Vanity Metal Base Shelves · Vanity Wooden Frame · Vanity Wooden Frame Bottom Marble · Vanity Wooden Frame Marble Backsplash · Mirror Vanity · Shower head handles / handset · Towel bar/hooks toilet paper · Toilet · Bathroom Mirror Sliding Door
- **LIGHTING (14):** Wooden Vanity Side Shelves LED Strip · Speak Easy Bar LED · Closet LED Strips · Bed Base LED Strips · Headboard LED Strip · TV LED Strip · Cave LED Strip · Platform LED Strip · Headboard Shelving Unit LED Strip · Headboard Niche LED Strip · Sconces · Reading Lamp · Desk Lamp · Green Wall Light and Art
- **ACCESSORIES (8):** Minibar Outlet Cover · TV Mechanism · Niche Mechanism · Screws For Headboard Upholstry *(sic)* · Hooks For Wall Hanging Panel · Closet Door Hinge · TV Cabinet Installation Hardware · TV Cabinet Sliding Door Accessories

---

## 5b. LR Containers Distribution taxonomy (NEW) — 10 packages, 90 parts
Same 40 rooms as LR Installation (floors 7→4; 506 = King ADA; 703/706 manually red-flagged). **Distinct part composition from LR Installation.** Package order on this tab: Headboard → TV Unit → Minibar → Closet → Green Wall → Bed → Soft Goods → Bathroom → Lighting → Accessories. Trailing cols: Completion %, Missing → ignore. Verbatim as best transcribed (the dynamic reader uses live headers):

- **HEADBOARD (8):** Headboard Panel · Headboard Wooden LED Track · Ceiling Panel · Platform Panel · Headboard Niche · Headboard / L Shape Panel · Headboard Wooden Cabinet · Headboard Wooden Desk
- **TV UNIT (8):** TV Background · TV Unit Desk · TV Unit Marble Desk · TV Unit Desk Marble Support · TV Unit Sliding Door · TV Unit Molding · TV Tambour Panel · TV Unit Shelves
- **MINIBAR (11):** Minibar/Closet/Panel Combo · Minibar · Minibar Ventilation · Minibar Molding · Minibar Hanging Metal · Minibar Glass Shelves · Minibar Mirror · Minibar Marble Top · Minibar Plywood · Minibar Wooden Parts · Minibar Door
- **CLOSET (8):** Closet · Closet Bottom Door · Molding · Drawer Divider · Closet Ventilation · Closet Marble · Transformer Door · Hanging Rod
- **GREEN WALL / HANGING PANEL (2):** Wall Hanging Panel · Green Wall
- **BED (4):** Bed Base Frame · Bed Base Foundation · Headboard Upholstery · L-Shaped Headboard Upholstery
- **SOFT GOODS (12):** Marble Desk · Ottoman / Bench · Carpet · Curtains Blackout & Sheer · Night Stand · Marble End Table · Wooden Side Table · Sofa · Sofa Pillow · Lounge Chair · Brown Leather Chair · Bar Stools
- **BATHROOM (12):** Shower Window Frame · Marble Base Vanity · Vanity Metal Leg Base · Vanity Metal Base Shelves · Vanity Wooden Frame · Vanity Wooden Frame Bottom Marble · Vanity Wooden Frame Marble Backsplash · Bathroom Shelves · Mirror Vanity · Toilet · Bathroom Mirror Sliding Door · Mechanism Bathroom Sliding Door
- **LIGHTING (16):** Wooden Vanity Side Shelves LED Strip · Speak Easy Bar LED · Closet LED Strips · Bed Base LED Strips · Headboard LED Strip · TV LED Strip · Cave LED Strip · Platform LED Strip · Headboard Shelving Unit LED Strip · Headboard Niche LED Strip · Cave Bar Pendant Light · Cave Bar Side LED Strip · Sconces · Reading Lamp · Desk Lamp · Green Wall Light and Art
- **ACCESSORIES (9):** Minibar Outlet Cover · TV Mechanism · Niche Mechanism · Screws For Headboard Upholstry *(sic)* · Hooks For Wall Hanging Panel · Closet Door Hinge · TV Cabinet Lift Handle · TV Cabinet Installation Hardware · TV Cabinet Sliding Door Accessories

---

## 6. Value vocabularies

### 6.1 Containers tabs (HR Containers, LR Containers)
`Container 1–25` · `Container X & Y` (split) · **`Container X and Y` (split — word "and")** · `Container X & In China` (partial) · Remaining / In China · In Production · In NY Port · In transit · Damaged · Production Needed · Not Found · LOCAL · N/A · **(blank) = unrecorded**.
**Split parser must accept both `&` and the word `and`.** "X & In China" = one container arrived, rest still in China (partial).

### 6.2 HR Installation tab — superset of 6.1
All of 6.1 **plus:** Installed · In Progress · In Room Not Installed · On-Site Not Installed · Container Not Installed · On-Site/Office · In Warehouse · Missing Parts.

### 6.3 LR Installation tab — its OWN dropdown (distinct)
13 values: Installed · In Warehouse · In NY Port · In China · Damaged · In Room not Installed · **In-Room** · **UNKNOWN LOCATION** · N/A · **ON-site/ Missing Other** · **Not in Room** · **Unpacked/TBD** · **Confirm Item** — plus `Container N` in cells. No "In Progress", no "Not Found", no "Missing Parts".

---

## 7. Recompute & bucketing rules (keyed by tab TYPE)

`N/A` always excluded from the denominator. **Blank/empty** = not done, **kept in denominator**, and counted/surfaced separately as "unrecorded."

### 7.1 Containers tabs — "% received"
Received (numerator = 1): an **arrived** container number (per §3.3) · `Container X & Y` / `Container X and Y` (all listed containers arrived) · `LOCAL`. Everything else (incl. `X & In China`, In transit, In NY Port, Remaining/In China, In Production, Production Needed, Not Found, Damaged, blank) = 0.

### 7.2 Installation tabs — "% installed"
`Installed` = 1 · `In Progress` = 0.5 (HR only) · everything else = 0 (present-but-not-installed still 0). `In-Room` (LR) = 0 unless `IN_ROOM_COUNTS_AS_INSTALLED`.

### 7.3 Urgency buckets
| Bucket | In %? | Treatment |
|---|---|---|
| Received / Done | yes | Green |
| Incoming — low | no | Neutral/low |
| Upstream — higher | no | Warning |
| **Problem — LOUD** | no | High-priority alert |
| Attention | no | Mid alert |
| Unrecorded (blank) | denominator only* | Subtle flag |
| Excluded (N/A) | no | — |
*Blank stays in denominator as not-done.

Per-vocab mapping:
- **Containers (HR + LR Containers):** Received = arrived #, `X & Y`, `X and Y`, LOCAL · Incoming-low = In transit, In NY Port, not-arrived #, `X & In China` · Upstream = Remaining/In China, In Production, Production Needed · **LOUD = Not Found, Damaged** · Unrecorded = blank · Excluded = N/A.
- **HR Installation (superset):** as Containers + install states (Installed/In Progress/In Room Not Installed/On-Site Not Installed/Container Not Installed/On-Site/Office/In Warehouse → not-done) · **LOUD adds Missing Parts**.
- **LR Installation:** **LOUD = Damaged, UNKNOWN LOCATION** (§3.4) · **Attention = ON-site/ Missing Other, Confirm Item** · incoming/upstream = In Warehouse, In NY Port, In China, `Container N`, Unpacked/TBD · in-room (actionable) = In-Room, In Room not Installed, Not in Room · Excluded = N/A.
- **Common areas (§8):** done = Completed/Done · in-progress = In progress · **blocker (surface) = Waiting on product (Corridors), Need to order (Temp/Lobby)** · in-motion = Ordered · not-started = Not Yet, Not Started · **unknown → "other" (never crash)**.

**Gil's #1 priority:** surface "Not Found" (Containers tabs) + its LR-Installation analog UNKNOWN LOCATION. The problem bucket is the most prominent thing the dashboard shows.

---

## 8. Common-area tabs (mapped)
Row 1 = decorative merged banners — ignore; headers in **row 2**; data from **row 3**. Floors (Corridors + Staircase): **27→12, skipping 13 = 15 floors**. AREA = HIGH RISE. Read all populated rows dynamically.

### 8.4 CORRIDORS — 32 task columns (E→AJ)
Fixed: A=AREA · B=WHITE BOX (☑) · C=FULLY COMPLETED (☑) · D=FLOOR. Tasks, in order, verbatim:
Wallpaper Modings & Corners Removal · Carpet +Padding & Glue Removal · Floor Grinding & Repairs · Molded & Damage Walls Removal · Ceiling New LED & Recessed Light Wiring · Baseboard Led opening · Baseboard Led Preparation · Sheetrock Replacement · Doorbell Electric Box prep · New Fire Alarm Install · Walls Plastering · Ceiling Plastering · Walls & Ceiling Sanding · Prime Paint · Door Lock Removal · Access Panels & Vents Removal · Access Panels & Vents Painting · Door Lock Repair + Sanding · By GESI Lock New Opening · Walls &Ceiling Painting 1st coat · Painted Panels & Vents Install · Guest, Exits, Closets Door Painting · Doorbell Installation · Room Rumber With Brail *(sic)* · By GESI New Lock Installation · Baseboard &LED Installation · Exits, Floor & Elevator Signs · Door Number Installation · Camera Installation · Floor Cleaning · Padding Installing · Carpet Installation
Statuses: **Completed · In progress · Waiting on product · Not Started**. Blocker = Waiting on product.

### 8.5 STAIRCASE — two sections, 10 + 14 task columns
Fixed: A=AREA · B=FULLY DONE (☑) · C=WHITE BOX (☑) · D=FLOOR. (A1 "LADY D" label banner — ignore.)
**Section A (E–N, 10):** Molded & Damage Walls Removal · Sheetrock Replacement · Walls Plastering · Walls Sanding · Walls & Ceiling Paint · Rails & Floor Painting · Light Fixtures · Exits & Floor Door Signs · Camera Installation · Alarms Replacement
**Section B (O–AB, 14):** Molded & Damage Walls Removal · Sheetrock Replacement · Walls Plastering · Walls Sanding · Ceiling Prime Paint · Walls Prime Paint · Ceiling Walls Finish Paint · Rails & Floor Painting · Light Fixtures · Exits & Floor Signs · Camera Installation · Alarms Replacement · Sprinkler System Check · Fire Extingsher *(sic)*
**A and B repeat several names — keep namespaced by section.** Statuses: **Completed · Not Yet · Not Started**.

### 8.6 TEMP/LOBBY — flat task list
Col B = TASKS (44, rows 3–46) · Col C = STATUS. Embedded photos in cols D+ — ignore. Statuses: **Done · In progress · Not Started · Need to order · Ordered**. Blocker = Need to order. Row 17 ("PHR Alarm System") manually red-flagged. Completion = done / total.

---

## 9. Display / UX plan

1. **Exceptions panel (lead).** Across **all 4 room tabs**: every Damaged / Not Found (Containers) / UNKNOWN LOCATION (LR Install) / Missing Parts (HR Install) / split `& In China` (partial), grouped by severity → tab → room → package → part. LOUD items unmissable. Gil's priority view.
2. **Floor → room rollup** (rooms). Per tower, per floor, per room. Join Containers + Installation by **Room # + package name**: show each package's **% received** (from the tower's Containers tab) and **% installed** (from the Installation tab), each with manual-% mismatch flag; drill into parts (listed per source tab, since compositions differ). HR rooms get an "In Room Not Installed" filter; LR rooms get an "In-Room / In Room not Installed" actionable list.
3. **Container view** (rooms). Source = the two Containers tabs (authoritative for container→part mapping; may also fold in Installation-tab `Container N` refs). "When Container X lands, which rooms + parts unblock." Arrived vs pending per `ARRIVED_CONTAINERS`. Show `X & Y` / `X and Y` / `X & In China` cases distinctly.
4. **Common-area views.** Corridors (floor × 32 tasks), Staircase (floor × [A 10 | B 14] side by side), Temp/Lobby (flat 44-task checklist). Highlight blockers; flag FULLY COMPLETED/FULLY DONE vs derived. Keep simple — do not force into the room model.

General: recompute-and-flag everywhere it applies; surface blank/unrecorded gaps; header-based per-tab resilience; read-only; password-protected.

---

## 10. Config values (developer-edited)
- `ARRIVED_CONTAINERS`: `'ALL'` (default) or `Set<number>`.
- `IN_ROOM_COUNTS_AS_INSTALLED`: `false` (default).

---

## 11. Pricing (internal — not part of the build)
Proposal sent to Gil at **$1,500** (parity with the original dashboard; single invoice on completion). The new LR Containers tab does not change the quote. Do not re-quote.
