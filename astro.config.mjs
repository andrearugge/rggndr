// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // indirizzi con la barra finale, come sul sito attuale
  trailingSlash: 'always',
  // la toolbar di sviluppo si sovrappone allo switcher del lab
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()]
  }
});