import { test, expect, type Page } from '@playwright/test';

/** Registra a ogni frame la posizione del pannello e del nome finché il loader esiste. */
async function record(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__frames = [];
    const loop = (t: number) => {
      const loader = document.querySelector('[data-loader]');
      if (loader) {
        const bands = [...document.querySelectorAll<HTMLElement>('[data-loader-panel]')];
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

{
  test('loader: the panel fully leaves the screen, smoothly, before being removed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await record(page);
    await page.goto('/');
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
          visible: els.map((e) => {
            const b = e.getBoundingClientRect();
            const c = (e.firstElementChild as HTMLElement).getBoundingClientRect();
            return Math.max(0, Math.min(b.bottom, c.bottom) - Math.max(b.top, c.top)) * Math.max(0, Math.min(b.right, c.right) - Math.max(b.left, c.left)) > 1;
          }),
          boxes: els.map((e) => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, bottom: b.bottom }; }),
          keep: els.map((e) => e.hasAttribute('data-keep')),
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

type Roll = { i: number; start: number; end: number; dir: 1 | -1 };

async function measure(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 6000 });
  const frames: { t: number; rolls: number[]; widths: number[]; opacities: number[]; keep: boolean[]; visible: boolean[]; boxes: { left: number; right: number; bottom: number }[] }[] = await page.evaluate(() => (window as any).__letters);
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

test('loader monogram (rullo): letters only ever roll upwards, in three accelerating waves (even, odd, all)', async ({ page }) => {
  await letterTimeline(page);
  const { frames, n } = await measure(page);
  // ogni lettera: tutti i movimenti verso l'alto, in due rotazioni separate
  const starts: number[][] = [];
  const durs: number[][] = [];
  for (let i = 0; i < n; i++) {
    const v = frames.map((f) => f.rolls[i]);
    for (let k = 1; k < v.length; k++) expect(v[k], `lettera ${i} scende`).toBeGreaterThanOrEqual(v[k - 1] - 0.002);
    const moving = frames.filter((f, k) => k > 0 && f.rolls[i] > frames[k - 1].rolls[i] + 0.0005).map((f) => f.t);
    const segs: number[][] = [];
    for (const t of moving) {
      const cur = segs.at(-1);
      if (cur && t - cur.at(-1)! < 120) cur.push(t);
      else segs.push([t]);
    }
    expect(segs, `lettera ${i}`).toHaveLength(2);
    starts.push(segs.map((s) => s[0]));
    durs.push(segs.map((s) => s.at(-1)! - s[0]));
  }
  // prima onda: le lettere pari; seconda: le dispari; terza: tutte
  const firstEven = Math.max(...starts.filter((_, i) => i % 2 === 0).map((s) => s[0]));
  const firstOdd = Math.min(...starts.filter((_, i) => i % 2 === 1).map((s) => s[0]));
  expect(firstOdd).toBeGreaterThan(Math.min(...starts.filter((_, i) => i % 2 === 0).map((s) => s[0])) + 300);
  expect(Math.min(...starts.map((s) => s[1]))).toBeGreaterThan(Math.min(firstEven, firstOdd));
  // accelerando: l'onda finale è più breve della prima
  expect(Math.max(...durs.map((d) => d[1]))).toBeLessThan(Math.min(...durs.filter((_, i) => i % 2 === 0).map((d) => d[0])));
});

test('loader monogram (rullo): extra letters roll out of their mask, never fading, then RGGNDR closes up on one baseline', async ({ page }) => {
  await letterTimeline(page);
  const { frames } = await measure(page);
  const keepIdx = frames[0].keep.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
  const dropIdx = frames[0].keep.map((k, i) => (k ? -1 : i)).filter((i) => i >= 0);
  // ultimo frame in cui il nome è pienamente visibile
  const last = [...frames].reverse().find((f) => keepIdx.every((i) => f.opacities[i] > 0.99) && dropIdx.every((i) => !f.visible[i]))!;
  expect(last).toBeTruthy();
  // le superflue non sono mai sbiadite mentre erano visibili
  for (const f of frames) for (const i of dropIdx) if (f.visible[i]) expect(f.opacities[i]).toBeGreaterThan(0.99);
  // RGGNDR: tutte visibili, stessa baseline, lettere attaccate
  for (const i of keepIdx) {
    expect(last.visible[i]).toBe(true);
    expect(Math.abs(last.boxes[i].bottom - last.boxes[keepIdx[0]].bottom)).toBeLessThan(1);
  }
  keepIdx.slice(1).forEach((i, k) => expect(Math.abs(last.boxes[i].left - last.boxes[keepIdx[k]].right)).toBeLessThan(1));
});

test('loader monogram: RGGNDR stays in place and fades out with the same blur as the subtitle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await record(page);
  await page.goto('/');
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
