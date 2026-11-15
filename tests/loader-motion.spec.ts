import { test, expect, type Page } from '@playwright/test';

/** Registra a ogni frame la posizione del pannello e del nome finché il loader esiste. */
async function record(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__frames = [];
    const loop = (t: number) => {
      const loader = document.querySelector('[data-loader]');
      if (loader) {
        const bands = [...document.querySelectorAll<HTMLElement>('[data-loader-bands] > div')];
        const name = document.querySelector<HTMLElement>('[data-loader-name]')!;
        const r = name.getBoundingClientRect();
        w.__frames.push({
          t,
          panelBottom: Math.max(...bands.map((b) => b.getBoundingClientRect().bottom)),
          panelTop: Math.min(...bands.map((b) => b.getBoundingClientRect().top)),
          covered: bands.reduce((sum, b) => {
            const r = b.getBoundingClientRect();
            return sum + Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          }, 0),
          name: { x: r.left, w: r.width, cy: r.top + r.height / 2, opacity: Number(getComputedStyle(name).opacity) },
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

type Frame = { t: number; panelBottom: number; panelTop: number; covered: number; name: { x: number; w: number; cy: number; opacity: number } };

for (const v of ['classic', 'slot', 'bands', 'monogram']) {
  test(`loader ${v}: the panel fully leaves the screen, smoothly, before being removed`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await record(page);
    await page.goto(`/lab/loader?v=${v}`);
    await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 5000 });
    const f: Frame[] = await page.evaluate(() => (window as any).__frames);
    // l'ultimo frame prima della rimozione: niente verde a schermo
    expect(f.at(-1)!.panelBottom).toBeLessThanOrEqual(0);
    // durante l'uscita: nessun frame perso e nessuna pausa
    const startIdx = f.findIndex((x) => x.panelTop < -1);
    const exit = f.slice(startIdx).filter((x) => x.panelBottom > 0);
    const duration = exit.at(-1)!.t - exit[0].t;
    expect(duration).toBeLessThan(1200);
    const gaps = exit.slice(1).map((x, i) => x.t - exit[i].t);
    expect(Math.max(...gaps)).toBeLessThan(34);
    // una pausa = 150ms in cui l'area verde ancora a schermo cala di meno di 2px
    const stalled = exit.some((x) => {
      const later = exit.find((y) => y.t >= x.t + 150);
      return later && x.covered - later.covered < 2;
    });
    expect(stalled).toBe(false);
  });
}

test('loader monogram: every letter spins before the extra ones close', async ({ page }) => {
  await page.goto('/lab/loader?v=monogram');
  await page.waitForTimeout(900);
  const spinning = await page.$$eval('[data-loader-letter]', (els) =>
    els.map((e) => (e.firstElementChild as HTMLElement).childElementCount > 1),
  );
  expect(spinning.every(Boolean)).toBe(true);
  const dropped = await page.$$eval('[data-loader-letter]:not([data-keep])', (els) =>
    els.map((e) => Math.round(e.getBoundingClientRect().width)),
  );
  expect(dropped.every((w) => w > 0)).toBe(true); // a 0.9s sono ancora tutte lì
});

test('loader monogram: classic-style rolls, three rounds of different letters, landing on its own letter', async ({ page }) => {
  await page.goto('/lab/loader?v=monogram');
  await page.waitForTimeout(300);
  const columns = await page.$$eval('[data-loader-letter]', (els) =>
    els.map((e) => ({ own: e.getAttribute('data-char'), cells: [...e.firstElementChild!.children].map((c) => c.textContent) })),
  );
  for (const c of columns) {
    expect(c.cells.length).toBe(4); // lettera + 3 giri
    expect(c.cells.at(-1)).toBe(c.own);
    expect(c.cells.slice(1, 3).every((x) => x !== c.own)).toBe(true);
    expect(c.cells[1]).not.toBe(c.cells[2]);
  }
  // i giri sono scatti distinti: tra un giro e l'altro la prima lettera è ferma su una cella intera
  const aligned = await page.waitForFunction(() => {
    const name = document.querySelector('[data-loader-name]');
    if (name?.getAttribute('data-round') !== '1') return false;
    const e = document.querySelector('[data-loader-letter]') as HTMLElement;
    const col = e.firstElementChild as HTMLElement;
    const cell = e.getBoundingClientRect().height;
    const offset = (e.getBoundingClientRect().top - col.getBoundingClientRect().top) / cell;
    return { offset: Math.round(offset * 100) / 100 };
  });
  expect(await aligned.jsonValue()).toEqual({ offset: 1 });
});

test('loader monogram: random letters are never clipped by their mask', async ({ page }) => {
  await page.goto('/lab/loader?v=monogram');
  // quando l'onda del giro 2 è arrivata all'ultima lettera; la prima può già essere nel giro 3
  await page.waitForFunction(() => document.querySelector('[data-loader-name]')?.getAttribute('data-round-done') === '2');
  const clipped = await page.$$eval('[data-loader-letter]', (els) =>
    els
      .map((e) => {
        const cs = getComputedStyle(e);
        // larghezza visibile: la maschera + quanto la clip-path concede ai lati
        const m = cs.clipPath.match(/inset\(0px (-?[\d.]+)%/);
        const side = cs.overflowX === 'visible' && m ? (-Number(m[1]) / 100) * e.getBoundingClientRect().width : 0;
        const visible = e.getBoundingClientRect().width + 2 * side;
        const range = document.createRange();
        const widest = Math.max(
          ...[...e.firstElementChild!.children].map((c) => {
            range.selectNodeContents(c);
            return range.getBoundingClientRect().width;
          }),
        );
        return { c: e.getAttribute('data-char'), widest, visible };
      })
      .filter((x) => x.visible < x.widest - 0.5),
  );
  expect(clipped).toEqual([]);
});

test('loader monogram: RGGNDR lands exactly on the header logo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await record(page);
  await page.goto('/lab/loader?v=monogram');
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 5000 });
  const f: Frame[] = await page.evaluate(() => (window as any).__frames);
  const landed = f.find((x) => x.name.opacity < 0.98 && x.panelBottom <= 0) ?? f.at(-1)!;
  const logo = await page.locator('header a[href="/"]:visible').first().boundingBox();
  expect(Math.abs(landed.name.x - logo!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(landed.name.w - logo!.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(landed.name.cy - (logo!.y + logo!.height / 2))).toBeLessThanOrEqual(2);
});
