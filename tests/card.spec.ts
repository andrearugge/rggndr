import { test, expect, type Page } from '@playwright/test';

const VARIANTS = ['originale', 'lucida', 'rilievo', 'foil', 'mazzo'] as const;

/**
 * Posizioni dei blocchi sulla card originale (public/brand/card.svg), in unità della card (larga 524):
 * x = bordo sinistro, w = larghezza dell'inchiostro.
 */
const BLOCKS: Record<string, { x: number; w: number }> = {
  web: { x: 24.1, w: 136.5 },
  ig: { x: 388.8, w: 110.5 },
  wordmark: { x: 24, w: 476 },
  motto: { x: 34.9, w: 453.3 },
  hours: { x: 161, w: 202.4 },
  shy: { x: 24.8, w: 87.8 },
  phone: { x: 24.5, w: 110.9 },
  shoot: { x: 391.3, w: 108.4 },
  email: { x: 381, w: 118.5 },
};

async function ready(page: Page, v: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/lab/card?v=${v}`);
  await expect(page.locator('[data-card]')).toHaveAttribute('data-ready', '');
}

/** Rotazione 3D della card davanti (gradi attorno a X e Y). */
const tilt = (page: Page) =>
  page.locator('[data-card-front]').evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { x: Math.abs(Math.asin(-m.m23) * 57.3), y: Math.abs(Math.asin(m.m13) * 57.3) };
  });

test('card: real text and links, wordmark with an accessible name', async ({ page }) => {
  await ready(page, 'originale');
  const card = page.locator('[data-card]');
  await expect(card.getByRole('img', { name: 'RGGNDR' })).toBeVisible();
  await expect(card.getByText('(Barring Unforeseen Circumstances)')).toBeVisible();
  await expect(card.getByText('08:00 - 18:00 | Monday to Friday', { exact: false })).toBeVisible();
  await expect(card.locator('a[href="mailto:hello@rggndr.it"]')).toBeVisible();
  await expect(card.locator('a[href="tel:+393938576657"]')).toBeVisible();
  await expect(card.locator('a[href="https://www.rggndr.it"]')).toBeVisible();
  await expect(card.locator('a[href="https://www.instagram.com/andrearugge/"]')).toBeVisible();
});

test('card: every block sits where it is on the original card (±3 units)', async ({ page }) => {
  await ready(page, 'originale');
  const got = await page.locator('[data-card-front]').evaluate((front) => {
    const f = front as HTMLElement;
    // misure sulla card dritta: si toglie la rotazione per leggere le posizioni nel suo sistema
    const prev = [f.style.transform, f.style.rotate];
    f.style.transform = 'none';
    f.style.rotate = '0deg';
    const r = f.getBoundingClientRect();
    const u = r.width / 524;
    const out: Record<string, { x: number; w: number }> = {};
    for (const el of f.querySelectorAll<HTMLElement>('[data-block]')) {
      // larghezza dell'inchiostro: per il testo un Range sul contenuto, per il logo il riquadro
      let b = el.getBoundingClientRect();
      if (el.tagName !== 'svg') {
        const range = document.createRange();
        range.selectNodeContents(el);
        b = range.getBoundingClientRect();
      }
      out[el.dataset.block!] = { x: (b.left - r.left) / u, w: b.width / u };
    }
    [f.style.transform, f.style.rotate] = prev;
    return out;
  });
  for (const [name, want] of Object.entries(BLOCKS)) {
    expect(got[name], name).toBeTruthy();
    // il Range misura le scatole dei caratteri (con gli spazi laterali), l'originale l'inchiostro:
    // 3 unità coprono gli spazi laterali; sull'inchiostro la card coincide entro 0,25 (verificato a pixel)
    expect(Math.abs(got[name].x - want.x), `${name} x`).toBeLessThan(3);
    expect(Math.abs(got[name].w - want.w), `${name} w`).toBeLessThan(3);
  }
});

for (const v of VARIANTS) {
  test(`card ${v}: follows the mouse in 3D and settles back when it leaves`, async ({ page }) => {
    await ready(page, v);
    const box = (await page.locator('[data-card-front]').boundingBox())!;
    const rest = await tilt(page);
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.15, { steps: 8 });
    await page.waitForTimeout(700);
    const tilted = await tilt(page);
    expect(Math.max(tilted.x, tilted.y)).toBeGreaterThan(Math.max(rest.x, rest.y) + 3);
    await page.mouse.move(5, 5, { steps: 4 });
    await page.waitForTimeout(1500);
    const back = await tilt(page);
    expect(Math.abs(back.x - rest.x)).toBeLessThan(0.5);
    expect(Math.abs(back.y - rest.y)).toBeLessThan(0.5);
  });
}

test('card: reduced motion keeps it still', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/lab/card?v=lucida');
  await expect(page.locator('[data-card]')).toHaveAttribute('data-ready', '');
  const box = (await page.locator('[data-card-front]').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.15, { steps: 8 });
  await page.waitForTimeout(700);
  const t = await tilt(page);
  expect(Math.max(t.x, t.y)).toBeLessThan(0.5);
  await ctx.close();
});
