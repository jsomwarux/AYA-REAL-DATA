# AYA Intelligence Platform - Project Context

## Overview
AYA is a construction project management intelligence platform built as a full-stack web application hosted on Replit. It provides real-time dashboards for construction progress tracking, budget management, timeline/Gantt scheduling, room specifications, vendor document management, and deal intelligence — powered by Google Sheets and Google Drive as primary data sources with PostgreSQL for timeline data.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter (lightweight router)
- **Data Fetching**: TanStack React Query
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Charts**: Recharts (BarChart, PieChart, ResponsiveContainer)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (dark theme)

### Backend
- **Runtime**: Node.js with Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session**: express-session (server-side sessions)
- **External APIs**: Google Sheets API + Google Drive API (via googleapis)
- **Schema Migrations**: drizzle-kit (`npx drizzle-kit push`)
- **Validation**: Zod (via drizzle-zod)

### Infrastructure
- **Hosting**: Replit
- **Database**: Replit PostgreSQL (via `DATABASE_URL`)
- **Environment Variables**: Managed via Replit Secrets

## Project Structure

```
AYA-REAL-DATA/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Landing.tsx              # Landing page with tab cards
│       │   ├── Overview.tsx             # Executive dashboard (all data sources)
│       │   ├── ConstructionProgress.tsx  # Construction tracking page
│       │   ├── Budget.tsx                # Budget tracking page
│       │   ├── Timeline.tsx             # Gantt/timeline page
│       │   ├── WeeklyGoals.tsx          # Weekly sprint goals tracking page
│       │   ├── ContainerSchedule.tsx    # Container shipment tracking page
│       │   ├── RoomSpecs.tsx            # Room specifications fact sheet page
│       │   ├── VendorInvoices.tsx       # Vendor documents from Google Drive page
│       │   ├── Deals.tsx                # Deal management page
│       │   ├── Settings.tsx             # App settings page
│       │   └── not-found.tsx            # 404 page
│       ├── components/
│       │   ├── dashboard/
│       │   │   ├── DashboardLayout.tsx   # Shared layout wrapper with sidebar + header
│       │   │   ├── Sidebar.tsx           # Navigation sidebar (auth-filtered)
│       │   │   └── StatCard.tsx          # Reusable stat card component
│       │   ├── TabPasswordGate.tsx       # Tab-based password gate (3 auth tiers)
│       │   ├── construction-progress/
│       │   │   ├── utils.ts             # Room/floor/task completion calculations
│       │   │   ├── TaskDetailModal.tsx   # Drill-down by task (with value distribution)
│       │   │   └── RoomDetailModal.tsx   # Drill-down by room (with Drive photos)
│       │   ├── timeline/
│       │   │   ├── TimelineChart.tsx     # Gantt-style calendar grid
│       │   │   ├── EventModal.tsx        # Create/edit/delete event dialog
│       │   │   └── TaskModal.tsx         # Create/edit/delete task dialog
│       │   ├── budget/
│       │   │   └── BudgetItemModal.tsx
│       │   ├── weekly-goals/
│       │   │   └── WeeklyGoalsDashboard.tsx  # Table, filters, stat cards
│       │   ├── container-schedule/
│       │   │   └── ContainerScheduleDashboard.tsx  # Table, filters, stat cards
│       │   ├── room-specs/
│       │   │   └── RoomSpecsDashboard.tsx  # Table, 21 columns, feature toggles, spec filters
│       │   ├── vendor-invoices/
│       │   │   └── VendorInvoicesDashboard.tsx  # Vendor accordion, PDF viewer, search
│       │   ├── deals/
│       │   │   ├── DealsDashboard.tsx
│       │   │   └── DealsTable.tsx
│       │   └── ui/                       # Shadcn/UI primitives
│       ├── hooks/
│       │   ├── use-document-title.ts
│       │   └── use-toast.ts
│       ├── lib/
│       │   ├── api.ts                    # All API client functions + TypeScript interfaces
│       │   ├── queryClient.ts            # React Query client config
│       │   └── utils.ts                  # Utility functions (cn, etc.)
│       └── App.tsx                       # Router setup
├── server/
│   ├── index.ts                          # Express server, session config, tab-based auth endpoints
│   ├── db.ts                             # Database connection
│   ├── routes/
│   │   ├── sheets.ts                     # Google Sheets + Drive data endpoints
│   │   └── timeline.ts                   # Timeline CRUD + Google Sheet import
│   └── services/
│       └── googleSheets.ts               # Google Sheets + Drive API service (fetch, list, stream, export)
├── shared/
│   └── schema.ts                         # Drizzle ORM schema definitions (DB tables + Zod validators)
└── drizzle.config.ts                     # Drizzle migration config
```

