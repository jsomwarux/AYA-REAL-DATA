# AYA Intelligence Platform - Project Context

## Overview
AYA is a construction project management intelligence platform built as a full-stack web application hosted on Replit. It provides real-time dashboards for construction progress tracking, budget management, timeline/Gantt scheduling, room specifications, vendor document management, and deal intelligence — powered by Google Sheets and Google Drive as primary data sources with PostgreSQL for timeline data.

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack Query (React Query) for server state, React useState for local UI
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Session**: express-session (server-side sessions)
- **External APIs**: Google Sheets API + Google Drive API (via googleapis)
- **Migration Tool**: drizzle-kit (`npx drizzle-kit push`)

### Infrastructure
- **Hosting**: Replit
- **Database**: Replit PostgreSQL (via `DATABASE_URL`)
- **Environment Variables**: Managed via Replit Secrets

## Project Structure

```
AYA-REAL-DATA/
├── client/                          # React frontend
│   └── src/
│       ├── components/
│       │   ├── dashboard/           # Layout components
│       │   │   ├── DashboardLayout.tsx   # Main layout with sidebar + header
│       │   │   ├── Sidebar.tsx          # Navigation sidebar (auth-filtered)
│       │   │   └── StatCard.tsx         # KPI stat card component
│       │   ├── TabPasswordGate.tsx      # Tab-based password gate (3 auth tiers)
│       │   ├── construction-progress/   # Construction page components
│       │   │   ├── utils.ts             # Room/floor/task completion calculations
│       │   │   ├── TaskDetailModal.tsx   # Drill-down by task (with value distribution)
│       │   │   └── RoomDetailModal.tsx   # Drill-down by room (with Drive photos)
│       │   ├── timeline/            # Timeline page components
│       │   │   ├── TimelineChart.tsx     # Gantt chart grid
│       │   │   ├── EventModal.tsx       # Create/edit/delete events
│       │   │   └── TaskModal.tsx        # Create/edit/delete tasks
│       │   ├── budget/              # Budget page components
│       │   │   └── BudgetItemModal.tsx
│       │   ├── weekly-goals/        # Weekly goals page components
│       │   │   └── WeeklyGoalsDashboard.tsx  # Table, filters, stat cards
│       │   ├── container-schedule/  # Container schedule page components
│       │   │   └── ContainerScheduleDashboard.tsx  # Table, filters, stat cards
│       │   ├── room-specs/          # Room specs page components
│       │   │   └── RoomSpecsDashboard.tsx  # Table, 21 columns, feature toggles, spec filters
│       │   ├── vendor-invoices/     # Vendor invoices page components
│       │   │   └── VendorInvoicesDashboard.tsx  # Vendor accordion, PDF viewer, search
│       │   ├── deals/               # Deals page components
│       │   │   ├── DealsDashboard.tsx
│       │   │   └── DealsTable.tsx
│       │   └── ui/                  # shadcn/ui primitives
│       ├── pages/
│       │   ├── Landing.tsx          # Landing page with tab cards
│       │   ├── Overview.tsx         # Executive dashboard (all data sources)
│       │   ├── ConstructionProgress.tsx
│       │   ├── Budget.tsx
│       │   ├── Timeline.tsx
│       │   ├── WeeklyGoals.tsx      # Weekly sprint goals tracking
│       │   ├── ContainerSchedule.tsx # Container shipment tracking
│       │   ├── RoomSpecs.tsx        # Room specifications fact sheet
│       │   ├── VendorInvoices.tsx   # Vendor documents from Google Drive
│       │   └── Deals.tsx            # Password-protected deal intelligence
│       ├── hooks/
│       │   ├── use-document-title.ts
│       │   └── use-toast.ts
│       └── lib/
│           ├── api.ts               # All API client functions + TypeScript interfaces
│           ├── queryClient.ts       # React Query client config
│           └── utils.ts             # cn() utility
├── server/
│   ├── index.ts                     # Express server, session config, tab-based auth endpoints
│   ├── db.ts                        # Drizzle database connection
│   ├── routes/
│   │   ├── sheets.ts                # Google Sheets + Drive data endpoints
│   │   └── timeline.ts              # Timeline CRUD endpoints (tasks, events, categories, event types)
│   └── services/
│       └── googleSheets.ts          # Google Sheets + Drive API service (fetch, list, stream, export)
├── shared/
│   └── schema.ts                    # Drizzle ORM schema (DB tables + Zod validators)
└── drizzle.config.ts                # Drizzle Kit configuration
```

