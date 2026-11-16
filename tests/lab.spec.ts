import { test, expect } from '@playwright/test';

test('lab pages are noindex', async ({ page }) => {
  for (const path of ['/lab', '/lab/reveal']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  }
});

test('lab index links to reveal', async ({ page }) => {
  await page.goto('/lab');
  await page.getByRole('link', { name: /reveal/i }).click();
  await expect(page).toHaveURL(/\/lab\/reveal/);
});

test('switcher updates url and pressed state', async ({ page }) => {
  // su /lab/loader il cambio di variante ricarica la pagina: si controlla lo stato finale
  await page.goto('/lab/loader');
  await page.getByRole('button', { name: /monogram/i }).click();
  await expect(page).toHaveURL(/\?v=monogram/);
  await expect(page.getByRole('button', { name: /monogram/i })).toHaveAttribute('aria-pressed', 'true');
});
