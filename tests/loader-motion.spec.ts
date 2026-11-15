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

/** Per ogni lettera: quando inizia e finisce la rotazione, e quando le lettere in più iniziano a chiudersi. */
async function letterTimeline(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__letters = [];
    const loop = (t: number) => {
      const els = [...document.querySelectorAll<HTMLElement>('[data-loader-letter]')];
      if (els.length) {
        w.__letters.push({
          t,
          rolls: els.map((e) => {
            const col = e.firstElementChild as HTMLElement;
            // in proporzione all'altezza della lettera: la scala del volo finale non la altera
            const h = e.getBoundingClientRect().height;
            return Math.round(((e.getBoundingClientRect().top - col.getBoundingClientRect().top) / h) * 1000) / 1000;
          }),
          widths: els.map((e) => Math.round(e.getBoundingClientRect().width * 10) / 10),
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

type Roll = { i: number; start: number; end: number };

async function measure(page: Page, v: string) {
  await page.goto(`/lab/loader?v=${v}`);
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 5000 });
  const frames: { t: number; rolls: number[]; widths: number[] }[] = await page.evaluate(() => (window as any).__letters);
  const n = frames[0].rolls.length;
  const rolls = Array.from({ length: n }, (_, i) => {
    const moving = frames.filter((f, k) => k > 0 && f.rolls[i] !== frames[k - 1].rolls[i]);
    return moving.length ? { i, start: moving[0].t, end: moving.at(-1)!.t } : null;
  })
    .filter((r): r is Roll => r !== null)
    .sort((a, b) => a.start - b.start);
  return { frames, n, rolls };
}

test('loader monogram: two overlapping rounds with classic timing, then a linked collapse', async ({ page }) => {
  await letterTimeline(page);
  const classic = await measure(page, 'classic');
  const { frames, n, rolls } = await measure(page, 'monogram');

  // alcune lettere restano ferme
  expect(rolls.length).toBeLessThan(n);
  // ogni rotazione dura come in classic
  const classicDuration = classic.rolls[0].end - classic.rolls[0].start;
  for (const r of rolls) expect(Math.abs(r.end - r.start - classicDuration)).toBeLessThan(40);

  // due giri: il primo di 3 lettere, il secondo di 3-4, che parte prima che il primo finisca
  const first = rolls.slice(0, 3);
  const second = rolls.slice(3);
  expect(second.length).toBeGreaterThanOrEqual(3);
  expect(second.length).toBeLessThanOrEqual(4);
  expect(second[0].start - first.at(-1)!.start).toBeGreaterThan(150); // due giri distinti
  expect(second[0].start).toBeLessThan(Math.max(...first.map((r) => r.end))); // ma sovrapposti
  // dentro ogni giro, lo stesso ritardo tra lettere di classic
  const classicDelay = classic.rolls[1].start - classic.rolls[0].start;
  for (const round of [first, second])
    round.slice(1).forEach((r, k) => expect(Math.abs(r.start - round[k].start - classicDelay)).toBeLessThan(25));

  // la chiusura del monogram parte prima che l'ultima rotazione sia finita: un'unica animazione
  const collapseStart = frames.find((f, k) => k > 0 && f.widths.some((w, i) => w < frames[0].widths[i] - 0.5))!.t;
  expect(collapseStart).toBeLessThan(Math.max(...rolls.map((r) => r.end)));
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
