# CLAUDE.md — Popup Order Management System

## Project Overview

Full-stack order management system for a home pop-up ice cream and desserts business.
Customers order ahead by time slot; system enforces ice cream machine capacity.

**Stack:** FastAPI (Python 3.11) + PostgreSQL + SQLAlchemy + Alembic | React + Vite + Tailwind CSS | Docker Compose

## Directory Layout

```
backend/
  app/
    main.py           # FastAPI app, CORS, static files, logging
    auth.py           # Bearer token admin middleware
    database.py       # SQLAlchemy engine + get_db()
    queries.py        # Shared DB helpers: booked_portions, item_booked, effective_max_ice_cream, ice_cream_count_for_item
    schemas.py        # Pydantic request/response models
    models/
      models.py       # SQLAlchemy ORM models + 3 enum types
    routers/
      public.py       # GET /events/upcoming, POST /orders
      admin.py        # All /admin/* endpoints
  alembic/            # DB migrations (0001 initial, 0002 add event description)
  Dockerfile
  requirements.txt
  static/uploads/     # Product images (served at /static/uploads/)

frontend/
  src/
    api/
      client.ts       # All API calls; handles 401 → redirect to password gate
      types.ts        # TypeScript interfaces matching backend schemas
    components/
      customer/       # CustomerApp, EventPage, ItemList, SlotPicker, OrderForm, Confirmation
      admin/          # AdminApp, PasswordGate, EventList, EventDetail, SlotGrid, ProductList
    utils/
      format.ts       # formatTime (Asia/Jerusalem tz), formatDate, formatTimeRange
      eventStatus.ts  # STATUS_LABELS, STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS
      cart.ts         # cartItemQuantity, itemLineTotal, cartTotal, cartIceCreamPortions, needsSlotForCart
    App.tsx           # Routes: /admin → AdminApp, else → CustomerApp
    main.tsx
    index.css         # Design system: chocolate/caramel/gold/cream/parchment, Secular One + Rubik fonts
  index.html          # lang="he" dir="rtl"
  vercel.json         # Vercel deployment (SPA rewrite)

.claude/
  commands/
    qa.md             # /qa slash command — full QA pass (health, API, Playwright flows, edge cases)

tests/e2e/            # Playwright tests
playwright.config.ts

docker-compose.yml    # backend + PostgreSQL (backend built via Dockerfile — rebuild after Python changes)
.env.example          # Required env vars template
README.md             # Local setup + deployment guide
```

## Load-Bearing Assumptions

- **ASM-1:** Small scale (tens of orders/event). Railway free tier sufficient. No connection pooling tuning.
- **ASM-2:** Single admin user. One `ADMIN_PASSWORD`. No role system.
- **ASM-3:** No post-session order lookup. Customer sees confirmation screen only.
- **ASM-4:** No auto-close. Admin manually completes the event.
- **ASM-5:** No waitlist. Full slot = disabled in UI.
- **ASM-6:** Images on backend filesystem at `static/uploads/`. Ephemeral on Railway (acceptable for launch).
- **ASM-7:** Product deletion allowed when no `event_menu_items` reference the product (409 if referenced). Retire by removing from future events; deletion is a cleanup-only operation.
- **ASM-8:** `ice_cream_mode` change on a product is allowed even with existing confirmed orders.
- **ASM-9:** Partial submission failure (network drops mid-response) is acceptable — admin handles it at event.

## Key Business Rules

### Ice Cream Mode (3-mode enum on `products`)
- `none` — no machine time, no slot required (cookies, pecan pie)
- `included` — always ice cream (standalone scoop, affogato) → slot required, counts 1× per quantity
- `optional` — customer may add ice cream per portion via a two-step UI: main stepper controls total quantity, a sub-stepper transfers portions between "with ice cream" and "without". Slot + count only for the with-ice-cream portions.

