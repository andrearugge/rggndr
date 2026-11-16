import { test, expect } from '@playwright/test';

const VARIANTS = ['classic', 'slot', 'bands', 'monogram'] as const;

for (const v of VARIANTS) {
  test(`loader ${v}: covers the page, then leaves in time and hands over to the hero`, async ({ page }) => {
    await page.goto(`/lab/loader?v=${v}`);
    const loader = page.locator('[data-loader]');
    await expect(loader).toBeVisible();
    await expect(loader).toHaveAttribute('aria-hidden', 'true');
    const t0 = Date.now();
    await expect(loader).toHaveCount(0, { timeout: 5000 });
    expect(Date.now() - t0).toBeLessThan(v === 'monogram' ? 5000 : 3500);
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
}

for (const v of ['classic', 'slot'] as const) {
  test(`loader ${v}: rolling letters stay inside their one-letter mask`, async ({ page }) => {
    await page.goto(`/lab/loader?v=${v}`);
    await page.waitForTimeout(900); // a metà rotazione
    const overflow = await page.$$eval('[data-loader-letter]', (els) =>
      els.filter((e) => {
        const cell = e.firstElementChild!.firstElementChild ?? e.firstElementChild!;
        return e.getBoundingClientRect().height > cell.getBoundingClientRect().height + 1;
      }).length,
    );
    expect(overflow).toBe(0);
  });
}

test('loader slot: the name keeps the same width as the plain name while letters spin', async ({ page }) => {
  const widthAt = async (v: string) => {
    await page.goto(`/lab/loader?v=${v}`);
    await page.waitForTimeout(1000);
    return page.$eval('[data-loader-name]', (e) => Math.round(e.getBoundingClientRect().width));
  };
  const plain = await widthAt('classic');
  expect(Math.abs((await widthAt('slot')) - plain)).toBeLessThanOrEqual(1);
});

test('hero waits for the loader: it is still hidden while the loader is on screen', async ({ page }) => {
  await page.goto('/lab/loader?v=classic');
  await page.waitForTimeout(400);
  const ty = await page.$eval('.hero-line > span', (e) => e.getBoundingClientRect().top - e.parentElement!.getBoundingClientRect().top);
  expect(ty).toBeGreaterThan(10);
});

test.describe('without javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('loader never shows and the hero is visible', async ({ page }) => {
    await page.goto('/lab/loader');
    await expect(page.locator('[data-loader]')).toBeHidden();
    await expect(page.locator('.hero-line > span').first()).toBeInViewport();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('loader is skipped', async ({ page }) => {
    await page.goto('/lab/loader?v=monogram');
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 500 });
    await expect(page.locator('.hero-info').first()).toHaveCSS('opacity', '1');
  });
});

test('switching variant replays the loader', async ({ page }) => {
  await page.goto('/lab/loader?v=classic');
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 4000 });
  await page.getByRole('button', { name: /monogram/i }).click();
  await expect(page).toHaveURL(/v=monogram/);
  await expect(page.locator('[data-loader]')).toBeVisible();
});
