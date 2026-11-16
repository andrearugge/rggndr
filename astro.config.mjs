// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import lab from './integrations/lab.mjs';

// https://astro.build/config
export default defineConfig({
  // indirizzi con la barra finale, come sul sito attuale
  trailingSlash: 'always',
  // il lab (src/lab) entra solo in sviluppo e con LAB=1
  integrations: [lab()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
