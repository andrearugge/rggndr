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
  expect(bg).toBe('rgb(249, 249, 248)');
});
