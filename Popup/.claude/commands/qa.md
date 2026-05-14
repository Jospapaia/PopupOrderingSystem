You are a QA engineer performing a full manual + automated test pass on the Popup ice cream ordering system.
The system has two interfaces running locally:
- **Customer**: http://localhost:5173
- **Admin**: http://localhost:5173/admin
- **Backend API**: http://localhost:8002

Work through every phase below in order. For each check, print a clear ✅ PASS or ❌ FAIL line with a one-sentence reason. At the end, print a summary table.

---

## Phase 1 — Service Health

Run these checks and verify the responses:

```bash
rtk curl http://localhost:8002/health
```
Expected: `{"status":"ok"}`

```bash
rtk curl http://localhost:5173 -s -o /dev/null -w "%{http_code}"
```
Expected: `200`

If either service is down, stop here and report which one is missing.

---

## Phase 2 — API Sanity (Customer)

Fetch the upcoming event and verify the payload:

```bash
rtk curl http://localhost:8002/events/upcoming
```

Check:
- `event` is not null (a published event exists)
- `event.title` is a non-empty string
- `event.description` field is present in the response (even if null — the field must exist)
- `event.menu_items` is a non-empty array
- Each menu item has: `id`, `product_name`, `price`, `ice_cream_mode`, `remaining_quantity`
- Items with `ice_cream_mode: "optional"` have a non-null `ice_cream_addon_price`
- `event.slots` is present (may be empty for draft events)

---

## Phase 3 — API Sanity (Admin)

Get the admin password from the environment or `.env` file in `C:\Projects\Popup`:

```bash
cat C:\Projects\Popup\.env 2>/dev/null || cat C:\Projects\Popup\.env.local 2>/dev/null
```

Then run (replace `PASSWORD` with the actual value):

```bash
rtk curl -H "Authorization: Bearer PASSWORD" http://localhost:8002/admin/events
```

Check:
- Returns a JSON array
- Each event has `id`, `title`, `status`, `date`, `description` field present

Test that a bad password returns 401:
```bash
rtk curl -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrongpassword" http://localhost:8002/admin/events
```
Expected: `401`

---

## Phase 4 — Screenshot Captures (Visual Verification)

Take full-page screenshots and read them visually to check layout and content.

```bash
npx playwright screenshot --browser chromium --full-page http://localhost:5173 tests/screenshots/qa-customer-home.png 2>&1
```

Read the screenshot with the Read tool and verify:
- The chocolate header is visible with the event title
- The description box appears (with ornamental ✦ dividers and a white card) if a description is set
- Menu items are listed below the description

If the screenshots directory does not exist, create it first:
```bash
mkdir -p tests/screenshots
```

