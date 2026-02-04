# Change Log

## February 4, 2026

### Weekly Goals Tab (New)
- **New page**: `/weekly-goals` — Tracks weekly sprint goals pulled from Google Sheets (`WEEKLY_GOALS_SHEET_ID`, tab: "New updated")
- 4 summary stat cards: Total Goals, Done, In Progress, Not Started
- Filterable/sortable goals table with search, assignee dropdown, status dropdown
- Color-coded assignee chips for 9 team members (Gil, Andrew, Fatima, Gilad, Mia, Daniel, Kobi, Libby, Liat)
- Color-coded status badges: Done (green), In Progress (blue), Partially Completed (amber), Did not start (red), Not done yet (gray)
- Comments shown via tooltip icon on hover
- Mobile-responsive card layout on small screens
- Protected by management password
- Dynamic tab name resolution via `getSpreadsheetInfo()` to handle exact tab name matching

**Files created:**
- `client/src/pages/WeeklyGoals.tsx`
- `client/src/components/weekly-goals/WeeklyGoalsDashboard.tsx`

**Files changed:**
- `server/routes/sheets.ts` — Added `GET /api/sheets/weekly-goals` endpoint
- `client/src/lib/api.ts` — Added `WeeklyGoal`, `WeeklyGoalsSummary`, `WeeklyGoalsData` types and `fetchWeeklyGoalsData()` function
- `client/src/App.tsx` — Added `/weekly-goals` route with management password gate
- `client/src/components/dashboard/Sidebar.tsx` — Added Weekly Goals nav item (orange Target icon)
- `client/src/pages/Landing.tsx` — Added Weekly Goals card to landing page grid

---

### Container Schedule Tab (New)
- **New page**: `/container-schedule` — Tracks container shipments from factory to warehouse, pulled from Google Sheets (`CONTAINER_SCHEDULE_SHEET_ID`, tab: "Summary")
- 4 summary stat cards: Total Containers, Shipped, At Port, Delivered
- Filterable/sortable table with search, factory dropdown, status dropdown
- Color-coded factory chips (IDM, SESE, ZHONGSHAN, ORBITA, DONGNA, DONGFANG, ZHONGBAI)
- Status badges following shipment lifecycle: Ready to be shipped (amber), Passed inspection (sky), Shipped (blue), Arrived NY Port (violet), Warehouse (emerald), Arrived to hotel (green)
- Expandable rows revealing full details: all date milestones (Delivery, Loading, Vessel Departure, ETA Port, ETA Warehouse), product details, and document links (BOL Copy, Insurance, Product List w/ Photos, Packing List, Warehouse Proof of Delivery)
- Key dates shown in main table: Vessel Departure, ETA NY Port, ETA Warehouse
- Truncated container contents with tooltip for long descriptions
- Mobile-responsive card layout
- Protected by management password
- Row 1 in sheet is a title/note row; headers parsed from Row 2
- Columns A-P: Factory, Container loaded, Shipment #, Container #, Delivery, Loading Date, Vessel Departure Date, ETA to NY Port, ETA to Warehouse, Status, BOL Copy, Insurance, Product list w/th photos, Packing list, Product Details, Warehouse Proof of delivery

**Files created:**
- `client/src/pages/ContainerSchedule.tsx`
- `client/src/components/container-schedule/ContainerScheduleDashboard.tsx`

**Files changed:**
- `server/routes/sheets.ts` — Added `GET /api/sheets/container-schedule` endpoint
- `client/src/lib/api.ts` — Added `ContainerScheduleItem`, `ContainerScheduleSummary`, `ContainerScheduleData` types and `fetchContainerScheduleData()` function
- `client/src/App.tsx` — Added `/container-schedule` route with management password gate
- `client/src/components/dashboard/Sidebar.tsx` — Added Container Schedule nav item (cyan Ship icon)
- `client/src/pages/Landing.tsx` — Added Container Schedule card to landing page grid

---

### Documentation Updates
- Updated `ProjectContext.md`, `PROJECT_CONTEXT.md`, and `ChangeLog.md` with Weekly Goals and Container Schedule tabs

---

## Previous Session Changes

