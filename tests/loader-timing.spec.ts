import { test, expect } from '@playwright/test';

test('loader timing lab: 10 monogram alternatives that loop forever without leaving the page', async ({ page }) => {
  await page.goto('/lab/loader-timing');
  const cards = page.locator('[data-timing]');
  await expect(cards).toHaveCount(10);
  // nessun pannello che esce, nessun loader rimosso
  await expect(page.locator('[data-loader]')).toHaveCount(0);

  // ogni variante arriva a RGGNDR (lettere in più chiuse) e poi torna a RUGGERI ANDREA
  const widths = async () =>
    cards.evaluateAll((els) => els.map((e) => e.querySelector<HTMLElement>('[data-loader-name]')!.getBoundingClientRect().width));
  const full = await (async () => {
    await page.waitForTimeout(300);
    return widths();
  })();
  const min = [...full];
  const seenFullAgain = full.map(() => false);
  const t0 = Date.now();
  let collapsed = full.map(() => false);
  while (Date.now() - t0 < 9000 && !seenFullAgain.every(Boolean)) {
    await page.waitForTimeout(100);
    const w = await widths();
    w.forEach((x, i) => {
      min[i] = Math.min(min[i], x);
      if (x < full[i] * 0.6) collapsed[i] = true;
      if (collapsed[i] && Math.abs(x - full[i]) < 1) seenFullAgain[i] = true;
    });
  }
  expect(collapsed).toEqual(full.map(() => true));
  expect(seenFullAgain).toEqual(full.map(() => true));
  await expect(cards).toHaveCount(10);
});

test('loader timing lab: an alternative can be tried full-page in the real loader', async ({ page }) => {
  await page.goto('/lab/loader-timing');
  await page.locator('[data-timing] a').nth(2).click();
  await expect(page).toHaveURL(/\/lab\/loader\?v=monogram&t=3/);
  await expect(page.locator('[data-loader]')).toBeVisible();
  await expect(page.locator('[data-loader]')).toHaveCount(0, { timeout: 7000 });
});