Then take the admin screenshot (you'll need to check the admin password gate):
```bash
npx playwright screenshot --browser chromium --full-page http://localhost:5173/admin tests/screenshots/qa-admin-login.png 2>&1
```

Read it and verify the login screen shows the chocolate-themed password gate.

---

## Phase 5 — Automated E2E Tests

Run the full Playwright suite in headless mode and capture results:

```bash
rtk playwright test --reporter=list 2>&1
```

For each failing test, note the test name and error message. Do not re-run — just report what failed.

If you want to watch the tests run visually, run with `--headed`:
```bash
npx playwright test --headed --reporter=list 2>&1
```

---

## Phase 6 — Customer Flow (Playwright Script)

Write and run this inline Playwright script to walk through the full customer order flow. Save it to a temp file and execute:

```bash
cat > /tmp/qa-customer.mjs << 'EOF'
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page = await browser.newPage();
page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro

console.log('→ Loading customer page...');
await page.goto('http://localhost:5173');
await page.waitForSelector('h1', { timeout: 10000 });
const title = await page.textContent('h1');
console.log(`  Event title: ${title}`);

// Check description box
const descBox = await page.$('.rounded-2xl.border.border-caramel-200\\/70');
console.log(`  Description box visible: ${!!descBox}`);

// Add an item
const plusButtons = await page.$$("button:has-text('+')");
if (plusButtons.length === 0) { console.log('❌ No + buttons found'); process.exit(1); }
await plusButtons[0].click();
await page.screenshot({ path: 'tests/screenshots/qa-step1-item-added.png', fullPage: true });
console.log('  Screenshot: item added');

// Check bottom CTA bar
const cta = await page.$("button:has-text('המשך להזמנה')");
console.log(`  CTA bar visible: ${!!cta}`);
if (!cta) { console.log('❌ CTA button not found after adding item'); process.exit(1); }
await cta.click();

// Slot picker or order form
await page.waitForTimeout(500);
const slotHeader = await page.$("h2:has-text('בחר שעת איסוף')");
const nameHeader = await page.$("h2:has-text('פרטי ההזמנה')");
await page.screenshot({ path: 'tests/screenshots/qa-step2-after-cta.png', fullPage: true });

if (slotHeader) {
  console.log('  Slot picker appeared ✓');
  // Check capacity dots exist
  const dots = await page.$$('.w-4.h-4.rounded-sm');
  console.log(`  Capacity dots found: ${dots.length}`);
  // Click first available slot
  const slotBtns = await page.$$("button:not([disabled])");
  const availableSlots = [];
  for (const btn of slotBtns) {
    const text = await btn.textContent();
    if (/^\d{2}:\d{2}/.test(text?.trim() ?? '')) availableSlots.push(btn);
  }
  if (availableSlots.length === 0) { console.log('⚠️  No available slots — skipping order submission'); await browser.close(); process.exit(0); }
  await availableSlots[0].click();
  await page.waitForTimeout(300);
}

// Order form
await page.waitForSelector("h2:has-text('פרטי ההזמנה')", { timeout: 5000 });
console.log('  Order form appeared ✓');
await page.screenshot({ path: 'tests/screenshots/qa-step3-order-form.png', fullPage: true });

// Fill name
const nameInput = await page.$("input[placeholder='הכנס שמך']");
if (!nameInput) { console.log('❌ Name input not found'); process.exit(1); }
await nameInput.fill('QA בדיקה');

// Check notes field is ABSENT
const notesField = await page.$("textarea");
console.log(`  Notes field absent: ${!notesField} ${notesField ? '❌' : '✓'}`);

await page.click("button:has-text('אשר הזמנה')");
await page.waitForTimeout(2000);
await page.screenshot({ path: 'tests/screenshots/qa-step4-after-submit.png', fullPage: true });

// Confirmation or error
const confirmHeading = await page.$("h1:has-text('ההזמנה אושרה')");
const backBtn = await page.$("button:has-text('חזרה לתפריט')");
if (confirmHeading) {
  console.log('  Confirmation screen ✓');
  console.log(`  Back-to-menu button: ${!!backBtn ? '✓' : '❌'}`);
} else {
  const errorDiv = await page.$('.bg-red-50');
  const errorText = errorDiv ? await errorDiv.textContent() : 'none';
  console.log(`⚠️  Confirmation not shown. Error: ${errorText}`);
}

await browser.close();
EOF
node /tmp/qa-customer.mjs 2>&1
```

Read each screenshot with the Read tool and note any visual issues.

---

## Phase 7 — Admin Flow (Playwright Script)

Get the admin password, then run:

```bash
cat > /tmp/qa-admin.mjs << 'ADMINEOF'
import { chromium } from 'playwright';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();

console.log('→ Loading admin page...');
await page.goto('http://localhost:5173/admin');
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/screenshots/qa-admin-gate.png', fullPage: true });

// Login
const pwInput = await page.$('input[type="password"]');
if (pwInput) {
  await pwInput.fill(ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  console.log('  Logged in ✓');
} else {
  console.log('  Already logged in (no password gate)');
}

await page.screenshot({ path: 'tests/screenshots/qa-admin-events.png', fullPage: true });

// Event list
const eventCards = await page.$$('.rounded-2xl.shadow-card');
console.log(`  Event cards visible: ${eventCards.length}`);

// Click first event
const manageBtn = await page.$("button:has-text('נהל')");
if (!manageBtn) { console.log('⚠️  No events to manage'); await browser.close(); process.exit(0); }
await manageBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/screenshots/qa-admin-event-detail.png', fullPage: true });
console.log('  Event detail opened ✓');

// Check description shown in view mode
const descParagraph = await page.$$('p.text-caramel-600.text-sm');
console.log(`  Description in view mode: ${descParagraph.length > 0 ? '✓' : '⚠️  not visible (may be empty)'}`);

// Open edit form
const editBtn = await page.$("button:has-text('עריכה')");
if (editBtn) {
  await editBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/screenshots/qa-admin-edit-form.png', fullPage: true });
  console.log('  Edit form opened ✓');
  // Check description textarea
  const descTextarea = await page.$('textarea');
  console.log(`  Description textarea present: ${!!descTextarea ? '✓' : '❌'}`);
  // Check max_ice_cream label
  const label = await page.$('label:has-text("מקסימום מנות גלידה")');
  console.log(`  Max ice cream label present: ${!!label ? '✓' : '❌'}`);
  // Cancel
  await page.click("button:has-text('ביטול')");
}

// Check delete button is visible (all event statuses should show it)
const deleteBtn = await page.$("button:has-text('מחק אירוע')");
console.log(`  Delete button visible: ${!!deleteBtn ? '✓' : '❌'}`);

// Switch to slots tab if published
const slotsTab = await page.$("button:has-text('סלוטים והזמנות')");
if (slotsTab) {
  await slotsTab.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/qa-admin-slots.png', fullPage: true });
  // Check capacity dots
  const dots = await page.$$('.w-4.h-4.rounded-sm');
  console.log(`  Slot capacity dots: ${dots.length > 0 ? `${dots.length} dots ✓` : '0 — no orders yet'}`);
}

await browser.close();
ADMINEOF
ADMIN_PASSWORD=changeme node /tmp/qa-admin.mjs 2>&1
```

Replace `changeme` with the real password from `.env`. Read all screenshots and report visual issues.

---

## Phase 8 — Edge Case Checks

Run these targeted API tests:

**Admin with no auth (should return 401):**
```bash
rtk curl -o /dev/null -w "%{http_code}" http://localhost:8002/admin/events
```
Expected: `401`

**Order with no items (should return 400):**
```bash
# Replace EVENT_ID with real value from Phase 2
rtk curl -X POST http://localhost:8002/orders \
  -H "Content-Type: application/json" \
  -d '{"event_id":"EVENT_ID","slot_id":null,"customer_name":"Test","notes":null,"items":[]}'
```
Expected: `400`

**Cascade delete — create a temp event, delete it, verify everything is gone:**
```bash
# Step 1: create a temp draft event (replace PASSWORD)
rtk curl -s -X POST http://localhost:8002/admin/events \
  -H "Authorization: Bearer PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"title":"__QA_DELETE_TEST__","date":"2099-01-01","start_time":"10:00","end_time":"11:00","slot_duration_min":30,"max_ice_cream_per_slot":5}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
```
Save the returned ID as `TEST_ID`, then:
```bash
# Step 2: delete it
rtk curl -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer PASSWORD" \
  http://localhost:8002/admin/events/TEST_ID
```
Expected: `204`

```bash
# Step 3: verify it's gone (404)
rtk curl -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer PASSWORD" \
  http://localhost:8002/admin/events/TEST_ID
```
Expected: `404`

**Delete non-existent event (should return 404):**
```bash
rtk curl -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer PASSWORD" \
  http://localhost:8002/admin/events/00000000-0000-0000-0000-000000000000
```
Expected: `404`

---

## Reporting

After all phases, produce this summary:

```
## QA Report — [date]

### Service Health
- Backend: ✅/❌
- Frontend: ✅/❌

### API
- Upcoming event endpoint: ✅/❌
- description field present: ✅/❌
- Admin auth (401 on bad password): ✅/❌

### E2E Tests
- X/Y tests passed
- Failing: [list]

### Customer Flow
- Event page loads: ✅/❌
- Description box visible: ✅/❌
- Item add/remove: ✅/❌
- Slot picker with capacity dots: ✅/❌
- Notes field absent: ✅/❌
- Order submission: ✅/❌
- Confirmation screen: ✅/❌
- Back-to-menu button: ✅/❌

### Admin Flow
- Login (password gate): ✅/❌
- Event list: ✅/❌
- Delete button visible (all statuses): ✅/❌
- Cascade delete (204 + 404 on re-fetch): ✅/❌
- Event detail + description in view mode: ✅/❌
- Edit form (description textarea, labeled max_ice_cream): ✅/❌
- Slot capacity dots: ✅/❌

### Visual Issues
[list any layout/design problems spotted in screenshots]

### Bugs Found
[list any unexpected behavior]
```
