# Popup — Ice Cream & Desserts Order System

Mobile-first web app for a home pop-up ice cream and desserts business.
Customers order ahead by time slot; admin manages events, menus, and pickups.

## Stack

- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic (Railway/Render)
- **Frontend:** React + Vite + Tailwind CSS, Hebrew RTL (Vercel)
- **Local dev:** Docker Compose

## Local Setup

### Prerequisites

- Docker + Docker Compose
- Node.js 18+

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env — set a real ADMIN_PASSWORD
```

### 2. Start backend + database

```bash
docker-compose up -d
```

This runs migrations automatically (`alembic upgrade head`) and starts the FastAPI server on `http://localhost:8002`.

> **Cold-start warm-up (Railway):** Before opening the event to customers, send one warm-up request:
> `curl https://your-railway-url.railway.app/health`

### 3. Start frontend (dev mode)

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if needed (VITE_API_URL defaults to http://localhost:8002)
npm install
npm run dev
```

Customer UI: `http://localhost:5173`  
Admin panel: `http://localhost:5173/admin`

### Health check

```bash
curl http://localhost:8002/health
# → {"status":"ok"}
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `ADMIN_PASSWORD` | backend | Password for all `/admin/*` endpoints |
| `CORS_ORIGINS` | backend | Comma-separated allowed CORS origins |
| `VITE_API_URL` | frontend | Backend base URL |

## Deployment

### Backend — Railway

1. Create a Railway project, add a PostgreSQL plugin.
2. Set env vars: `DATABASE_URL` (from Railway plugin), `ADMIN_PASSWORD`, `CORS_ORIGINS`.
3. Deploy from GitHub. Railway runs `gunicorn` via `Dockerfile`.
4. Configure Railway's start command to run migrations before the server:
   `sh -c "alembic upgrade head && gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"`
   (When using Docker Compose locally, the `command:` override in `docker-compose.yml` does this automatically.)

### Frontend — Vercel

1. Connect GitHub repo to Vercel.
2. Set `VITE_API_URL` to your Railway backend URL.
3. Vercel uses `frontend/vercel.json` (Vite framework, SPA rewrite).

## Admin Workflow

1. Log in at `/admin` with `ADMIN_PASSWORD`.
2. Create a draft event (title, date, start/end time, slot duration, max ice cream per slot).
3. Add products to the global catalog if needed.
4. Add menu items to the event (select product, set price + quantity).
5. Click **פרסם אירוע** — slots are generated automatically.
6. Share the customer URL with customers.
7. Monitor the slot grid; confirm pickups with **אשר איסוף**.
8. Click **סגור אירוע** when done.

## Key Design Notes

- Slot capacity counts **total ice cream portions** (sum of quantities), not number of orders.
- Products have three ice cream modes: `none`, `included`, `optional`.
- Slot assignment is only required when at least one ordered item counts as ice cream. Orders with no ice cream items have `slot_id = null` and do not appear in the slot grid.
- `slot_duration_min`, `date`, `start_time`, `end_time` are locked once any non-cancelled order exists.
- Admin password is read from `ADMIN_PASSWORD` env var only — never hardcoded.
- Product images stored at `backend/static/uploads/` (ephemeral on Railway without a volume; re-upload after redeploy).
