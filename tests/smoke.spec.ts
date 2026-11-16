import { test, expect } from '@playwright/test';

test('home has fonts loaded', async ({ page }) => {
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('16px Montreal'),
      document.fonts.load('900 16px Compact'),
    ]);
    const loadedFace = (family: string) =>
      [...document.fonts].some((f) => f.family.replace(/"/g, '') === family && f.status === 'loaded');
    return { montrealFace: loadedFace('Montreal'), compactFace: loadedFace('Compact') };
  });
  expect(loaded.montrealFace).toBe(true);
  expect(loaded.compactFace).toBe(true);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');
  const color = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(color).toBe('rgb(137, 141, 127)');
});

test('home is the real page: hero title and no link to the lab', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Andrea Ruggeri');
  await expect(page.locator('a[href^="/lab"]')).toHaveCount(0);
  await expect(page.locator('footer [data-card]')).toHaveCount(1);
});
