# CLAUDE.md — Popup Order Management System

## Project Overview

Full-stack order management system for a home pop-up ice cream and desserts business.
Customers order ahead by time slot; system enforces ice cream machine capacity.

**Stack:** FastAPI (Python 3.11) + PostgreSQL + SQLAlchemy + Alembic | React + Vite + Tailwind CSS

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
      public.py       # GET /events/upcoming, POST /orders, GET /events/{id}/survey, POST /events/{id}/vote
      admin.py        # All /admin/* endpoints
  alembic/            # DB migrations (0001 initial … 0007 product defaults)
  Dockerfile
  requirements.txt
  static/uploads/     # Product + about images (served at /static/uploads/, persisted via Docker named volume)

frontend/
  src/
    api/
      client.ts       # All API calls; handles 401 → redirect to password gate
      types.ts        # TypeScript interfaces matching backend schemas
    components/
      customer/       # CustomerApp, EventPage, ItemList, SlotPicker, OrderForm, Confirmation, AboutPage, SurveyPage
      admin/          # AdminApp, PasswordGate, EventList, EventDetail, SlotGrid, ProductList, AboutEditor
    utils/
      format.ts       # formatTime (Asia/Jerusalem tz), formatDate, formatTimeRange
      eventStatus.ts  # STATUS_LABELS, STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS
      cart.ts         # cartItemQuantity, itemLineTotal, cartTotal, cartIceCreamPortions, needsSlotForCart
    App.tsx           # Routes: /admin → AdminApp, /about → AboutPage, /survey/:id → SurveyPage, else → CustomerApp
    main.tsx
    index.css         # Design system: chocolate/caramel/gold/cream/parchment, Secular One + Rubik fonts
  index.html          # lang="he" dir="rtl"
  vercel.json         # Vercel deployment (SPA rewrite)

.claude/
  commands/
    qa.md             # /qa slash command — full QA pass (health, API, Playwright flows, edge cases)

tests/e2e/            # Playwright tests
playwright.config.ts

