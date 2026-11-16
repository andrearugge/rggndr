import { test, expect, type Page } from '@playwright/test';

const URL = '/';

/** Registra a ogni frame se il loader è a schermo (esiste e non è nascosto dal CSS). */
async function watchLoader(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__loaderSeen = false;
    const loop = () => {
      const el = document.querySelector<HTMLElement>('[data-loader]');
      if (el) {
        const cs = getComputedStyle(el);
        if (cs.display !== 'none' && cs.visibility !== 'hidden') w.__loaderSeen = true;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

test('loader: covers the page, then leaves in time and hands over to the hero', async ({ page }) => {
  await page.goto(URL);
  const loader = page.locator('[data-loader]');
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute('aria-hidden', 'true');
  const t0 = Date.now();
  await expect(loader).toHaveCount(0, { timeout: 5000 });
  expect(Date.now() - t0).toBeLessThan(5000);
  // scroll sbloccato
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  // l'hero termina al suo posto
  await page.waitForTimeout(2600);
  const ok = await page.$$eval('.hero-line > span', (els) =>
    els.every((e) => {
      const t = getComputedStyle(e).transform;
      return t === 'none' || Math.round(new DOMMatrix(t).m42) === 0;
    }),
  );
  expect(ok).toBe(true);
});

test('hero waits for the loader: it is still hidden while the loader is on screen', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(400);
  const ty = await page.$eval('.hero-line > span', (e) => e.getBoundingClientRect().top - e.parentElement!.getBoundingClientRect().top);
  expect(ty).toBeGreaterThan(10);
});

test('loader plays once per session', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-loader]')).toBeVisible({ timeout: 300 });
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });

  await watchLoader(page);
  await page.reload();
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '', { timeout: 1000 });
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).__loaderSeen)).toBe(false);
});

test('a new session plays the loader again', async ({ page, browser }) => {
  await page.goto(URL);
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });
  const { baseURL } = test.info().project.use;
  const ctx = await browser.newContext({ baseURL });
  const fresh = await ctx.newPage();
  await fresh.goto(URL);
  await expect(fresh.locator('[data-loader]')).toBeVisible({ timeout: 300 });
  await ctx.close();
});

test('loader works when sessionStorage throws', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // alcuni browser in navigazione privata lanciano un'eccezione al solo accesso
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto(URL);
  await expect(page.locator('[data-loader]')).toBeVisible({ timeout: 300 });
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '');
  expect(errors).toEqual([]);
});

test('loader survives slow fonts', async ({ page }) => {
  await page.route('**/fonts/*.woff2', async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-loader]')).toBeVisible();
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-played', '');
});

test.describe('without javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('loader never shows and the hero is visible', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-loader]')).toBeHidden();
    await expect(page.locator('.hero-line > span').first()).toBeInViewport();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('loader is skipped', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 500 });
    await expect(page.locator('.hero-info').first()).toHaveCSS('opacity', '1');
  });
});
