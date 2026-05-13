import { test, expect } from "@playwright/test";

test.describe("Customer happy path", () => {
  test("order with ice cream: item selection → slot picker → name → confirmation", async ({ page }) => {
    await page.goto("/");

    // Wait for event to load (requires running backend with a published event)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

    // Select an item with quantity > 0
    const plusBtn = page.locator("button:has-text('+')").first();
    await plusBtn.click();

    // Proceed to next step
    await page.click("button:has-text('המשך להזמנה')");

    // Slot picker should appear
    await expect(page.locator("h2:has-text('בחר שעת איסוף')")).toBeVisible();

    // Select first non-full slot
    const slotBtn = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}/ }).first();
    await slotBtn.click();

    // Name form
    await expect(page.locator("h2:has-text('פרטי ההזמנה')")).toBeVisible();
    await page.fill("input[placeholder='הכנס שמך']", "ישראל ישראלי");
    await page.click("button:has-text('אשר הזמנה')");

    // Confirmation screen
    await expect(page.locator("h1:has-text('ההזמנה אושרה')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=מספר הזמנה")).toBeVisible();
    await expect(page.locator("text=שמור צילום מסך")).toBeVisible();
  });
});
