import type { Page } from '@playwright/test';

/** Simula una pagina successiva alla prima nella sessione: il loader non parte (D3). */
export async function skipLoader(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('rggndr:loader-seen', '1'));
}