## Pages & Features

### 1. Landing (`/`)
- Tab selection grid with auth status indicators (lock icons)
- Overview card spans full width when authenticated
- Each tab card links to its page

### 2. Overview (`/overview`)
- Executive dashboard pulling data from all sources
- KPI stat cards: Construction %, Total Budget, Timeline Tasks, Cost Per Room
- Floor progress bar chart + Budget category pie chart
- Tasks needing attention (lowest completion construction tasks)
- Timeline activity (active + upcoming events)
- Budget status summary with progress bar
- Construction completion breakdown (bathroom/bedroom/overall)
- Quick navigation cards to all pages
- Requires any tier to be authenticated

### 3. Construction Progress (`/construction`)
- Room-by-room progress tracking from Google Sheets
- Bathroom tasks: Demo, Electrical, Waterproofing, Sheetrock, Tile %, etc.
- Bedroom tasks: Electric Wiring, HVAC, Plastering, Sanding, Paint, Flooring, etc.
- Floor-level aggregation and completion percentages
- Task detail modal with value distribution breakdown
- Room detail modal with Drive-hosted room photos and video thumbnails
- Protected by construction password

### 4. Budget (`/budget`)
- Budget line items from Google Sheets
- Totals: Total Budget, Hard Costs, Soft Costs, Contingency, Paid Thus Far, Cost Per Room
- Category breakdown chart
- Vendor breakdown chart (column: "Vendors" in Google Sheet)
- Status breakdown (Contract, Realistic, Rough estimates)
- Filterable/sortable budget table
- Protected by management password

### 5. Timeline (`/timeline`)
- Interactive Gantt chart stored in PostgreSQL
- **Tasks**: CRUD with category grouping and sort ordering
- **Events**: Multi-week bar rendering, color-coded, labeled
- **Categories**: Collapsible groups with rename (pencil icon) and delete (trash icon) on hover
- **Custom Event Types**: Full CRUD — create, rename, recolor, delete from EventModal
- Import from Google Sheets
- Event type chart showing distribution
- Protected by management password

### 6. Weekly Goals (`/weekly-goals`)
- Weekly sprint goals from Google Sheets (tab: "New updated")
- Summary stat cards: Total Goals, Done, In Progress, Not Started
- Filterable/sortable goals table with search, assignee filter, status filter
- Color-coded assignee chips (Gil, Andrew, Fatima, Gilad, Mia, Daniel, Kobi, Libby, Liat)
- Status badges: Done (green), In Progress (blue), Partially Completed (amber), Did not start (red), Not done yet (gray)
- Mobile-responsive card layout
- Protected by management password

### 7. Container Schedule (`/container-schedule`)
- Container shipment tracking from Google Sheets (tab: "Summary")
- Summary stat cards: Total Containers, Shipped, At Port, Delivered
- Filterable/sortable table with search, factory filter, status filter
- Color-coded factory chips (IDM, SESE, ZHONGSHAN, ORBITA, DONGNA, DONGFANG, ZHONGBAI)
- Status badges: Ready to be shipped (amber), Shipped (blue), Arrived NY Port (violet), Warehouse (emerald), Arrived to hotel (green)
- Expandable rows showing all dates, product details, and document links
- Mobile-responsive card layout
- Protected by management password

### 8. Room Specs (`/room-specs`)
- Room specifications and fact sheet from Google Sheets (`ROOM_OVERVIEW_SHEET_ID`, tab: "Fact Sheet")
- 21 columns via fixed positional indexing (A=0 through U=20): Floor, Room Number, Size Category, Room Type, Bed Size, ADA, Moxy Bar, Living Wall, Shower Window, Closet Type, Desk Type, Vanity Mirror, Shower Head, Bath Accessories, Toilet Type, Shower Drain, Bathtub, Chair Type, Nightstand, Lighting Package
- Summary stats: Total Rooms, Floors, ADA Rooms, by Room Type/Bed Size
- 5 primary dropdown filters: Floor, Size, Room Type, Bed Size, ADA
- 7 feature toggle chips (tri-state All/Yes/No) for boolean columns
- 7 spec dropdown filters in collapsible "More Filters" section
- Desktop table (`table-fixed` layout) + mobile card view
- Floor derivation fallback: `Math.floor(roomNumber / 100)` for merged cell data
- Protected by management password

