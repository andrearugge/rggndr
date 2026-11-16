import { test, expect } from '@playwright/test';
import { skipLoader } from './helpers';

test('footer symbol rotates with scroll', async ({ page }) => {
  await skipLoader(page);
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.revealReady === 'true');
  const angle = () =>
    page.locator('[data-footer-rotator]').evaluate((el) => {
      const t = getComputedStyle(el);
      // GSAP scrive `rotate` nel transform
      if (t.transform === 'none') return 0;
      const m = new DOMMatrix(t.transform);
      return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
    });
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const middle = await angle();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  expect(await angle()).not.toBe(middle);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('home fully visible, no loader', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 500 });
    const moved = await page.$$eval('.hero-line > span', (els) =>
      els.filter((e) => {
        const cs = getComputedStyle(e);
        return (cs.transform !== 'none' && new DOMMatrix(cs.transform).m42 !== 0) || (cs.translate !== 'none' && cs.translate !== '0px');
      }).length,
    );
    expect(moved).toBe(0);
    const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).visibility !== 'visible').length);
    expect(hidden).toBe(0);
  });
});

test.describe('without javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('gallery shows first photo and title, thumbnails scroll by hand', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/gallery/');
    await expect(page.locator('[data-gallery-slide] img').first()).toBeVisible();
    await expect(page.locator('[data-gallery-title]').first()).toBeVisible();
    const strip = await page.locator('[data-gallery-thumbs]').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    expect(strip.sw).toBeGreaterThan(strip.cw);
  });
});
