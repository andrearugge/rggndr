/**
 * Migrazione WordPress → Sanity.
 *   node scripts/migrate-wp/index.ts --out migration/wp.ndjson   legge rggndr.it e scrive l'NDJSON
 *   node scripts/migrate-wp/index.ts --record <dir>              salva le risposte grezze (per i test)
 *   node scripts/migrate-wp/index.ts --from <dir> --out <file>   usa le risposte salvate, senza rete
 * L'import si fa con `sanity dataset import <file> production --missing` (vedi docs/sanity.md):
 * gli id sono stabili, quindi i documenti già in Sanity (anche modificati nello Studio) non si toccano.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { toNdjson, transform } from './transform.ts';
import { fetchSnapshot, readSnapshot, writeSnapshot } from './wp.ts';

const { values } = parseArgs({
  options: { out: { type: 'string' }, record: { type: 'string' }, from: { type: 'string' } },
});

const snap = values.from ? readSnapshot(values.from) : await fetchSnapshot();
if (values.record) {
  writeSnapshot(values.record, snap);
  console.log(`risposte salvate in ${values.record}`);
}

if (values.out) {
  const { docs, warnings } = transform(snap);
  mkdirSync(dirname(values.out), { recursive: true });
  writeFileSync(values.out, toNdjson(docs));
  const count = Object.entries(Object.groupBy(docs, (d) => d._type)).map(([t, list]) => `${t}: ${list!.length}`);
  console.log(`${docs.length} documenti in ${values.out} (${count.join(', ')})`);
  if (warnings.length) console.log(`\n${warnings.length} avvisi:\n- ${warnings.join('\n- ')}`);
}