## Pages & Routes

| Route | Page | Auth Tier | Description |
|-------|------|-----------|-------------|
| `/` | Landing | None | Tab selection grid with auth status indicators |
| `/overview` | Overview | anyAuthenticated | Executive dashboard with key metrics from all sections |
| `/construction` | ConstructionProgress | construction | Room-by-room construction tracking from Google Sheets |
| `/budget` | Budget | management | Budget tracking, vendor spend, and cost analysis |
| `/timeline` | Timeline | management | Gantt-style project timeline (local DB with CRUD) |
| `/weekly-goals` | WeeklyGoals | management | Weekly sprint goals from Google Sheets |
| `/container-schedule` | ContainerSchedule | management | Container shipment tracking from Google Sheets |
| `/room-specs` | RoomSpecs | management | Room specifications fact sheet from Google Sheets |
| `/vendor-invoices` | VendorInvoices | management | Vendor documents from Google Drive |
| `/deals` | Deals | deals | Deal pipeline management |
| `/settings` | Settings | management | Application settings |

## Authentication / Tab-Based Password Gate

The app uses a 3-tier tab-based password system instead of individual user accounts.

### How It Works
1. **Backend** (`server/index.ts`):
   - Uses `express-session` for session management (7-day cookie)
   - `POST /api/auth/tab-login` — validates password against tier-specific env var (body: `{ password, tab }`)
   - `GET /api/auth/tab-check` — returns `{ construction, management, deals, anyAuthenticated }`
   - Session stores `constructionAuthenticated`, `managementAuthenticated`, `dealsAuthenticated` flags

2. **Frontend** (`client/src/components/TabPasswordGate.tsx`):
   - Wraps each page route in `App.tsx` with the appropriate tier
   - 3 auth tiers:
     - `construction` — validated against `PASSWORD_GATE` env var (Construction Progress access)
     - `management` — validated against `MANAGEMENT_PASSWORD_GATE` env var (Budget, Timeline, Weekly Goals, Container Schedule, Room Specs, Vendor Invoices, Settings)
     - `deals` — validated against `DEALS_PASSWORD` env var (Deal Intelligence access)
     - `anyAuthenticated` — Overview (accessible when any tier is unlocked)
   - On load, calls `/api/auth/tab-check` to see if session is valid for the required tier
   - If not authenticated, shows a centered password input card (dark themed)
   - On successful login, renders the page children

3. **Auth state** is managed via React Query (`["tab-auth"]` query key)
4. **Sidebar and mobile nav** dynamically show/hide items based on auth status

### Auth API Endpoints
- `POST /api/auth/tab-login` — Body: `{ password: string, tab: string }` → `{ success: true }` or `401`
- `GET /api/auth/tab-check` → `{ construction: boolean, management: boolean, deals: boolean, anyAuthenticated: boolean }`

## Database Schema (shared/schema.ts)

### Tables

#### `timeline_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| category | varchar(255) | Group name |
| task | varchar(500) | Task description |
| sort_order | integer | Optional ordering |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `timeline_events`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| task_id | integer FK | References timeline_tasks |
| start_date | varchar(20) | ISO date string |
| end_date | varchar(20) | ISO date string |
| label | varchar(255) | Event label (derived from type or custom) |
| color | varchar(50) | Hex color |
| created_at | timestamp | |