### Overview Page Overhaul
- **Rewrote Overview page** to pull data from **all** data sources (Construction, Budget, Timeline) instead of just Construction
- Added 4 cross-cutting KPI stat cards: Construction Progress %, Total Budget, Timeline Tasks, Cost Per Room
- Added Budget Category donut pie chart with color legend
- Added Timeline Activity card showing active events (happening now) and upcoming events (next 2 weeks) with summary stats
- Added Budget Status card with spent progress bar, hard/soft costs, contingency, remaining budget, status breakdown
- Added Construction Completion card with bathroom/bedroom/overall progress bars and unit counts
- Added quick navigation cards linking to Construction, Budget, and Timeline pages
- Refresh button now refreshes all 3 data sources in parallel

**Files changed:**
- `client/src/pages/Overview.tsx` — Full rewrite. Now imports and queries `fetchBudgetData` and `fetchTimelineData` alongside construction data. Added budget pie chart, timeline activity, budget status, and construction completion sections.

---

### Timeline Custom Event Types (Full CRUD)
- **New DB table** `custom_event_types` in `shared/schema.ts` for user-defined event types
- **Server CRUD endpoints**: `GET/POST /api/timeline/event-types`, `PUT/DELETE /api/timeline/event-types/:id`
- **Client API functions**: `fetchCustomEventTypes()`, `createCustomEventType()`, `updateCustomEventType()`, `deleteCustomEventType()`
- **EventModal integration**: Users can create, rename, recolor, and delete event types inline from the edit event modal
- Event types persist in the database and appear in the dropdown and Event Types chart

**Files changed:**
- `shared/schema.ts` — Added `customEventTypes` table and Zod schema
- `server/routes/timeline.ts` — Added 4 custom event type endpoints (GET, POST, PUT, DELETE)
- `client/src/lib/api.ts` — Added `CustomEventType` interface and 4 API functions
- `client/src/components/timeline/EventModal.tsx` — Rewritten with inline event type management
- `client/src/pages/Timeline.tsx` — Added `customEventTypesQuery` and event type mutations, wired to EventModal

**Migration required:** Run `npx drizzle-kit push` on Replit shell to create the `custom_event_types` table.

---

### Timeline Category Management
- **Delete category**: Trash icon on category headers (appears on hover), confirmation dialog, cascades deletion of all tasks + events in that category
- **Rename category**: Pencil icon on category headers (appears on hover), rename dialog with Input pre-filled with current name
- **Server endpoints**: `PUT /api/timeline/categories/:name` (rename), `DELETE /api/timeline/categories/:name` (delete with cascade)
- **Client API functions**: `renameTimelineCategory()`, `deleteTimelineCategory()`

**Files changed:**
- `server/routes/timeline.ts` — Added `PUT /categories/:name` and `DELETE /categories/:name` endpoints
- `client/src/lib/api.ts` — Added `renameTimelineCategory()` and `deleteTimelineCategory()` functions
- `client/src/pages/Timeline.tsx` — Added `deleteCategoryMutation`, `renameCategoryMutation`, state for dialogs, AlertDialog UI for both rename and delete
- `client/src/components/timeline/TimelineChart.tsx` — Added `onCategoryDelete` and `onCategoryRename` props, Pencil and Trash2 icons on category headers with `e.stopPropagation()`

---

### EventModal UX Simplification
- **Merged** redundant Event Type dropdown and Label field into single source of truth
- Dropdown selection IS the label — no separate label input needed
- "Custom Label" text input + color picker only appear when "Custom..." is selected
- Eliminated confusing behavior where editing a label auto-converted the type to "Custom"

**Files changed:**
- `client/src/components/timeline/EventModal.tsx` — Removed always-visible Label input and Color picker. Added `selectedType` state (`'__custom__'` for custom). Derives `finalLabel`/`finalColor` from selection.

---

### Deals Password Fix (Server-Side Auth)
- **Root cause**: `client/src/pages/Deals.tsx` had hardcoded `const DEALS_PASSWORD = "aya2024"` and never read the `DEALS_PASSWORD` environment variable
- **Fix**: Created server-side auth endpoints: `POST /api/auth/deals-login` validates against `process.env.DEALS_PASSWORD`, `GET /api/auth/deals-check` checks session
- Extended `express-session` type with `dealsAuthenticated` flag

