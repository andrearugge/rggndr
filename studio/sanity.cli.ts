import { defineCliConfig } from 'sanity/cli';

// Stessi valori di src/content/sanity.ts (il sito) e di sanity.config.ts.
export default defineCliConfig({
  api: { projectId: '9skjzcft', dataset: 'production' },
  // Studio pubblicato su https://rggndr.sanity.studio
  studioHost: 'rggndr',
  deployment: { autoUpdates: true },
});
