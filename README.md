# Aurelia — Hotel CRM

A production-ready full-stack Hotel Management CRM for Aurelia, an 11-room heritage stay & coffee house in Pondicherry, India.

Implements the full design from the Anthropic Claude Design handoff bundle: dashboard, rooms, bookings, coffee shop POS, mini hall events, expenses, guests CRM, invoices, reports, and settings — plus a premium public-facing booking page.

## Stack

- **Frontend** — Vite + React 18, no UI library (custom design system, hand-rolled SVG charts, dark/light theme, sidebar variants, font pairings)
- **Backend** — Node.js + Express + better-sqlite3 (SQLite, file-based, zero-config)
- **Auth** — JWT + scrypt password hashing
- **Validation** — Zod
- **Security** — Helmet, CORS allowlist, compression
- **Two entry points** — `/` (CRM dashboard) and `/booking.html` (public reservation page)

## Quick start

```bash
# 1. Install
npm install --workspaces --include-workspace-root

# 2. Configure backend env
cp backend/.env.example backend/.env
# (edit ADMIN_PASSWORD and JWT_SECRET before running in production)

# 3. Run dev servers (frontend + backend in parallel)
npm run dev
```

- Frontend: http://localhost:5180
- Backend API: http://localhost:4000/api
- Default login: `concierge@aurelia.in` / value of `ADMIN_PASSWORD` in `.env` (defaults to `admin12345` if unset)

The backend auto-seeds the SQLite database on first run with the full set of demo data (rooms, bookings, menu, expenses, invoices, guests, etc.).

## Production build

```bash
# Build frontend bundles (index.html + booking.html)
npm run build

# Set production env vars
export NODE_ENV=production
export JWT_SECRET="<long-random-string>"
export CORS_ORIGIN="https://your-domain.com"
export ADMIN_PASSWORD="<strong-password>"

# Start (Express serves the frontend dist/ + the API)
npm run start
```

The backend serves the built frontend automatically when `NODE_ENV=production` and `frontend/dist` exists, on a single port.

## Docker

```bash
docker build -t aurelia-crm .
docker run -p 4000:4000 -e JWT_SECRET=$(openssl rand -hex 32) -v aurelia-data:/app/backend/data aurelia-crm
```

The SQLite database is stored at `/app/backend/data/aurelia.db`. Mount a volume to persist it between restarts.

## Project layout

```
hotel_crm/
├── backend/
│   ├── src/
│   │   ├── index.js            # Express app entry
│   │   ├── db.js               # SQLite connection + schema
│   │   ├── seed.js             # Initial data + admin user
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verify + requireAuth
│   │   │   └── error.js        # Centralised error handler
│   │   └── routes/
│   │       ├── auth.js         # POST /api/auth/login, GET /api/auth/me
│   │       ├── rooms.js        # GET /api/rooms, PATCH /api/rooms/:num
│   │       ├── bookings.js     # CRUD /api/bookings
│   │       ├── guests.js       # CRUD /api/guests
│   │       ├── coffee.js       # /api/coffee/menu, /api/coffee/orders
│   │       ├── hall.js         # /api/hall
│   │       ├── expenses.js     # /api/expenses
│   │       ├── invoices.js     # /api/invoices
│   │       ├── settings.js     # /api/settings/profile, /tax
│   │       ├── reports.js      # /api/reports/summary (charts)
│   │       └── public.js       # /api/public/* (booking page)
│   └── data/aurelia.db         # SQLite (auto-created)
├── frontend/
│   ├── index.html              # CRM entry
│   ├── booking.html            # Public site entry
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx            # CRM root
│       ├── booking.jsx         # Public site root
│       ├── App.jsx
│       ├── api.js              # Typed fetch client
│       ├── styles/             # theme.css, booking.css
│       ├── components/         # Icon, Sidebar, Topbar, primitives, charts, TweaksPanel
│       └── pages/              # Dashboard, Rooms, Bookings, Coffee, Hall, Expenses, CRM, Reports, Invoices, Settings, Login
├── package.json                # workspaces root
└── Dockerfile
```

## API surface (REST)

| Endpoint | Methods | Notes |
| --- | --- | --- |
| `/api/health` | GET | health check |
| `/api/auth/login` | POST | `{ email, password }` → `{ token, user }` |
| `/api/auth/me` | GET | requires Bearer token |
| `/api/rooms` | GET, PATCH `/:num` | rooms + types |
| `/api/bookings` | GET, POST, PATCH `/:id`, DELETE `/:id` | |
| `/api/guests` | GET (search), POST, PATCH `/:id` | |
| `/api/coffee/menu` | GET | café menu |
| `/api/coffee/orders` | GET, POST | POS orders |
| `/api/hall` | GET, POST, PATCH `/:id` | hall reservations |
| `/api/expenses` | GET, POST | |
| `/api/invoices` | GET, POST | |
| `/api/settings/profile` | GET, PUT | |
| `/api/settings/tax` | GET, PUT | |
| `/api/reports/summary` | GET | aggregated dashboard data |
| `/api/public/rooms` | GET | for the booking page |
| `/api/public/profile` | GET | |
| `/api/public/enquiries` | POST | guest reservation enquiry |

## Tweaks (in-app)

The CRM ships with a Tweaks panel (⌘. or click the gear FAB) for runtime customisation:

- **Sidebar style** — Wide / Icon-only / Floating
- **Font pairing** — Fraunces × Geist, Instrument × Inter, Geist × Geist, Fraunces × Inter
- **Theme** — Dark / Light

Preferences persist in localStorage.

## Production checklist

Before going live:

- [ ] Set a strong `JWT_SECRET` (at least 32 random bytes)
- [ ] Set a strong `ADMIN_PASSWORD` and re-run `npm run seed --workspace=backend -- --force` (or change the admin password manually)
- [ ] Set `CORS_ORIGIN` to your real domain
- [ ] Put behind a reverse proxy (nginx / Caddy) with TLS
- [ ] Mount `backend/data/` as a persistent volume
- [ ] Schedule SQLite backups (`sqlite3 aurelia.db ".backup snapshot.db"`)
- [ ] Configure log rotation for the morgan access log
- [ ] Replace stock images / Unsplash URLs in seed data with your own assets