#### `custom_event_types`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| label | varchar(255) | Type name |
| color | varchar(50) | Hex color |
| created_at | timestamp | |

#### `sheet_rows`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sheet_id | varchar | Google Sheet identifier |
| row_data | jsonb | Raw row data |
| retrieved_at | timestamp | |

### Key Design Decisions
- Timeline data is stored locally in PostgreSQL (not read-only from Sheets) to allow direct editing
- Events support multi-week spans via `startDate` and `endDate` columns
- Tasks are organized by category with a `sortOrder` field
- Events are indexed by taskId, startDate, and endDate for efficient querying

## API Endpoints

### Auth (`/api/auth/`)
- `POST /tab-login` — Tab-based auth login (body: `{ password, tab }`)
- `GET /tab-check` — Check all tab auth statuses (returns `{ construction, management, deals, anyAuthenticated }`)

### Google Sheets & Drive (`/api/sheets/`)
- `GET /construction` — Construction Oversight data
- `GET /construction-progress` — Rooms Progress sheet (parsed)
- `GET /budget` — Budget data (parsed with totals, breakdowns)
- `GET /deals` — Deal Intelligence data (supports `DEALS_MOCK_MODE`)
- `GET /weekly-goals` — Weekly Goals data (parsed with summary stats)
- `GET /container-schedule` — Container Schedule data (parsed with summary stats)
- `GET /room-overview` — Room Specs fact sheet data (21-column fixed positional mapping)
- `GET /vendor-invoices` — Vendor Invoices from Drive (5-minute in-memory cache)
- `GET /drive-files` — List files in a Google Drive folder
- `GET /drive-file/:fileId` — Stream/proxy a Drive file (auto-exports Google-native files as PDF)
- `GET /sheet/:id` — Generic sheet data
- `GET /info/:id` — Spreadsheet metadata
- `POST /batch` — Batch sheet requests

### Timeline (`/api/timeline/`)
- `GET /` — Fetch all tasks, events, categories, weekDates
- `POST /import` — Import from Google Sheet
- `POST /tasks` — Create task
- `PUT /tasks/:id` — Update task
- `DELETE /tasks/:id` — Delete task + cascade events
- `PUT /categories/:name` — Rename category
- `DELETE /categories/:name` — Delete category (cascades tasks + events)
- `POST /events` — Create event
- `PUT /events/:id` — Update event
- `DELETE /events/:id` — Delete event
- `GET /event-types` — List custom event types
- `POST /event-types` — Create custom event type
- `PUT /event-types/:id` — Update custom event type
- `DELETE /event-types/:id` — Delete custom event type

### Health
- `GET /api/health` — Health check, reports sheetsConfigured status

## Google Sheets & Drive Service (`server/services/googleSheets.ts`)
- `fetchSheetData(spreadsheetId, range)` — Fetch rows from a sheet range
- `fetchMultipleRanges(spreadsheetId, ranges)` — Batch fetch multiple ranges
- `fetchSheetDataWithHyperlinks(spreadsheetId, sheetTitle, ...)` — Fetch with hyperlink resolution
- `getSpreadsheetInfo(spreadsheetId)` — Get sheet metadata (titles, IDs)
- `listDriveFiles(folderId)` — Recursively list all files in a Drive folder
- `listDriveSubfolders(parentId)` — List immediate subfolders of a Drive folder
- `getDriveFileStream(fileId)` — Stream a Drive file; auto-exports Google-native files (Sheets, Docs, Slides) as PDF via `drive.files.export()`

## Timeline Page (Key Feature Detail)

### Data Flow
1. **Import**: Google Sheet ("Summary - High Level" tab) is parsed via `POST /api/timeline/import`
2. **Storage**: Tasks and events stored in PostgreSQL
3. **Display**: Gantt-style calendar grid with analytics dashboard
4. **Editing**: Full CRUD via modals (EventModal, TaskModal)
5. **Re-import**: Manual button to refresh from Sheet (deletes and re-imports all data)

