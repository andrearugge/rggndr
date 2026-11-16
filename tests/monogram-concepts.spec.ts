import { test, expect, type Page } from '@playwright/test';

/** Stato del monogram di ogni card: lettere superflue invisibili, quelle del monogram visibili e sulla stessa baseline. */
async function snapshot(page: Page) {
  return page.locator('[data-concept]').evaluateAll((cards) =>
    cards.map((card) => {
      const stage = card.querySelector<HTMLElement>('[data-concept-stage]')!;
      const letters = [...stage.querySelectorAll<HTMLElement>('[data-loader-letter]')];
      const info = letters.map((l) => {
        const box = l.getBoundingClientRect();
        const col = (l.firstElementChild as HTMLElement).getBoundingClientRect();
        const ix = Math.max(0, Math.min(box.right, col.right) - Math.max(box.left, col.left));
        const iy = Math.max(0, Math.min(box.bottom, col.bottom) - Math.max(box.top, col.top));
        const opacity = Number(getComputedStyle(l).opacity) * Number(getComputedStyle(l.firstElementChild!).opacity);
        return { keep: l.hasAttribute('data-keep'), box, col, visibleArea: ix * iy, opacity };
      });
      return { state: stage.dataset.state, info: info.map((i) => ({ ...i, box: i.box.toJSON(), col: i.col.toJSON() })) };
    }),
  );
}

for (const compact of [false, true]) {
  test(`monogram concepts (${compact ? 'compatto' : 'esteso'}): 5 loops that reach a clean RGGNDR and start again`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/lab/monogram${compact ? '?compatto=1' : ''}`);
    await expect(page.locator('[data-concept]')).toHaveCount(5);
    const reached = [false, false, false, false, false];
    const restarted = [false, false, false, false, false];
    const t0 = Date.now();
    while (Date.now() - t0 < 12000 && !restarted.every(Boolean)) {
      const snap = await snapshot(page);
      snap.forEach((c, i) => {
        if (c.state === 'monogram' && !reached[i]) {
          reached[i] = true;
          const keep = c.info.filter((l) => l.keep);
          const drop = c.info.filter((l) => !l.keep);
          // le lettere superflue non si vedono più, e non per dissolvenza
          for (const l of drop) {
            expect(l.visibleArea, `card ${i + 1}`).toBeLessThan(1);
            expect(l.opacity, `card ${i + 1}`).toBeGreaterThan(0.99);
          }
          // RGGNDR intero, visibile e sulla stessa baseline
          for (const l of keep) {
            expect(l.opacity).toBeGreaterThan(0.99);
            expect(Math.abs(l.col.bottom - keep[0].col.bottom), `card ${i + 1} baseline`).toBeLessThan(1);
            expect(Math.abs(l.col.height - keep[0].col.height), `card ${i + 1} altezza`).toBeLessThan(1);
            expect(l.visibleArea).toBeGreaterThan(l.box.width * l.box.height * 0.95);
          }
          // compatto: le sei lettere si toccano; esteso: restano al loro posto
          const gaps = keep.slice(1).map((l, k) => l.box.left - keep[k].box.right);
          if (compact) for (const g of gaps) expect(Math.abs(g), `card ${i + 1} compatto`).toBeLessThan(1);
          else expect(Math.max(...gaps), `card ${i + 1} esteso`).toBeGreaterThan(20);
        }
        if (reached[i] && c.state === 'name') restarted[i] = true;
      });
      await page.waitForTimeout(80);
    }
    expect(reached).toEqual([true, true, true, true, true]);
    expect(restarted).toEqual([true, true, true, true, true]);
  });
}

test('monogram concepts: a concept can be tried full-page in the real loader', async ({ page }) => {
  await page.goto('/lab/monogram?compatto=1');
  await page.locator('[data-concept] a').nth(1).click();
  await expect(page).toHaveURL(/\/lab\/loader\?v=monogram&c=[a-z]+&compatto=1/);
  await expect(page.locator('[data-loader]')).toBeVisible();
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 7000 });
});
