import { test, expect, skipLoader } from './helpers';

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

test('home text comes from the dataset', async ({ page }) => {
  await skipLoader(page);
  await page.goto('/');
  const journal = page.locator('section', { has: page.locator('h2', { hasText: 'AI Journal' }) }).locator('a');
  await expect(journal).toHaveAttribute('href', 'https://example.com/ai-journal');
  const h1 = page.locator('h1');
  await expect(h1).toContainText('Andrea Ruggeri');
  await expect(h1).toContainText('Design-driven entrepreneur');
  await expect(h1).not.toContainText('BOZZA');
  await expect(page.locator('#manifesto-1')).toBeAttached();
  await expect(page.locator('#manifesto-2')).toBeAttached();
  await expect(page.locator('#manifesto-1 a', { hasText: 'Beconcept' })).toHaveAttribute('target', '_blank');
  await expect(page.locator('.hero-sub b')).toHaveText('purposeful digital products');
});

test('project images come from the CDN with size', async ({ page }) => {
  await skipLoader(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const imgs = page.locator('#progetti img');
  await expect(imgs).toHaveCount(7);
  const sizes = await imgs.evaluateAll((els) => els.map((e) => [e.getAttribute('width'), e.getAttribute('height')]));
  expect(sizes).toEqual([
    ['1200', '901'],
    ['830', '1108'],
    ['550', '885'],
    ['550', '406'],
    ['1200', '1600'],
    ['1200', '1672'],
    ['830', '623'],
  ]);
  for (const img of await imgs.all()) {
    expect(await img.getAttribute('src')).toContain('https://cdn.sanity.io/images/');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('home fully visible, no loader', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 500 });
    const moved = await page.$$eval(
      '.hero-line > span',
      (els) =>
        els.filter((e) => {
          const cs = getComputedStyle(e);
          return (
            (cs.transform !== 'none' && new DOMMatrix(cs.transform).m42 !== 0) ||
            (cs.translate !== 'none' && cs.translate !== '0px')
          );
        }).length,
    );
    expect(moved).toBe(0);
    const hidden = await page.$$eval(
      '[data-reveal]',
      (els) => els.filter((e) => getComputedStyle(e).visibility !== 'visible').length,
    );
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
    const strip = await page
      .locator('[data-gallery-thumbs]')
      .evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    expect(strip.sw).toBeGreaterThan(strip.cw);
  });
});