### CartItem Shape (`types.ts`)
```ts
interface CartItem {
  menuItem: MenuItemPublic;
  quantityWithIceCream: number;      // portions that count against slot capacity
  quantityWithoutIceCream: number;   // portions that don't
}
```
`cartItemQuantity = quantityWithIceCream + quantityWithoutIceCream`. Price = `price * total + ice_cream_addon_price * quantityWithIceCream`. Order submission splits one CartItem into two `OrderItemIn` rows when both counts are non-zero.

### Slot Capacity (atomic, SELECT FOR UPDATE)
```
booked = SUM(oi.quantity) WHERE oi.used_ice_cream=true AND status!=cancelled
effective_max = slot.max_ice_cream ?? event.max_ice_cream_per_slot
```
`order_items.used_ice_cream` is a boolean snapshot set at order creation time. Slot picker pre-checks: `slot.booked_portions + cartIceCreamPortions(cart) > slot.max_ice_cream_effective` → slot shown as full. Capacity queries aggregate by `event_menu_item_id` to handle split rows from the same item.

### Capacity Enforcement
- `POST /orders`: SELECT FOR UPDATE on slot + each event_menu_item in one transaction
- `PATCH /admin/slots/{id}`: blocks `max_ice_cream` < current booked with 409 + `current_booked`
- `PATCH /admin/events/{id}`: blocks `date/start_time/end_time/slot_duration_min` when `status != draft` (UI guard hides those fields; backend is authoritative)
- Frontend hides date/time/slot_duration inputs when `event.status !== "draft"`

### Slot Generation
Generated on `POST /admin/events/{id}/publish` (draft → published). Algorithm:
- `start_dt` to `end_dt` in steps of `slot_duration_min`
- Rejects if `total_minutes % slot_duration_min != 0` (returns 409)
- Each slot starts with `max_ice_cream = NULL` (inherits event default)

### Order Lifecycle
- Created immediately as `confirmed`
- Admin can mark `picked_up` (irreversible — dialog required)
- Admin can `cancel` confirmed orders only (`picked_up → cancelled` is blocked)
  — cancellation releases capacity (capacity query excludes cancelled orders)

### Event Description
`events.description` (Text, nullable) — shown to customers in a collapsible card between the header and menu. Editable by admin at any status. Added in migration 0002.

### Event Deletion
`DELETE /admin/events/{id}` — available for **all** statuses. Cascade order:
1. All `orders` deleted manually (SQLAlchemy cascades to `order_items`)
2. `db.flush()` — clears `order_items` FK refs before menu items are deleted
3. Event deleted — cascades to `slots` and `menu_items` via ORM relationship

### Price Snapshot
`unit_price` stored at order creation = `event_menu_items.price + ice_cream_addon_price` (if with_ice_cream=true). Never recalculated.

## Admin Auth
All `/admin/*` routes require `Authorization: Bearer {ADMIN_PASSWORD}`.
Password is `os.environ["ADMIN_PASSWORD"]` — never hardcoded.
Frontend stores password in `localStorage` and clears it on 401.

## UI Language
All user-facing text is in **Hebrew (RTL)**. `lang="he"` `dir="rtl"` on `<html>`.

## Running Locally
```bash
docker-compose up -d        # starts backend + PostgreSQL (runs migrations)
curl http://localhost:8002/health  # verify
cd frontend && npm install && npm run dev  # customer + admin UI
```

## Running E2E Tests
```bash
# Requires running frontend (npm run dev) and backend (docker-compose up)
npx playwright test
```

## After Python/backend changes
The backend runs inside Docker and code is COPY-ed into the image — file edits on the host are NOT picked up automatically.
```bash
docker-compose build backend && docker-compose up -d backend
```

## QA Skill
`.claude/commands/qa.md` defines a `/qa` slash command. Start a new Claude Code session in this directory and type `/qa` to run a full QA pass (health checks, API sanity, Playwright customer + admin flows, edge cases, summary report).