### 9. Vendor Invoices (`/vendor-invoices`)
- Browse vendor documents/invoices from Google Drive (`VENDOR_INVOICES_DRIVE_ID`)
- Lists vendor subfolders from Drive root, recursively fetches all files per vendor
- 3 summary stat cards: Total Vendors, Total Documents, PDFs
- Search bar filtering vendor names AND file names
- Vendor accordion list with file counts and type-specific icons
- Inline PDF viewer dialog (near-fullscreen modal with iframe)
- Google-native files (Sheets, Docs, Slides) auto-exported as PDF via `drive.files.export()`
- Download and "Open in Drive" buttons
- 5-minute server-side in-memory cache
- Mobile-responsive: 96vw/95vh dialog, icon-only buttons, larger touch targets
- Protected by management password

### 10. Deal Intelligence (`/deals`)
- Password-protected (separate `DEALS_PASSWORD` env var, server-side auth)
- Deal records from Google Sheets
- Supports `DEALS_MOCK_MODE=true` for demo data
- Deal analysis dashboard with key metrics

## Authentication
- **Tab-based password gate**: `TabPasswordGate` component with 3 auth tiers:
  - `construction` — validated against `PASSWORD_GATE` env var (Construction Progress access)
  - `management` — validated against `MANAGEMENT_PASSWORD_GATE` env var (Budget, Timeline, Weekly Goals, Container Schedule, Room Specs, Vendor Invoices, Settings)
  - `deals` — validated against `DEALS_PASSWORD` env var (Deal Intelligence access)
  - `anyAuthenticated` — Overview (accessible when any tier is unlocked)
- **Session-based**: express-session with `constructionAuthenticated`, `managementAuthenticated`, `dealsAuthenticated` flags
- **No individual user accounts** — app is team-shared with tiered password protection
- Sidebar and mobile nav dynamically show/hide items based on auth status

## Database Schema (PostgreSQL + Drizzle)

### `timeline_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| category | varchar(255) | Group name |
| task | varchar(500) | Task description |
| sort_order | integer | Optional ordering |
| created_at | timestamp | |
| updated_at | timestamp | |

### `timeline_events`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| task_id | integer FK | References timeline_tasks |
| start_date | varchar(20) | ISO date string |
| end_date | varchar(20) | ISO date string |
| label | varchar(255) | Event label (derived from type or custom) |
| color | varchar(50) | Hex color |
| created_at | timestamp | |

### `custom_event_types`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| label | varchar(255) | Type name |
| color | varchar(50) | Hex color |
| created_at | timestamp | |

### `sheet_rows`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sheet_id | varchar | Google Sheet identifier |
| row_data | jsonb | Raw row data |
| retrieved_at | timestamp | |

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
- `GET /` — All timeline data (tasks, events, categories, weekDates)
- `POST /import` — Import from Google Sheet
- `POST /tasks` — Create task
- `PUT /tasks/:id` — Update task
- `DELETE /tasks/:id` — Delete task
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

## Google Sheets & Drive Service (`server/services/googleSheets.ts`)
- `fetchSheetData(spreadsheetId, range)` — Fetch rows from a sheet range
- `fetchMultipleRanges(spreadsheetId, ranges)` — Batch fetch multiple ranges
- `fetchSheetDataWithHyperlinks(spreadsheetId, sheetTitle, ...)` — Fetch with hyperlink resolution
- `getSpreadsheetInfo(spreadsheetId)` — Get sheet metadata (titles, IDs)
- `listDriveFiles(folderId)` — Recursively list all files in a Drive folder
- `listDriveSubfolders(parentId)` — List immediate subfolders of a Drive folder
- `getDriveFileStream(fileId)` — Stream a Drive file; auto-exports Google-native files (Sheets, Docs, Slides) as PDF via `drive.files.export()`

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
