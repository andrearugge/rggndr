import { test, expect, type Page } from '@playwright/test';

const VARIANTS = ['rullo', 'scorrimento', 'webgl', 'zoom'] as const;
const TITLES = ['Giulia, Lanzarote', 'Cascina Lago Scuro', 'Mud Millo', 'Home of dreams'];

/** Attende la fine della transizione e ritorna lo stato visibile della gallery. */
async function settled(page: Page) {
  const g = page.locator('[data-gallery]');
  await expect(g).not.toHaveAttribute('data-busy', /.*/, { timeout: 4000 });
  await page.waitForTimeout(50);
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-gallery]')!;
    const stage = root.querySelector<HTMLElement>('[data-gallery-stage]')!.getBoundingClientRect();
    const shown = (el: Element) => {
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.99;
    };
    const slides = [...root.querySelectorAll<HTMLElement>('[data-gallery-slide]')].map((s) => {
      const r = s.querySelector('img')!.getBoundingClientRect();
      const inStage = r.left >= stage.left - 1 && r.right <= stage.right + 1 && r.top >= stage.top - 1 && r.bottom <= stage.bottom + 1;
      return { active: s.hasAttribute('data-active'), visible: shown(s) && shown(s.querySelector('img')!) && inStage && r.width > 10 };
    });
    const titles = [...root.querySelectorAll<HTMLElement>('[data-gallery-title]')].map((t) => ({
      text: t.textContent!.trim(),
      active: t.hasAttribute('data-active'),
      visible: (() => {
        const tf = getComputedStyle(t).transform;
        const still = tf === 'none' || Math.abs(new DOMMatrix(tf).m42) < 1;
        return shown(t) && still;
      })(),
    }));
    const canvas = root.querySelector('canvas');
    return {
      index: Number(root.dataset.index),
      counter: root.querySelector('[data-gallery-counter]')!.textContent!.replace(/\s+/g, ' ').trim(),
      slides,
      titles,
      webgl: !!canvas && shown(canvas),
      activeThumb: [...root.querySelectorAll('[data-gallery-thumb]')].findIndex((t) => t.getAttribute('aria-current') === 'true'),
    };
  });
}

async function expectAt(page: Page, i: number) {
  const s = await settled(page);
  expect(s.index).toBe(i);
  expect(s.counter).toBe(`${i + 1} / 14`);
  expect(s.activeThumb).toBe(i);
  // un solo titolo attivo e visibile, al suo posto
  expect(s.titles.filter((t) => t.active).map((t) => t.text)).toEqual([s.titles[i].text]);
  expect(s.titles.filter((t) => t.visible).map((t) => t.text)).toEqual([s.titles[i].text]);
  // una sola foto attiva; visibile come immagine o disegnata dal canvas WebGL
  expect(s.slides.filter((x) => x.active).length).toBe(1);
  expect(s.slides[i].active).toBe(true);
  if (s.webgl) expect(s.slides.filter((x) => x.visible).length).toBe(0);
  else expect(s.slides.map((x) => x.visible)).toEqual(s.slides.map((_, k) => k === i));
}

test('gallery: all titles and images are in the HTML, first photo visible without javascript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/lab/gallery');
  await expect(page.locator('[data-gallery-title]')).toHaveCount(14);
  await expect(page.locator('[data-gallery-slide] img')).toHaveCount(14);
  for (const t of TITLES) await expect(page.locator('[data-gallery-title]', { hasText: t })).toHaveCount(1);
  await expect(page.locator('[data-gallery-slide] img').first()).toBeVisible();
  await expect(page.locator('[data-gallery-slide] img').first()).toHaveAttribute('alt', TITLES[0]);
  await expect(page.locator('[data-gallery-thumb]')).toHaveCount(14);
  await ctx.close();
});

for (const v of VARIANTS) {
  test.describe(`gallery ${v}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/lab/gallery?v=${v}`);
    });

    test('starts on the first photo, thumbs and keys navigate, looping at both ends', async ({ page }) => {
      await expectAt(page, 0);
      if (v === 'webgl') expect((await settled(page)).webgl).toBe(true);
      await page.locator('[data-gallery-thumb]').nth(3).click();
      await expectAt(page, 3);
      await page.keyboard.press('ArrowRight');
      await expectAt(page, 4);
      await page.locator('[data-gallery-thumb]').nth(13).click();
      await expectAt(page, 13);
      await page.keyboard.press('ArrowRight');
      await expectAt(page, 0);
      await page.keyboard.press('ArrowLeft');
      await expectAt(page, 13);
    });

    test('rapid clicks end on the last photo chosen', async ({ page }) => {
      await expectAt(page, 0);
      for (const i of [2, 5, 9]) {
        await page.locator('[data-gallery-thumb]').nth(i).click();
        await page.waitForTimeout(90);
      }
      await expectAt(page, 9);
    });

    test('dragging and wheeling on the photo move to the next one', async ({ page }) => {
      await expectAt(page, 0);
      const box = (await page.locator('[data-gallery-stage]').boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.7, y);
      await page.mouse.down();
      for (let k = 1; k <= 10; k++) await page.mouse.move(box.x + box.width * 0.7 - k * 25, y);
      await page.mouse.up();
      await expectAt(page, 1);
      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.wheel(0, 120);
      await expectAt(page, 2);
      await page.mouse.wheel(0, -120);
      await expectAt(page, 1);
    });
  });
}

test('gallery: reduced motion still navigates, instantly', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/lab/gallery?v=rullo');
  await page.locator('[data-gallery-thumb]').nth(2).click();
  await expectAt(page, 2);
  await ctx.close();
});
