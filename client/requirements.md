## AYA Intelligence Platform - Client Requirements

### Pages
1. **Overview** (`/`) — Executive dashboard with KPIs from all data sources
2. **Construction Progress** (`/construction`) — Room-by-room tracking from Google Sheets
3. **Budget** (`/budget`) — Line items, vendor spend, category breakdowns from Google Sheets
4. **Timeline** (`/timeline`) — Interactive Gantt chart with full CRUD (PostgreSQL-backed)
5. **Deal Intelligence** (`/deals`) — Password-protected deal analysis from Google Sheets

### Design
- Dark theme throughout (Tailwind CSS + shadcn/ui)
- Responsive: mobile sidebar sheet, desktop fixed sidebar
- Consistent chart styling via Recharts

### Auth
- Global `PASSWORD_GATE` for app access
- Separate `DEALS_PASSWORD` for Deal Intelligence page
- No individual user accounts

### Packages
- React 18, TypeScript, Vite
- TanStack Query (React Query)
- Wouter (routing)
- Recharts (charts)
- Lucide React (icons)
- shadcn/ui + Radix UI + Tailwind CSS

### Notes
- See `PROJECT_CONTEXT.md` at project root for full architecture documentation
- See `CHANGELOG.md` at project root for change history
