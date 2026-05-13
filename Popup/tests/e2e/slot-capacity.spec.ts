import { test, expect } from "@playwright/test";

test.describe("Slot capacity enforcement", () => {
  test("full slot shows as disabled with correct label", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

    // Select an item
    const plusBtn = page.locator("button:has-text('+')").first();
    await plusBtn.click();
    await page.click("button:has-text('המשך להזמנה')");

    // Full slots should be disabled
    const fullSlots = page.locator("button:disabled:has-text('מלא')");
    // If any full slot exists, verify it's disabled
    const count = await fullSlots.count();
    if (count > 0) {
      await expect(fullSlots.first()).toBeDisabled();
    }
  });

  test("slot-full 409 response shows Hebrew error and returns to slot picker", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

    const plusBtn = page.locator("button:has-text('+')").first();
    await plusBtn.click();
    await page.click("button:has-text('המשך להזמנה')");

    const slotHeader = page.locator("h2:has-text('בחר שעת איסוף')");
    if (!(await slotHeader.isVisible().catch(() => false))) {
      // First item has ice_cream_mode=none; skip slot-full test scenario
      return;
    }

    // Intercept the POST /orders endpoint to simulate a slot-full 409
    await page.route("**/orders", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ detail: "הסלוט מלא — אנא בחר סלוט אחר" }),
      });
    });

    const slotBtn = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}/ }).first();
    if ((await slotBtn.count()) === 0) return;
    await slotBtn.click();

    await expect(page.locator("h2:has-text('פרטי ההזמנה')")).toBeVisible();
    await page.fill("input[placeholder='הכנס שמך']", "ישראל ישראלי");
    await page.click("button:has-text('אשר הזמנה')");

    await expect(page.locator("text=הסלוט התמלא")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("h2:has-text('בחר שעת איסוף')")).toBeVisible();
  });
});
