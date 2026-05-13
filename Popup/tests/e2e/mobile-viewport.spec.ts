import { test, expect } from "@playwright/test";

test.describe("Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal overflow at 375px", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
