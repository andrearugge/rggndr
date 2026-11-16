import type { Page } from '@playwright/test';
import { test, expect } from './helpers';

const TITLES = ['Giulia, Lanzarote', 'Cascina Lago Scuro', 'Mud Millo', 'Home of dreams'];
const N = 14;

/** Attende che lo slider sia fermo e ritorna lo stato visibile della gallery. */
async function settled(page: Page) {
  const g = page.locator('[data-gallery]');
  await expect(g).toHaveAttribute('data-ready', '', { timeout: 4000 });
  await expect(g).not.toHaveAttribute('data-moving', /.*/, { timeout: 5000 });
  await page.waitForTimeout(80);
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-gallery]')!;
    const stage = root.querySelector<HTMLElement>('[data-gallery-stage]')!;
    const frame = stage.getBoundingClientRect();
    const strip = root.querySelector<HTMLElement>('[data-gallery-thumbs]')!.getBoundingClientRect();
    const shown = (el: Element) =>
      getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0.99;
    const slides = [...root.querySelectorAll<HTMLElement>('[data-gallery-slide]')].map((s) => {
      const img = s.querySelector('img')!;
      const r = img.getBoundingClientRect();
      return {
        visible: shown(s) && shown(img) && r.width > 10,
        inside:
          r.left >= frame.left + 1 &&
          r.right <= frame.right - 1 &&
          r.top >= frame.top + 1 &&
          r.bottom <= frame.bottom - 1,
        ratio: r.width / r.height,
        natural: Number(img.getAttribute('width')) / Number(img.getAttribute('height')),
        clip: getComputedStyle(s).clipPath,
      };
    });
    const titles = [...root.querySelectorAll<HTMLElement>('[data-gallery-title]')].map((t) => {
      const tf = getComputedStyle(t).transform;
      return {
        text: t.textContent!.trim(),
        visible: shown(t) && (tf === 'none' || Math.abs(new DOMMatrix(tf).m42) < 1),
        size: parseFloat(getComputedStyle(t).fontSize),
      };
    });
    // per ogni foto: la miniatura originale e la sua copia (aria-hidden) che chiude il loop infinito
    const focus = root.querySelector('[data-gallery-titles]')!.getBoundingClientRect().left;
    const all = [...root.querySelectorAll<HTMLElement>('[data-gallery-thumb]')];
    const originals = all.filter((t) => !t.hasAttribute('aria-hidden'));
    const thumbs = originals.map((t, i) => {
      const pair = all.filter((_, j) => j % originals.length === i);
      return {
        // la più vicina al punto di fuoco (può essere la copia)
        left: pair
          .map((p) => p.getBoundingClientRect().left)
          .sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus))[0],
        current: t.getAttribute('aria-current') === 'true',
        opacity: Math.min(...pair.map((p) => Number(getComputedStyle(p.querySelector('img')!).opacity))),
      };
    });
    return {
      index: Number(root.dataset.index),
      counter: root.querySelector('[data-gallery-counter]')!.textContent!.replace(/\s+/g, ' ').trim(),
      slides,
      titles,
      thumbs,
      stripLeft: strip.left,
      stripWidth: strip.width,
      titleLeft: root.querySelector('[data-gallery-titles]')!.getBoundingClientRect().left,
      viewport: document.documentElement.clientWidth,
      frameColor: getComputedStyle(stage).backgroundColor,
    };
  });
}

async function expectAt(page: Page, i: number) {
  const s = await settled(page);
  expect(s.index).toBe(i);
  expect(s.counter).toBe(`${i + 1} / ${N}`);
  // un solo titolo visibile, quello della foto attiva
  expect(s.titles.filter((t) => t.visible).map((t) => t.text)).toEqual([s.titles[i].text]);
  // una sola foto visibile, intera dentro la cornice e nelle sue proporzioni
  expect(s.slides.map((x) => x.visible)).toEqual(s.slides.map((_, k) => k === i));
  expect(s.slides[i].inside).toBe(true);
  expect(Math.abs(s.slides[i].ratio - s.slides[i].natural)).toBeLessThan(0.02);
  // la miniatura attiva è piena e allineata all'inizio dello slider; le altre sono attenuate
  expect(s.thumbs.map((t) => t.current)).toEqual(s.thumbs.map((_, k) => k === i));
  expect(s.thumbs[i].opacity).toBeGreaterThan(0.99);
  for (const [k, t] of s.thumbs.entries()) if (k !== i) expect(t.opacity).toBeLessThan(0.6);
  // lo slider va da bordo a bordo dello schermo; la miniatura attiva è allineata al titolo
  expect(s.stripLeft).toBe(0);
  expect(s.stripWidth).toBe(s.viewport);
  expect(Math.abs(s.thumbs[i].left - s.titleLeft)).toBeLessThan(1.5);
  return s;
}

