// Controlla la build di produzione in dist/: niente lab, niente link al lab, niente dataset di prova,
// e `noindex` su tutti gli host pages.dev (produzione e anteprime) tramite dist/_headers.
// Si esegue dopo `npm run build` (senza LAB=1). Esce con codice 1 al primo problema trovato.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

if (!existsSync(DIST)) {
  console.error('check-dist: manca dist/, esegui prima npm run build');
  process.exit(1);
}

if (existsSync(join(DIST, 'lab'))) problems.push('lab nella build: dist/lab/');

for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  if (/(href|src)="\/lab\//.test(html) || /href="\/lab"/.test(html)) problems.push(`riferimento al lab in ${file}`);
  // asset finti del dataset di prova (tests/fixtures): la build di produzione legge il dataset vero di Sanity
  if (/cdn\.sanity\.io\/images\/[^"'\s]*\/fixture/.test(html)) problems.push(`dataset di prova nella build: ${file}`);
}

// Ogni host *.pages.dev resta fuori dai motori di ricerca; rggndr.it no (non corrisponde alle regole).
const NOINDEX_HOSTS = ['https://:project.pages.dev/*', 'https://:version.:project.pages.dev/*'];
const headersFile = join(DIST, '_headers');
if (!existsSync(headersFile)) problems.push('manca dist/_headers');
else {
  // blocchi: una riga con l'URL, poi le righe indentate con gli header
  const blocks = readFileSync(headersFile, 'utf8').split(/\n(?=\S)/);
  for (const host of NOINDEX_HOSTS) {
    const block = blocks.find((b) => b.split('\n')[0].trim() === host);
    if (!block || !/^\s+X-Robots-Tag:\s*noindex\s*$/im.test(block))
      problems.push(`manca X-Robots-Tag: noindex per ${host}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`check-dist: ${p}`);
  process.exit(1);
}
console.log('check-dist: ok');
