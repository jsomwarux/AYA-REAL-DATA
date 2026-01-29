# AYA - Construction Progress Dashboard

## Overview
AYA is a full-stack web application for tracking construction/renovation progress of a hotel/building project. It provides multiple dashboard views pulling data from Google Sheets and a local PostgreSQL database, offering real-time analytics, budget tracking, deal management, and project timeline visualization.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: `wouter`
- **Data Fetching**: TanStack React Query
- **UI Components**: Shadcn/UI (Radix UI primitives)
- **Charts**: Recharts (BarChart, PieChart, ResponsiveContainer)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (dark theme)

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **External API**: Google Sheets API (googleapis)
- **Schema Migrations**: `drizzle-kit push`
- **Validation**: Zod (via drizzle-zod)

## Project Structure

```
AYA-REAL-DATA/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Overview.tsx              # Main dashboard overview
│       │   ├── ConstructionProgress.tsx   # Construction tracking page
│       │   ├── Budget.tsx                 # Budget tracking page
│       │   ├── Timeline.tsx              # Gantt/timeline page (~900 lines)
│       │   ├── Deals.tsx                 # Deal management page
│       │   ├── Settings.tsx              # App settings page
│       │   └── not-found.tsx             # 404 page
│       ├── components/
│       │   ├── dashboard/
│       │   │   ├── DashboardLayout.tsx   # Shared layout wrapper
│       │   │   ├── Sidebar.tsx           # Navigation sidebar
│       │   │   └── StatCard.tsx          # Reusable stat card component
│       │   ├── timeline/
│       │   │   ├── TimelineChart.tsx     # Gantt-style calendar grid
│       │   │   ├── EventModal.tsx        # Add/edit event dialog
│       │   │   └── TaskModal.tsx         # Add/edit task dialog
│       │   └── ui/                       # Shadcn/UI components
│       ├── hooks/
│       │   ├── use-document-title.ts
│       │   └── use-toast.ts
│       ├── lib/
│       │   ├── api.ts                    # API functions and TypeScript types
│       │   ├── queryClient.ts            # React Query client config
│       │   └── utils.ts                  # Utility functions (cn, etc.)
│       └── App.tsx                       # Router setup
├── server/
│   ├── index.ts                          # Express server entry point
│   ├── db.ts                             # Database connection
│   ├── routes/
│   │   └── timeline.ts                   # Timeline CRUD + Google Sheet import
│   └── services/
│       └── googleSheets.ts               # Google Sheets API service
├── shared/
│   └── schema.ts                         # Drizzle ORM schema definitions
└── drizzle.config.ts                     # Drizzle migration config
```

## Database Schema (shared/schema.ts)

### Tables
1. **messages** - Simple message storage (id, content)
2. **sheet_rows** - Tracks when Google Sheet rows were first seen (id, sheet_type, row_identifier, first_seen_at)
3. **timeline_tasks** - Project tasks for the Gantt view (id, category, task, sortOrder, createdAt, updatedAt)
4. **timeline_events** - Milestones/phases per task (id, taskId, startDate, endDate, label, color, createdAt)

### Key Design Decisions
- Timeline data is stored locally in PostgreSQL (not read-only from Sheets) to allow direct editing
- Events support multi-week spans via `startDate` and `endDate` columns
- Tasks are organized by category with a `sortOrder` field
- Events are indexed by taskId, startDate, and endDate for efficient querying

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Overview | Main dashboard with summary stats |
| `/construction` | ConstructionProgress | Construction tracking from Google Sheets |
| `/budget` | Budget | Budget tracking and analysis |
| `/timeline` | Timeline | Gantt-style project timeline (local DB) |
| `/deals` | Deals | Deal pipeline management |
| `/settings` | Settings | Application settings |

## Timeline Page (Key Feature)

### Data Flow
1. **Import**: Google Sheet ("Summary - High Level" tab) is parsed via `POST /api/timeline/import`
2. **Storage**: Tasks and events stored in PostgreSQL
3. **Display**: Gantt-style calendar grid with analytics dashboard
4. **Editing**: Full CRUD via modals (EventModal, TaskModal)
5. **Re-import**: Manual button to refresh from Sheet (deletes and re-imports all data)

### API Endpoints
- `GET /api/timeline` - Fetch all tasks, events, categories, weekDates
- `POST /api/timeline/import` - Import from Google Sheet
- `POST /api/timeline/tasks` - Create task
- `PUT /api/timeline/tasks/:id` - Update task
- `DELETE /api/timeline/tasks/:id` - Delete task + cascade events
- `POST /api/timeline/events` - Create event
- `PUT /api/timeline/events/:id` - Update event
- `DELETE /api/timeline/events/:id` - Delete event

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

## Environment Variables
- `TIMELINE_SHEET_ID` - Google Spreadsheet ID for timeline data import
- Google Sheets API credentials (service account)
- PostgreSQL connection string

## Key Patterns
- **React Query** for all data fetching with staleTime caching
- **useMemo** for computed analytics to avoid re-calculation on every render
- **Optimistic UI** patterns for CRUD operations
- **Dark theme** throughout with Tailwind's white/opacity utilities
- **Toast notifications** for success/error feedback (toastSuccess, toastError)
- **Collapsible categories** in the timeline grid view
- **Expandable milestone cards** that show full task details on click