test('gallery: all titles and images are in the HTML, first photo visible without javascript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/gallery/');
  await expect(page.locator('[data-gallery-title]')).toHaveCount(N);
  await expect(page.locator('[data-gallery-slide] img')).toHaveCount(N);
  for (const t of TITLES) await expect(page.locator('[data-gallery-title]', { hasText: t })).toHaveCount(1);
  await expect(page.locator('[data-gallery-slide] img').first()).toBeVisible();
  await expect(page.locator('[data-gallery-slide] img').first()).toHaveAttribute('alt', TITLES[0]);
  await expect(page.locator('[data-gallery-thumb]')).toHaveCount(N);
  await ctx.close();
});

test.describe('gallery slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/gallery/');
  });

  test('starts on the first photo, in a primary frame at 10%, with a title smaller than the old one', async ({
    page,
  }) => {
    const s = await expectAt(page, 0);
    expect(s.frameColor).toBe('rgba(137, 141, 127, 0.1)');
    expect(s.titles[0].size).toBeLessThan(102);
  });

  test('clicking a thumb brings it to the start of the slider and makes it active', async ({ page }) => {
    await expectAt(page, 0);
    await page.locator('[data-gallery-thumb]:not([aria-hidden])').nth(3).click();
    await expectAt(page, 3);
  });

  test('the wheel scrolls the slider and the active photo follows it', async ({ page }) => {
    await expectAt(page, 0);
    const strip = (await page.locator('[data-gallery-thumbs]').boundingBox())!;
    await page.mouse.move(strip.x + strip.width / 2, strip.y + strip.height / 2);
    for (let k = 0; k < 6; k++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(16);
    }
    const s = await settled(page);
    expect(s.index).toBeGreaterThan(0);
    await expectAt(page, s.index);
  });

  test('dragging the slider moves it, with inertia, and it settles on a thumb', async ({ page }) => {
    await expectAt(page, 0);
    const strip = (await page.locator('[data-gallery-thumbs]').boundingBox())!;
    const y = strip.y + strip.height / 2;
    await page.mouse.move(strip.x + 700, y);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) {
      await page.mouse.move(strip.x + 700 - k * 30, y);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    const s = await settled(page);
    expect(s.index).toBeGreaterThan(1);
    await expectAt(page, s.index);
  });

  test('the slider is infinite: going back from the first photo reaches the last one', async ({ page }) => {
    await expectAt(page, 0);
    await page.keyboard.press('ArrowLeft');
    await expectAt(page, N - 1);
    await page.keyboard.press('ArrowRight');
    await expectAt(page, 0);
    await page.keyboard.press('ArrowRight');
    await expectAt(page, 1);
  });

  test('quick arrow presses add up: two presses move two photos', async ({ page }) => {
    await expectAt(page, 0);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expectAt(page, 2);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expectAt(page, N - 1);
  });

  test('the big photo changes with a hard cut, like Bruno Arizio: never two photos or a half-revealed one', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const w = window as any;
      w.__cut = [];
      const slides = [...document.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
      const loop = () => {
        const shown = slides.filter((s) => getComputedStyle(s).visibility !== 'hidden');
        const partial = slides.some((s) => {
          const cs = getComputedStyle(s);
          const img = getComputedStyle(s.querySelector('img')!);
          return (
            (cs.clipPath !== 'none' && cs.clipPath !== '') ||
            Number(cs.opacity) < 1 ||
            Number(img.opacity) < 1 ||
            img.transform !== 'none'
          );
        });
        w.__cut.push({ shown: shown.length, partial });
        w.__raf = requestAnimationFrame(loop);
      };
      loop();
    });
    await expectAt(page, 0);
    const strip = (await page.locator('[data-gallery-thumbs]').boundingBox())!;
    await page.mouse.move(strip.x + strip.width / 2, strip.y + strip.height / 2);
    for (let k = 0; k < 8; k++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(16);
    }
    await settled(page);
    const frames: { shown: number; partial: boolean }[] = await page.evaluate(() => (window as any).__cut);
    expect(frames.length).toBeGreaterThan(20);
    expect(frames.filter((f) => f.shown !== 1)).toEqual([]);
    expect(frames.filter((f) => f.partial)).toEqual([]);
  });
});

test('gallery: reduced motion still navigates', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/gallery/');
  await page.locator('[data-gallery-thumb]:not([aria-hidden])').nth(2).click();
  await expectAt(page, 2);
  await ctx.close();
});
