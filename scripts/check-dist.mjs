// Controlla la build di produzione in dist/: niente lab, niente link al lab.
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
}

if (problems.length) {
  for (const p of problems) console.error(`check-dist: ${p}`);
  process.exit(1);
}
console.log('check-dist: ok');
