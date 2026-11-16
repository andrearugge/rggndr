// Il lab è un'utility interna: le sue pagine (src/lab/pages) esistono solo in sviluppo
// e nelle build dei test (LAB=1). La build di produzione non le contiene.
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGES = fileURLToPath(new URL('../src/lab/pages/', import.meta.url));

const astroFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return astroFiles(path);
    return name.endsWith('.astro') ? [path] : [];
  });

/** `index.astro` → `/lab`, `fixtures/split.astro` → `/lab/fixtures/split`. */
const patternOf = (file) => {
  const route = relative(PAGES, file)
    .split(sep)
    .join('/')
    .replace(/\.astro$/, '')
    .replace(/(^|\/)index$/, '');
  return route ? `/lab/${route}` : '/lab';
};

export default function lab() {
  return {
    name: 'rggndr-lab',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        if (command !== 'dev' && process.env.LAB !== '1') return;
        for (const file of astroFiles(PAGES)) injectRoute({ pattern: patternOf(file), entrypoint: file });
        logger.info('pagine del lab incluse');
      },
    },
  };
}