**Files changed:**
- `server/index.ts` — Added deals auth endpoints, extended session type declaration
- `client/src/pages/Deals.tsx` — Removed hardcoded password, replaced with server API calls

---

### Deals Mock Mode
- **Added** `DEALS_MOCK_MODE=true` environment variable support
- When enabled, server returns 8 mock deal records instead of fetching from Google Sheets
- Mock data array defined directly in server route

**Files changed:**
- `server/routes/sheets.ts` — Added mock data check at top of `/deals` route

---

### Budget Vendor Data Fix
- **Root cause**: Header matching in `server/routes/sheets.ts` only searched for `"payment"` but the Google Sheet column is named `"Vendors"`
- **Fix**: Expanded `paymentsIdx` header matching to also check for `"vendor"`, `"contractor"`, `"supplier"`

**Files changed:**
- `server/routes/sheets.ts` — Updated `paymentsIdx` finder to match multiple column name variants

---

### Removed Settings & Profile UI
- Removed Settings navigation item from sidebar (not needed for password-only auth model)
- Removed profile avatar and dropdown menu from header (no individual sign-ins)
- Cleaned up unused imports (Avatar, DropdownMenu components, User icon)

**Files changed:**
- `client/src/components/dashboard/Sidebar.tsx` — Set `bottomNavItems` to empty array, removed `Settings` import
- `client/src/components/dashboard/DashboardLayout.tsx` — Removed entire user avatar DropdownMenu block and unused imports

---

### Documentation
- Created `PROJECT_CONTEXT.md` — Full project architecture, tech stack, file structure, all API endpoints, DB schema, environment variables, key design decisions
- Updated `CHANGELOG.md` — Added all changes from this session

---

## January 29, 2026

### Password Gate
- **Added app-wide password protection**: The entire dashboard is now gated behind a password screen. Users must enter the correct password (from `PASSWORD_GATE` Replit secret) before accessing any page.
- **Backend**: Added `express-session` middleware and three auth endpoints (`/api/auth/login`, `/api/auth/check`, `/api/auth/logout`) to `server/index.ts`. Sessions persist for 7 days via cookie.
- **Frontend**: Created `PasswordGate.tsx` component that wraps the entire router in `App.tsx`. Shows a centered, dark-themed password card on load. Uses React Query for auth state management.
- **Graceful fallback**: If `PASSWORD_GATE` env var is not set, the gate is bypassed and the app is accessible without a password.

**Files changed:**
- `server/index.ts` — Added `express-session` import, session middleware, session type declaration, and three auth endpoints (`/api/auth/login`, `/api/auth/check`, `/api/auth/logout`).
- `client/src/components/PasswordGate.tsx` — New file. Password gate wrapper component with auth check, login form, error handling, and loading state.
- `client/src/App.tsx` — Wrapped `<Router />` with `<PasswordGate>` and added import.

---

### Timeline UI Improvements
- **Clickable milestone items**: Upcoming Milestones and Recent Completions cards now have clickable/expandable items. Clicking a milestone reveals full details including category, date range (with year), and full task name. Only one milestone can be expanded at a time. Added hover styling to indicate interactivity.
- **Category name tooltips**: Added native `title` attribute to category names in the "Events by Category" card so hovering over truncated names shows the full category name.

**Files changed:**
- `client/src/pages/Timeline.tsx` — Added `expandedMilestone` state, converted milestone items from static divs to clickable expand/collapse sections with detail panels, added `title` attribute to category breakdown names.

---

### "This Week" Stat Card Fix
- **Replaced "Active" with "This Week"**: The "Active - In progress now" stat was showing 0 even when milestones existed, because it used exact date matching. Replaced with "This Week" that counts events overlapping with the current calendar week (Sunday–Saturday boundaries).

**Files changed:**
- `client/src/pages/Timeline.tsx` — Changed stat card from "Active" to "This Week" using calendar week overlap logic (`startDate < endOfWeek && endDate >= startOfWeek`).

---

