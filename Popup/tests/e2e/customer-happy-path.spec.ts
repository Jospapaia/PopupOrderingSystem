import { test, expect } from "@playwright/test";

test.describe("Customer happy path", () => {
  test("order with ice cream: item selection → slot picker → name → confirmation", async ({ page }) => {
    await page.goto("/");

    // Wait for event to load (requires running backend with a published event)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

    // Add item to cart, then increment via stepper
    await page.locator("button:has-text('הוספה להזמנה')").first().click();
    const plusBtn = page.locator("button:has-text('+')").first();
    await plusBtn.click();

    // Proceed to next step
    await page.click("button:has-text('המשך להזמנה')");

    // Slot picker should appear
    await expect(page.locator("h2:has-text('שעת איסוף')")).toBeVisible();

    // Select first non-full slot
    const slotBtn = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}/ }).first();
    await slotBtn.click();

    // Name form
    await expect(page.locator("h2:has-text('סיכום הזמנה')")).toBeVisible();
    await page.fill("input[placeholder='שם']", "ישראל ישראלי");
    await page.click("button:has-text('אישור הזמנה')");

    // Confirmation screen
    await expect(page.locator("h1:has-text('ההזמנה אושרה')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=קבלה")).toBeVisible();
    await expect(page.locator("text=שמור צילום מסך")).toBeVisible();
  });
});