deploy.sh / deploy.ps1  # Deploy backend to production server (SSH + git pull + docker compose)
.env.example            # Required env vars template
README.md             # Local setup + deployment guide
```

## Load-Bearing Assumptions

- **ASM-1:** Small scale (tens of orders/event). Railway free tier sufficient. No connection pooling tuning.
- **ASM-2:** Single admin user. One `ADMIN_PASSWORD`. No role system.
- **ASM-3:** No post-session order lookup. Customer sees confirmation screen only.
- **ASM-4:** No auto-close. Admin manually completes the event.
- **ASM-5:** No waitlist. Full slot = disabled in UI.
- **ASM-6:** Images on backend filesystem at `static/uploads/`, mounted as a Docker named volume (`uploads`) so they survive rebuilds. Image URLs include a `?v=<timestamp>` cache-buster appended on every upload.
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
- Admin can hard-delete an order (`DELETE /admin/orders/{id}`) — removes from DB entirely, capacity freed immediately
- Admin can edit an order: change item quantities (`PATCH /admin/order-items/{id}`) or remove individual items (`DELETE /admin/order-items/{id}`). Removing the last item auto-deletes the order. Removing the last ice cream item clears `slot_id` (order moves to slotless section).
- Legacy cancel (`POST /admin/orders/{id}/cancel`) still exists for the slotless-orders panel in the slots tab.

### Event Description
`events.description` (Text, nullable) — shown to customers in full (no expand/collapse) in a styled card between the header and menu. Splits on `\n` or `<br>` for line breaks. Editable by admin at any status. Added in migration 0002.

### Event Deletion
`DELETE /admin/events/{id}` — available for **all** statuses. Cascade order:
1. All `orders` deleted manually (SQLAlchemy cascades to `order_items`)
2. `db.flush()` — clears `order_items` FK refs before menu items are deleted
3. Event deleted — cascades to `slots` and `menu_items` via ORM relationship

### Menu Item Sort Order
`event_menu_items.sort_order` (Integer, default 0, migration 0005) — admin can drag-and-drop rows in the menu tab to reorder. Saved via `PUT /admin/events/{id}/menu/reorder` with an ordered list of item IDs. Both admin list and customer-facing menu query order by `sort_order`. New items appended at `max(sort_order) + 1`.

### About Page
Singleton table `about_page` (id=1, migration 0004). Fields: `bio_text` (Text, nullable), `image_url` (String, nullable).
- Public: `GET /about` → `AboutPage.tsx` (`/about` route) — full-width hero image at natural aspect ratio + enlarged bio text.
- Admin: `GET/PATCH /admin/about`, `POST /admin/about/image` → `AboutEditor.tsx` (third tab "אודות" in AdminApp).
- Event page header shows a "קצת עלי ›" pill link when `bio_text` is set.
- "יצירת קשר" WhatsApp link (`wa.me/972509230882`) appears in the event header and on the confirmation screen.

### SlotGrid Capacity Display
`SlotGrid` uses a thin progress bar + `booked/max` fraction instead of coloured squares — scales to any capacity. Accepts a `refreshKey` prop; `EventDetail` increments it after any order edit/delete so the slot view stays in sync without a page reload. The slot order list only shows items where `used_ice_cream=true`.

### Price Snapshot
`unit_price` stored at order creation = `event_menu_items.price + ice_cream_addon_price` (if with_ice_cream=true). Never recalculated.

### Admin Orders Tab
`EventDetail` has three tabs: **תפריט**, **סלוטים**, **הזמנות**.
- **הזמנות** tab has two sub-views toggled by buttons:
  - **לפי הזמנה** — sequential numbered list; confirmed orders show "עריכה" (inline qty/remove edit) and "מחק" (hard delete).
  - **לפי מוצר** — per-menu-item remaining/available badge + buyer list aggregated from non-cancelled orders.

### Survey Stage (optional, migration 0006–0007)

The survey is an **optional** step between `draft` and `published`. The full lifecycle is:

- **Without survey:** `draft → published → completed`
- **With survey:** `draft → survey → published → completed`

#### Activating a survey
Admin clicks "פתח סקר" on a draft event and configures:
- `survey_ends_at` — deadline (DateTime, must be in the future)
- `menu_size` — how many products the survey selects (does **not** include fixed products)
- `fixed_product_ids` — products guaranteed in the menu regardless of votes; excluded from the voting UI

Event moves to `survey` status. A share link for voters: `/survey/{event_id}`.

#### Voting (public, no auth)
`GET /events/{id}/survey` — returns event info + all products excluding fixed ones.
`POST /events/{id}/vote` — `{ voter_name, browser_token, product_ids[] }`. Voter can choose up to `menu_size` products. Re-voting from the same `browser_token` replaces previous votes. `browser_token` is a UUID stored in `localStorage` per event (soft deduplication, trust-based). `SurveyPage.tsx` marks voted state in `localStorage` so the UI shows a confirmation on return.

#### Finalizing
Admin clicks "סיים סקר ופרסם". `POST /admin/events/{id}/finalize_survey` (no body):
1. Loads fixed products + top-voted products (up to `menu_size`, excluding fixed)
2. Creates `event_menu_items` using each product's `default_price` and `default_quantity` (fallback: price=0, qty=10)
3. Generates slots (same algorithm as normal publish)
4. Sets status = `published`

After publishing, admin can edit prices/quantities via the normal menu tab.

#### Product defaults (migration 0007)
`products.default_quantity` (Integer, nullable) and `products.default_price` (Numeric, nullable) — set per product in ProductList. Used only when finalizing a survey. Shown as hints in the product list UI.

#### DB tables
- `survey_votes`: `id, event_id, voter_name, browser_token, product_id, created_at`. Unique on `(event_id, browser_token, product_id)`.
- `survey_fixed_products`: `id, event_id, product_id`. Unique on `(event_id, product_id)`. Cascade-deleted with event.

#### Admin survey results
`GET /admin/events/{id}/survey/results` — vote counts per product, total unique voters, which are fixed. Shown live in `EventDetail` while status = `survey` with a refresh button.

## Admin Auth
All `/admin/*` routes require `Authorization: Bearer {ADMIN_PASSWORD}`.
Password is `os.environ["ADMIN_PASSWORD"]` — never hardcoded.
Frontend stores password in `localStorage` and clears it on 401.

## UI Language
All user-facing text is in **Hebrew (RTL)**. `lang="he"` `dir="rtl"` on `<html>`.

## Running Frontend Locally
```bash
cd frontend && npm install && npm run dev
```

## Deployment

### Frontend
Deployed automatically via Vercel on every push to `main`. No manual step needed.

### Backend
Backend runs on `root@178.105.141.67` at `/app/Popup`. Deploy with either script:

```bash
# From Linux/Mac/Git Bash:
./deploy.sh

# From PowerShell:
./deploy.ps1
```

Both scripts: SSH to server → `git pull` → `docker compose up -d --build backend` → health check at `https://api.yossiscookies.store/health`.

After any Python/backend change: commit + push, then run the deploy script.

## Running E2E Tests
```bash
# Requires running frontend (npm run dev) and a reachable backend
npx playwright test
```

## QA Skill
`.claude/commands/qa.md` defines a `/qa` slash command. Start a new Claude Code session in this directory and type `/qa` to run a full QA pass (health checks, API sanity, Playwright customer + admin flows, edge cases, summary report).
