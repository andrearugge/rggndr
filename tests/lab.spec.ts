import { test, expect } from '@playwright/test';

test('lab pages are noindex', async ({ page }) => {
  for (const path of ['/lab/']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  }
});
