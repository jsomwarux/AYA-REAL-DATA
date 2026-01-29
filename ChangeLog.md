# Change Log

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