### Empty Project Schedule Grid Fix
- **Used actual event dates instead of generated dates**: After the year fix, the grid was empty because `generateWeekDates` snapped to Thursdays (Nov 13) but actual sheet dates were different days (Nov 14 = Friday). Since event lookup uses exact string matching, no events were found.
- **Fix**: Changed the GET endpoint to collect unique `startDate` and `endDate` values from all events in the database, using those as the week columns instead of generating arbitrary weekly dates. This ensures the grid columns exactly match the dates stored in events.

**Files changed:**
- `server/routes/timeline.ts` — GET endpoint now derives `weekDates` from actual event data (unique startDate/endDate values sorted). Simplified `generateWeeklyDates` to not snap to Thursdays. Removed unused `min`/`max` drizzle imports.

---

### Dynamic Year Parsing Fix (Root Cause Fix)
- **Problem**: Timeline showed "100% completed", "No upcoming milestones", "No recent completions" because `parseDateHeader` had hardcoded years (2024 for Nov/Dec, 2025 for Jan–May). Since today is January 29, 2026, the correct years should be 2025 for Nov/Dec and 2026 for Jan–May.
- **Fix**: Made `parseDateHeader` dynamically determine the year based on the current date. If currently in Jan–Oct: Nov/Dec = previous year, Jan–Oct = current year. If currently in Nov/Dec: Nov/Dec = current year, Jan–Oct = next year.
- **Also fixed**: Fallback `WEEK_DATES` array now generated dynamically via `getFallbackWeekDates()` using the same year logic.

**Files changed:**
- `server/routes/timeline.ts` — Rewrote `parseDateHeader()` with dynamic year inference. Added `getFallbackWeekDates()` function. Made `WEEK_DATES` constant use dynamic generation.

---

### Analytics Adaptation for Completed Projects
- **Project completion detection**: Added `isProjectComplete` flag (true when current date is past the last timeline date).
- **Adaptive stat cards**: When project is complete, milestone cards show "Final Milestones" and "Latest Completions" instead of "Upcoming Milestones" and "Recent Completions".
- **Progress bar**: Shows "Complete" badge and descriptive text when timeline is finished.
- **Milestone date labels**: Use relative labels ("Today", "Tomorrow", "In X days", "Yesterday", "X days ago") for active projects, and formatted dates for completed projects.

**Files changed:**
- `client/src/pages/Timeline.tsx` — Added `isProjectComplete` detection, adaptive milestone cards, progress bar completion state, relative date labels.

---

## Prior Work (Pre-January 29, 2026)

### Timeline Page - Full Implementation
Built the complete Timeline/Gantt page from scratch:

1. **Database Schema**: Added `timelineTasks` and `timelineEvents` tables to `shared/schema.ts` with appropriate indexes.
2. **Backend Routes**: Created `server/routes/timeline.ts` with full CRUD for tasks and events, plus Google Sheet import logic.
3. **Google Sheet Import**: Parses "Summary - High Level" tab, extracts categories/tasks/events, merges consecutive same-label cells into multi-week events.
4. **Frontend Page**: Built `client/src/pages/Timeline.tsx` (~900 lines) with analytics dashboard, stat cards, charts, and milestone cards.
5. **Timeline Chart**: Built `client/src/components/timeline/TimelineChart.tsx` — Gantt-style calendar grid with sticky headers, collapsible categories, current week highlighting, multi-week event bars.
6. **Event Modal**: Built `client/src/components/timeline/EventModal.tsx` — Dialog for creating/editing events with preset types, color picker, date range selector, preview.
7. **Task Modal**: Built `client/src/components/timeline/TaskModal.tsx` — Dialog for creating/editing tasks.
8. **Routing**: Added `/timeline` route to `client/src/App.tsx`.
9. **Navigation**: Added Timeline nav item to `client/src/components/dashboard/Sidebar.tsx`.
10. **API Types**: Added Timeline types and API functions to `client/src/lib/api.ts`.

### Other Pages (Built Earlier)
- Overview dashboard
- Construction Progress page (Google Sheets integration)
- Budget page
- Deals page
- Settings page
- Shared DashboardLayout, Sidebar, StatCard components
