import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:4329' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4329 --ignore-lock',
    url: 'http://localhost:4329',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
