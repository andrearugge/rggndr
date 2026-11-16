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
          subOpacity: Number(getComputedStyle(document.querySelector('[data-loader-sub]')!).opacity),
          name: { x: r.left, w: r.width, cy: r.top + r.height / 2, opacity: Number(getComputedStyle(name).opacity), filter: getComputedStyle(name).filter, transform: getComputedStyle(name).transform },
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

type Frame = { t: number; subOpacity: number; panelBottom: number; panelTop: number; covered: number; name: { x: number; w: number; cy: number; opacity: number; filter: string; transform: string } };

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
          opacities: els.map((e) => Number(getComputedStyle(e).opacity)),
          keep: els.map((e) => e.hasAttribute('data-keep')),
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

type Roll = { i: number; start: number; end: number; dir: 1 | -1 };

async function measure(page: Page, v: string) {
  await page.goto(`/lab/loader?v=${v}`);
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });
  const frames: { t: number; rolls: number[]; widths: number[]; opacities: number[]; keep: boolean[] }[] = await page.evaluate(() => (window as any).__letters);
  const n = frames[0].rolls.length;
  const rolls = Array.from({ length: n }, (_, i) => {
    // un salto di un'intera cella in un frame è un riposizionamento tra due celle uguali, non un movimento visibile
    const moving = frames
      .map((f, k) => ({ f, k }))
      .filter(({ f, k }) => {
        if (k === 0) return false;
        const a = frames[k - 1].rolls[i];
        const b = f.rolls[i];
        const inside = (v: number) => v >= -0.0005 && v <= 1.0005; // la rotazione d'uscita porta la lettera fuori dalla colonna
        return a !== b && Math.abs(b - a) < 0.5 && inside(a) && inside(b);
      });
    if (!moving.length) return null;
    const before = frames[moving[0].k - 1].rolls[i];
    const after = moving.at(-1)!.f.rolls[i];
    return { i, start: moving[0].f.t, end: moving.at(-1)!.f.t, dir: after > before ? 1 : -1 };
  })
    .filter((r): r is Roll => r !== null)
    .sort((a, b) => a.start - b.start);
  return { frames, n, rolls };
}

/** Raggruppa le rotazioni in giri: un nuovo giro inizia dopo una pausa di almeno 150ms tra due partenze. */
function rounds(rolls: Roll[]): Roll[][] {
  const out: Roll[][] = [];
  for (const r of rolls) {
    const cur = out.at(-1);
    if (cur && r.start - cur.at(-1)!.start < 150) cur.push(r);
    else out.push([r]);
  }
  return out;
}

test('loader monogram: three accelerating overlapping rounds, each with two sets rolling in opposite directions, then a linked collapse', async ({ page }) => {
  await letterTimeline(page);
  const classic = await measure(page, 'classic');
  const { frames, n, rolls } = await measure(page, 'monogram');

  // alcune lettere restano ferme
  expect(rolls.length).toBeLessThan(n);

  // tre giri, ognuno con un set che sale e uno che scende
  const rs = rounds(rolls);
  expect(rs).toHaveLength(3);
  const classicDelay = classic.rolls[1].start - classic.rolls[0].start;
  for (const round of rs) {
    const up = round.filter((r) => r.dir === 1);
    const down = round.filter((r) => r.dir === -1);
    expect(up.length).toBeGreaterThanOrEqual(1);
    expect(down.length).toBeGreaterThanOrEqual(1);
    // i due set partono insieme, ciascuno col ritardo tra lettere di classic
    expect(Math.abs(up[0].start - down[0].start)).toBeLessThan(25);
    for (const set of [up, down]) set.slice(1).forEach((r, k) => expect(Math.abs(r.start - set[k].start - classicDelay)).toBeLessThan(25));
  }
  // accelerando: ogni giro ha rotazioni più brevi e parte più vicino al precedente
  const dur = rs.map((round) => Math.max(...round.map((r) => r.end - r.start)));
  dur.slice(1).forEach((d, k) => expect(d).toBeLessThan(dur[k] - 60));
  const gaps = rs.slice(1).map((round, k) => round[0].start - rs[k][0].start);
  gaps.slice(1).forEach((g, k) => expect(g).toBeLessThan(gaps[k] - 60));
  // dentro un giro tutte le rotazioni durano uguale
  rs.forEach((round, k) => round.forEach((r) => expect(Math.abs(r.end - r.start - dur[k])).toBeLessThan(40)));
  // ogni giro parte prima che il precedente finisca
  rs.slice(1).forEach((round, k) => expect(round[0].start).toBeLessThan(Math.max(...rs[k].map((r) => r.end))));

  // l'uscita verso il monogram segue l'ultima rotazione senza pause percepibili: un'unica animazione
  const exitStart = frames.find((f) => f.rolls.some((v) => v > 1.0005 || v < -0.0005))!.t;
  expect(exitStart - Math.max(...rolls.map((r) => r.end))).toBeLessThan(50);
});

