import type { Page } from '@playwright/test';
import { test, expect, skipLoader } from './helpers';

const FIXTURE = '/lab/fixtures/split/';

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.revealReady === 'true');
}

async function heights(page: Page) {
  return page.$$eval('[data-reveal]', (els) =>
    Object.fromEntries(els.map((e) => [e.id, Math.round(e.getBoundingClientRect().height)])),
  );
}

test.beforeEach(async ({ page }) => page.setViewportSize({ width: 1280, height: 900 }));

test('split keeps the natural height (mixed inline sizes included)', async ({ page, browser }) => {
  // riferimento: lo stesso layout senza JavaScript
  const { baseURL } = test.info().project.use;
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const plain = await ctx.newPage();
  await plain.goto(FIXTURE);
  await plain.evaluate(() => document.fonts.ready);
  const expected = await heights(plain);
  await ctx.close();
  await page.goto(FIXTURE);
  await ready(page);
  const actual = await heights(page);
  for (const id of Object.keys(expected)) expect.soft(Math.abs(actual[id] - expected[id]), id).toBeLessThanOrEqual(1);
});

test('links and ids are never duplicated', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  await expect(page.locator('#link a')).toHaveCount(1);
  await expect(page.locator('#lk')).toHaveCount(1);
  await expect(page.locator('#link')).toBeVisible();
});

test('a link that does not wrap still allows the line split', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  expect(await page.locator('#shortlink .line').count()).toBeGreaterThan(2);
  await expect(page.locator('#shortlink a')).toHaveCount(1);
  await expect(page.locator('#shortlink a')).toHaveText('Beconcept');
});

test('leading non-text content survives the split', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  await expect(page.locator('#lead svg.lead-icon')).toHaveCount(1);
});

test('hidden elements are not emptied', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  expect((await page.locator('#hidden').textContent())?.trim()).toBe('Hidden text stays here');
});

test('split text is read once by screen readers', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  const el = page.locator('#fontsize');
  await expect(el.locator('.sr-only')).toHaveText(/Combining creativity .* one line at a time\./);
  const hiddenLines = await el.evaluate((e) =>
    [...e.querySelectorAll('.line')].every((l) => l.closest('[aria-hidden="true"]')),
  );
  expect(hiddenLines).toBe(true);
});

test('resplits when font-size changes but width does not', async ({ page }) => {
  await page.goto(FIXTURE);
  await ready(page);
  const before = await page.locator('#fontsize .line').count();
  await page.locator('#fontsize').evaluate((e) => (e.style.fontSize = '40px'));
  await expect.poll(() => page.locator('#fontsize .line').count(), { timeout: 3000 }).toBeGreaterThan(before);
});

test('content shows even if fonts never arrive', async ({ page }) => {
  await skipLoader(page);
  await page.route('**/fonts/*.woff2', () => {}); // richiesta appesa per sempre
  // i font in preload bloccano l'evento load: basta il DOM
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('#manifesto-2 .line').count(), { timeout: 2500 }).toBeGreaterThan(0);
  await expect(page.locator('.hero-line > span').first()).toBeInViewport({ timeout: 4000 });
});

test('content shows even if the reveal module fails', async ({ page }) => {
  await skipLoader(page);
  await page.route(/\.(js|ts)(\?.*)?$/, (route) => route.abort());
  await page.goto('/');
  await page.waitForTimeout(3500);
  const hidden = await page.$$eval(
    '[data-reveal]',
    (els) => els.filter((e) => getComputedStyle(e).visibility !== 'visible').length,
  );
  expect(hidden).toBe(0);
});

test('lab index loads and links to the split fixture', async ({ page }) => {
  await page.goto('/lab/');
  await page.getByRole('link', { name: /split/i }).click();
  await expect(page).toHaveURL(/\/lab\/fixtures\/split\/$/);
});
