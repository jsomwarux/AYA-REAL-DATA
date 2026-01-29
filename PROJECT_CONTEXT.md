# AYA Intelligence Platform - Project Context

## Overview
AYA is a construction project management intelligence platform built as a full-stack web application hosted on Replit. It provides real-time dashboards for construction progress tracking, budget management, timeline/Gantt scheduling, and deal intelligence — all powered by Google Sheets as the primary data source with a PostgreSQL database for timeline data.

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
- **External APIs**: Google Sheets API (via googleapis)
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
│       │   │   ├── Sidebar.tsx          # Navigation sidebar
│       │   │   └── StatCard.tsx         # KPI stat card component
│       │   ├── construction-progress/   # Construction page components
│       │   │   ├── utils.ts             # Room/floor/task completion calculations
│       │   │   ├── TaskDetailModal.tsx   # Drill-down by task
│       │   │   └── RoomDetailModal.tsx   # Drill-down by room
│       │   ├── timeline/            # Timeline page components
│       │   │   ├── TimelineChart.tsx     # Gantt chart grid
│       │   │   ├── EventModal.tsx       # Create/edit/delete events
│       │   │   └── TaskModal.tsx        # Create/edit/delete tasks
│       │   ├── budget/              # Budget page components
│       │   │   └── BudgetItemModal.tsx
│       │   ├── deals/               # Deals page components
│       │   │   ├── DealsDashboard.tsx
│       │   │   └── DealsTable.tsx
│       │   └── ui/                  # shadcn/ui primitives
│       ├── pages/
│       │   ├── Overview.tsx         # Executive dashboard (all data sources)
│       │   ├── ConstructionProgress.tsx
│       │   ├── Budget.tsx
│       │   ├── Timeline.tsx
│       │   └── Deals.tsx            # Password-protected deal intelligence
│       ├── hooks/
│       │   ├── use-document-title.ts
│       │   └── use-toast.ts
│       └── lib/
│           ├── api.ts               # All API client functions + TypeScript interfaces
│           └── utils.ts             # cn() utility
├── server/
│   ├── index.ts                     # Express server, session config, auth endpoints
│   ├── db.ts                        # Drizzle database connection
│   ├── routes/
│   │   ├── sheets.ts                # Google Sheets data endpoints (construction, budget, deals)
│   │   └── timeline.ts              # Timeline CRUD endpoints (tasks, events, categories, event types)
│   └── services/
│       └── googleSheets.ts          # Google Sheets API service
├── shared/
│   └── schema.ts                    # Drizzle ORM schema (DB tables + Zod validators)
└── drizzle.config.ts                # Drizzle Kit configuration
```

## Pages & Features

### 1. Overview (`/`)
- Executive dashboard pulling data from all sources
- KPI stat cards: Construction %, Total Budget, Timeline Tasks, Cost Per Room
- Floor progress bar chart + Budget category pie chart
- Tasks needing attention (lowest completion construction tasks)
- Timeline activity (active + upcoming events)
- Budget status summary with progress bar
- Construction completion breakdown (bathroom/bedroom/overall)
- Quick navigation cards to all pages

### 2. Construction Progress (`/construction`)
- Room-by-room progress tracking from Google Sheets
- Bathroom tasks: Demo, Electrical, Waterproofing, Sheetrock, Tile %, etc.
- Bedroom tasks: Electric Wiring, HVAC, Plastering, Sanding, Paint, Flooring, etc.
- Floor-level aggregation and completion percentages
- Task detail modal (click any task to see per-room status)
- Room detail modal (click any room to see all task statuses)

### 3. Budget (`/budget`)
- Budget line items from Google Sheets
- Totals: Total Budget, Hard Costs, Soft Costs, Contingency, Paid Thus Far, Cost Per Room
- Category breakdown chart
- Vendor breakdown chart (column: "Vendors" in Google Sheet)
- Status breakdown (Contract, Realistic, Rough estimates)
- Filterable/sortable budget table

### 4. Timeline (`/timeline`)
- Interactive Gantt chart stored in PostgreSQL
- **Tasks**: CRUD with category grouping and sort ordering
- **Events**: Multi-week bar rendering, color-coded, labeled
- **Categories**: Collapsible groups with rename (pencil icon) and delete (trash icon) on hover
- **Custom Event Types**: Full CRUD — create, rename, recolor, delete from EventModal
- Import from Google Sheets
- Event type chart showing distribution

### 5. Deal Intelligence (`/deals`)
- Password-protected (separate `DEALS_PASSWORD` env var, server-side auth)
- Deal records from Google Sheets
- Supports `DEALS_MOCK_MODE=true` for demo data
- Deal analysis dashboard with key metrics

## Authentication
- **Global Password Gate**: `PASSWORD_GATE` env var protects entire app
- **Deals Page**: Additional `DEALS_PASSWORD` env var for Deal Intelligence access
- **Session-based**: express-session with `authenticated` and `dealsAuthenticated` flags
- **No individual user accounts** — app is team-shared with password protection
- Settings button and profile avatar have been removed from UI (not needed)

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

### Health & Auth
- `GET /api/health` — Health check, reports sheetsConfigured status
- `POST /api/auth/deals-login` — Validates deals password against `DEALS_PASSWORD` env var
- `GET /api/auth/deals-check` — Checks if session has deals auth

### Google Sheets (`/api/sheets/`)
- `GET /api/sheets/construction` — Construction Oversight data
- `GET /api/sheets/construction-progress` — Rooms Progress sheet (parsed)
- `GET /api/sheets/budget` — Budget data (parsed with totals, breakdowns)
- `GET /api/sheets/deals` — Deal Intelligence data (supports `DEALS_MOCK_MODE`)
- `GET /api/sheets/sheet/:id` — Generic sheet data
- `GET /api/sheets/info/:id` — Spreadsheet metadata

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

## Environment Variables (Replit Secrets)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `PASSWORD_GATE` | Global app password |
| `DEALS_PASSWORD` | Deals page password |
| `DEALS_MOCK_MODE` | Set to `true` for mock deal data |
| `CONSTRUCTION_SHEET_ID` | Google Sheet ID for construction data |
| `TIMELINE_SHEET_ID` | Google Sheet ID for timeline import |
| `DEALS_SHEET_ID` | Google Sheet ID for deals data |
| `GOOGLE_CREDENTIALS` | Google service account JSON |

## Key Design Decisions
- **Google Sheets as data source** for construction, budget, and deals — enables non-technical team members to update data
- **PostgreSQL for timeline** — requires CRUD operations not suited for Sheets
- **No individual sign-ins** — password-only auth model for team access
- **Dark theme** — consistent dark UI across all pages using Tailwind + CSS custom properties
- **React Query** — automatic caching, refetching, and loading states for all data
- **Recharts** — consistent chart styling matching dark design system