test('loader monogram: extra letters leave with a last roll in their own direction, never fading, then the name closes up', async ({ page }) => {
  await letterTimeline(page);
  const { frames, rolls } = await measure(page, 'monogram');
  const last = frames.at(-1)!;
  const drop = last.keep.map((k, i) => (k ? -1 : i)).filter((i) => i >= 0);
  expect(drop.length).toBe(7);
  let exitStarts: number[] = [];
  for (const i of drop) {
    const dir = rolls.find((r) => r.i === i)!.dir;
    // esce dalla maschera continuando la sua direzione: sopra (2 celle) se saliva, sotto (-1) se scendeva
    if (dir === 1) expect(last.rolls[i]).toBeGreaterThan(1.95);
    else expect(last.rolls[i]).toBeLessThan(-0.95);
    // nessuna dissolvenza finché la lettera è nella maschera
    for (const f of frames) if (f.rolls[i] > -0.95 && f.rolls[i] < 1.95) expect(f.opacities[i]).toBeGreaterThan(0.99);
    exitStarts.push(frames.find((f) => f.rolls[i] > 1.0005 || f.rolls[i] < -0.0005)!.t);
  }
  // l'uscita segue i giri, e l'accorpamento parte dopo l'inizio dell'uscita
  expect(Math.min(...exitStarts)).toBeGreaterThanOrEqual(Math.max(...rolls.map((r) => r.end)) - 20);
  // larghezze di riferimento all'inizio della prima rotazione: il font finale è già caricato
  const ref = frames.find((f) => f.t >= rolls[0].start)!.widths;
  const collapseStart = frames.find((f) => f.t > rolls[0].start && f.widths.some((w, i) => w < ref[i] - 0.5))!.t;
  expect(collapseStart).toBeGreaterThan(Math.min(...exitStarts));
});

test('loader monogram: RGGNDR stays in place and fades out with the same blur as the subtitle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await record(page);
  await page.goto('/lab/loader?v=monogram');
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });
  const f: Frame[] = await page.evaluate(() => (window as any).__frames);
  const visible = f.filter((x) => x.name.opacity > 0.01);
  // nessun volo: il nome non si sposta in verticale e non viene scalato
  for (const x of visible) {
    expect(Math.abs(x.name.cy - visible[0].name.cy)).toBeLessThan(1);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(x.name.transform);
  }
  // dopo la chiusura in RGGNDR, il nome sfuma sfocandosi, come il sottotitolo
  const fullIdx = f.findIndex((x) => x.name.opacity > 0.99);
  const fading = f.slice(fullIdx).filter((x) => x.name.opacity > 0.05 && x.name.opacity < 0.95);
  expect(fading.length).toBeGreaterThan(0);
  for (const x of fading) expect(x.name.filter).toMatch(/blur\((?!0px)/);
  expect(f.at(-1)!.name.opacity).toBeLessThan(0.05);
  // il sottotitolo sfuma insieme al monogramma
  const nameFadeStart = f.slice(fullIdx).find((x) => x.name.opacity < 0.95)!.t;
  const subFadeStart = f.slice(fullIdx).find((x) => x.subOpacity < 0.95)!.t;
  expect(Math.abs(subFadeStart - nameFadeStart)).toBeLessThan(40);
});
