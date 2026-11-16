import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:4329' },
  webServer: {
    // i test girano anche sulle pagine del lab: build con LAB=1
    command: 'LAB=1 npm run build && npm run preview -- --port 4329 --ignore-lock',
    url: 'http://localhost:4329',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