### Timeline Analytics
The Timeline page computes rich analytics from the event data:
- **Stats Row**: Total Events, Completed, This Week, Upcoming
- **Progress Bar**: Timeline progress with project completion detection
- **Category Breakdown**: Events per category with progress bars and hover tooltips
- **Milestones**: Clickable/expandable upcoming and recent milestone cards
- **Weekly Activity Chart**: Bar chart of events per week
- **Event Type Breakdown**: Pie chart of event labels

### Date Handling
- **Dynamic year inference**: `parseDateHeader()` determines year from current date context
  - Nov/Dec dates → if currently Nov/Dec, use current year; otherwise use previous year
  - Jan-Oct dates → if currently Nov/Dec, use next year; otherwise use current year
- **Week dates derived from events**: GET endpoint collects unique startDate/endDate values from all events rather than generating arbitrary dates
- **Fallback dates**: `getFallbackWeekDates()` generates Nov 14 → May 8 weekly dates when no events exist

### Event Color Scheme
| Label | Color |
|-------|-------|
| Begins / Start | Light blue (#93c5fd) |
| Complete / Finish | Green (#86efac) |
| Departs | Amber (#fcd34d) |
| Arrive / Arrive to US | Purple (#c4b5fd) |
| Installation | Teal (#5eead4) |
| Custom / Default | Gray (#d1d5db) |

### Project Categories
- 10th Floor + Lobby Design
- Branding
- China
- Construction - High Rise / Low Rise
- FINISHES
- Finishes & Misc
- Hiring
- IT
- Mechanical Systems
- OPENING
- PR & Social Media
- Website & Digital Performance

## Environment Variables (Replit Secrets)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `PASSWORD_GATE` | Construction-tier password |
| `MANAGEMENT_PASSWORD_GATE` | Management-tier password |
| `DEALS_PASSWORD` | Deals page password |
| `DEALS_MOCK_MODE` | Set to `true` for mock deal data |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_API_KEY` | Google API key (fallback, limited) |
| `CONSTRUCTION_SHEET_ID` | Google Sheet ID for construction oversight |
| `CONSTRUCTION_PROGRESS_SHEET_ID` | Google Sheet ID for construction progress |
| `BUDGET_SHEET_ID` | Google Sheet ID for budget data |
| `TIMELINE_SHEET_ID` | Google Sheet ID for timeline import |
| `DEALS_SHEET_ID` | Google Sheet ID for deals data |
| `WEEKLY_GOALS_SHEET_ID` | Google Sheet ID for weekly goals |
| `CONTAINER_SCHEDULE_SHEET_ID` | Google Sheet ID for container schedule |
| `ROOM_OVERVIEW_SHEET_ID` | Google Sheet ID for room specs fact sheet |
| `VENDOR_INVOICES_DRIVE_ID` | Google Drive folder ID for vendor invoices root |

## Key Design Decisions
- **Google Sheets as data source** for construction, budget, goals, container schedule, room specs — enables non-technical team members to update data
- **Google Drive for documents** — vendor invoices/contracts accessed via Drive API with server-side proxy for authenticated access
- **Google-native file export** — Sheets/Docs/Slides files automatically exported as PDF for inline viewing since they have no binary content
- **Server-side caching** — Vendor invoices use 5-minute in-memory cache to reduce Drive API calls
- **PostgreSQL for timeline** — requires CRUD operations not suited for Sheets
- **Tab-based auth** — 3-tier password system (construction, management, deals) with session persistence
- **Dark theme** — consistent dark UI across all pages using Tailwind + CSS custom properties
- **React Query** — automatic caching, refetching, and loading states for all data
- **Mobile-responsive** — all pages support mobile with card layouts, responsive dialogs, and collapsible filters
- **useMemo** for computed analytics to avoid re-calculation on every render
- **Optimistic UI** patterns for CRUD operations
- **Toast notifications** for success/error feedback (toastSuccess, toastError)
- **Collapsible categories** in the timeline grid view
- **Expandable milestone cards** that show full task details on click
