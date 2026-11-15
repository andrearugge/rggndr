import { test, expect, type Page } from '@playwright/test';

const VARIANTS = ['mask', 'soft', 'wipe', 'scrub'] as const;

/** Linee "naturali" di un elemento, calcolate dal layout reale (nessuna animazione). */
async function naturalLines(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const words: { text: string; top: number }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const r = document.createRange();
        r.setStart(node, m.index);
        r.setEnd(node, m.index + m[0].length);
        words.push({ text: m[0], top: Math.round(r.getBoundingClientRect().top) });
      }
    }
    const lines: string[][] = [];
    let lastTop = Number.NaN;
    for (const w of words) {
      if (lines.length === 0 || Math.abs(w.top - lastTop) > 4) lines.push([]);
      lines[lines.length - 1].push(w.text);
      lastTop = w.top;
    }
    return lines.map((l) => l.join(' '));
  }, selector);
}

/** Linee prodotte da SplitText. */
async function splitLines(page: Page, selector: string): Promise<string[]> {
  await page.waitForFunction((sel) => document.querySelectorAll(`${sel} .line`).length > 0, selector);
  return page.$$eval(`${selector} .line`, (els) =>
    els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()),
  );
}

async function allRevealsVisible(page: Page) {
  return page.$$eval('[data-reveal]', (els) =>
    els.every((el) =>
      [el, ...el.querySelectorAll('*')].every((n) => {
        const cs = getComputedStyle(n);
        return Number(cs.opacity) > 0.99 && (cs.clipPath === 'none' || cs.clipPath === 'inset(0px)');
      }),
    ),
  );
}

for (const width of [1440, 390]) {
  test(`lines match static layout at ${width}px even with slow fonts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/lab/reveal?static=1');
    await page.evaluate(() => document.fonts.ready);
    const expected = await naturalLines(page, '#p-long');
    expect(expected.length).toBeGreaterThan(2);

    await page.route('**/fonts/*.woff2', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/lab/reveal?v=mask');
    expect(await splitLines(page, '#p-long')).toEqual(expected);
  });
}

test('resplits on resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/lab/reveal?v=mask');
  const wide = await splitLines(page, '#p-long');
  await page.setViewportSize({ width: 500, height: 900 });
  await expect
    .poll(async () => (await splitLines(page, '#p-long')).length, { timeout: 3000 })
    .toBeGreaterThan(wide.length);
  const narrow = await splitLines(page, '#p-long');
  expect(narrow.join(' ')).toBe(wide.join(' '));
  expect(narrow).toEqual(await naturalLines(page, '#p-long'));
});

test.describe('without javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('all reveal content is visible', async ({ page }) => {
    await page.goto('/lab/reveal');
    expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(4);
    expect(await allRevealsVisible(page)).toBe(true);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('all reveal content is visible without scrolling', async ({ page }) => {
    await page.goto('/lab/reveal?v=mask');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(4);
    expect(await allRevealsVisible(page)).toBe(true);
  });
});

for (const v of VARIANTS) {
  test(`variant ${v} ends fully visible after scrolling`, async ({ page }) => {
    await page.goto(`/lab/reveal?v=${v}`);
    await page.waitForFunction(() => document.documentElement.dataset.revealReady === 'true');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 300) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(2500);
    // in scrub gli elementi completano quando il loro top supera il 40% della viewport:
    // controlliamo solo quelli già oltre la soglia
    const ok = await page.$$eval('[data-reveal]', (els) =>
      els
        .filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.4)
        .every((el) =>
          [el, ...el.querySelectorAll('*')].every((n) => Number(getComputedStyle(n).opacity) > 0.99),
        ),
    );
    expect(ok).toBe(true);
  });
}

test('switching variant cleans up splits and triggers', async ({ page }) => {
  await page.goto('/lab/reveal?v=mask');
  await page.waitForFunction(() => document.documentElement.dataset.revealReady === 'true');
  const count = () =>
    page.evaluate(() => ({
      lines: document.querySelectorAll('.line').length,
      triggers: (window as any).__ST.getAll().length,
    }));
  const initial = await count();
  expect(initial.lines).toBeGreaterThan(0);
  for (const v of ['soft', 'wipe', 'scrub', 'mask']) {
    await page.getByRole('button', { name: new RegExp(v, 'i') }).click();
    await page.waitForTimeout(150);
  }
  expect(await count()).toEqual(initial);
});
