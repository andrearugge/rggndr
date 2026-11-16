import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  test as base,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';

/** Simula una pagina successiva alla prima nella sessione: il loader non parte (D3). Chiave: src/layouts/Base.astro. */
export async function skipLoader(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('rggndr:loader-seen', '1'));
}

const ASSETS = join(import.meta.dirname, 'fixtures', 'assets');

/**
 * Le immagini del dataset di prova puntano al CDN di Sanity con asset finti (`fixture…`):
 * https://cdn.sanity.io/images/<progetto>/<dataset>/<id>-<w>x<h>.<fmt>?… → tests/fixtures/assets/<id>.<fmt>.
 * Qualunque larghezza chiesta riceve il file originale. Un asset che manca risponde 404.
 */
export async function routeSanityCdn(target: Page | BrowserContext) {
  await target.route('https://cdn.sanity.io/images/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const match = name.match(/^([^-]+)-\d+x\d+\.([a-z0-9]+)$/);
    const file = match && join(ASSETS, `${match[1]}.${match[2]}`);
    if (file && existsSync(file)) await route.fulfill({ path: file });
    else await route.fulfill({ status: 404, body: `asset di prova mancante: ${name}` });
  });
}

/** Contesto creato a mano (es. senza JS): sempre con le immagini del CDN servite dai file locali. */
export async function newContext(browser: Browser, options?: BrowserContextOptions) {
  const ctx = await browser.newContext(options);
  await routeSanityCdn(ctx);
  return ctx;
}

/** `test` di Playwright con le immagini del CDN servite dai file locali in ogni contesto. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await routeSanityCdn(context);
    await use(context);
  },
});

export { expect } from '@playwright/test';
