import { defineConfig } from '@playwright/test';

// Test unitari (adattatori, immagini, migrazione): niente browser né server, girano in pochi secondi.
export default defineConfig({
  testDir: './tests/unit',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
});
