import { defineConfig } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // in CI un test.only dimenticato fa fallire la suite
  forbidOnly: CI,
  // nessun nuovo tentativo: un test di motion instabile va capito, non ripetuto
  retries: 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4329',
    // Su Linux (CI) Chromium arrotonda al pixel gli avanzamenti dei glifi: le larghezze del testo
    // cambiano di qualche px rispetto a macOS. Senza hinting le misure coincidono sui due sistemi.
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
  webServer: {
    // i test girano anche sulle pagine del lab: build con LAB=1
    command: 'LAB=1 npm run build && npm run preview -- --port 4329 --ignore-lock',
    url: 'http://localhost:4329',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
