import { test, expect, type Page } from '@playwright/test';

const VARIANTS = ['mask', 'soft', 'wipe', 'scrub'] as const;

/** Linee "naturali" di un elemento, misurate carattere per carattere sul layout reale. */
async function naturalLines(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines: string[] = [];
    const range = document.createRange();
    let current = '';
    let lastLeft = Number.NaN;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('.sr-only')) continue;
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) {
          current += ' ';
          continue;
        }
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        if (!Number.isNaN(lastLeft) && rect.left < lastLeft - 0.5) {
          lines.push(current);
          current = '';
        }
        current += text[i];
        lastLeft = rect.left;
      }
    }
    lines.push(current);
    return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }, selector);
}

/** Linee prodotte dallo split. */
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
        if (n.closest('.sr-only')) return true;
        return (
          cs.visibility === 'visible' &&
          Number(cs.opacity) > 0.99 &&
          (cs.clipPath === 'none' || cs.clipPath === 'inset(0px)')
        );
      }),
    ),
  );
}

for (const width of [1440, 390]) {
  test(`lines match static layout at ${width}px even with slow fonts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/lab/reveal?static=1');
    await page.evaluate(() => document.fonts.ready);
    const expected = await naturalLines(page, '#manifesto-2');
    expect(expected.length).toBeGreaterThan(2);

    await page.route('**/fonts/*.woff2', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/lab/reveal?v=mask');
    expect(await splitLines(page, '#manifesto-2')).toEqual(expected);
  });
}

test('resplits on resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/lab/reveal?v=mask');
  const wide = await splitLines(page, '#manifesto-2');
  await page.setViewportSize({ width: 500, height: 900 });
  await expect
    .poll(async () => (await splitLines(page, '#manifesto-2')).join('|'), { timeout: 3000 })
    .not.toBe(wide.join('|'));
  const narrow = await splitLines(page, '#manifesto-2');
  expect(narrow.join(' ')).toBe(wide.join(' '));
  expect(narrow).toEqual(await naturalLines(page, '#manifesto-2'));
});

test.describe('without javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('all reveal content is visible', async ({ page }) => {
    await page.goto('/lab/reveal');
    expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(4);
    expect(await allRevealsVisible(page)).toBe(true);
    await expect(page.locator('.hero-line > span').first()).toBeInViewport();
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
    await expect(page.locator('.hero-info').first()).toHaveCSS('opacity', '1');
  });
});

test('hero intro ends with every line in place', async ({ page }) => {
  await page.goto('/lab/reveal');
  await page.waitForTimeout(3200);
  const offsets = await page.$$eval('.hero-line > span, .hero-sub > span', (els) =>
    els.map((e) => {
      const cs = getComputedStyle(e);
      const ty = cs.transform === 'none' ? 0 : new DOMMatrix(cs.transform).m42;
      return { ty: Math.round(ty), translate: cs.translate };
    }),
  );
  expect(offsets.every((o) => o.ty === 0 && (o.translate === 'none' || o.translate === '0px'))).toBe(true);
  const infos = await page.$$eval('.hero-info', (els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => getComputedStyle(e).opacity));
  expect(infos.every((o) => o === '1')).toBe(true);
});

test('no black anywhere: every color comes from the site palette', async ({ page }) => {
  await page.goto('/lab/reveal');
  await page.waitForTimeout(500);
  const offenders = await page.$$eval('body, body *', (els) =>
    els
      .filter((e) => !e.closest('svg') || e.tagName === 'svg')
      .flatMap((e) => {
        const cs = getComputedStyle(e);
        return [cs.color, cs.backgroundColor, cs.borderTopColor]
          .filter((c) => /^rgba?\(0, 0, 0(, 1)?\)$/.test(c))
          .map((c) => `${e.tagName.toLowerCase()}.${e.className}: ${c}`);
      }),
  );
  expect(offenders).toEqual([]);
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
          [el, ...el.querySelectorAll('*')].every(
            (n) => getComputedStyle(n).visibility === 'visible' && Number(getComputedStyle(n).opacity) > 0.99,
          ),
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
