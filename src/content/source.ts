/**
 * Unico punto da cui il sito legge i contenuti, in fase di build.
 * - Build vera: il dataset pubblicato di Sanity (le bozze non ci sono).
 * - Test e CI (CONTENT_SOURCE=fixture): un dataset di prova in NDJSON, valutato in locale con groq-js.
 * Le query sono le stesse nei due casi (src/content/queries.ts).
 */
import { readFileSync } from 'node:fs';
import { createClient, type SanityClient } from '@sanity/client';
import { evaluate, parse } from 'groq-js';
import { SANITY } from './sanity';

/** Documento del dataset di prova: basta che abbia id e tipo. */
export type SanityDocumentLike = { _id: string; _type: string; [field: string]: unknown };

export type Fetch = <T>(query: string, params?: Record<string, unknown>) => Promise<T>;

const DEFAULT_FIXTURE = 'tests/fixtures/dataset.ndjson';

/** Legge un dataset NDJSON (un documento per riga, righe vuote ignorate). */
export function readFixture(path: string): SanityDocumentLike[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

/** Valuta le query su documenti in memoria, come il dataset pubblicato: senza bozze. */
export function createFixtureSource(docs: SanityDocumentLike[]): Fetch {
  const dataset = docs.filter((d) => !d._id.startsWith('drafts.'));
  return async <T>(query: string, params: Record<string, unknown> = {}) => {
    const result = await evaluate(parse(query, { params }), { dataset, params });
    return (await result.get()) as T;
  };
}

/** Avvolge il client di Sanity: un errore diventa un errore di build leggibile. */
export function createSanitySource(client: Pick<SanityClient, 'fetch'>): Fetch {
  return async <T>(query: string, params: Record<string, unknown> = {}) => {
    try {
      return (await client.fetch(query, params)) as T;
    } catch (e) {
      const short = query.replace(/\s+/g, ' ').slice(0, 60);
      throw new Error(`Sanity: ${short} — ${e instanceof Error ? e.message : String(e)}`, { cause: e });
    }
  };
}

let source: Fetch | undefined;

function currentSource(): Fetch {
  if (source) return source;
  if (process.env.CONTENT_SOURCE === 'fixture') {
    source = createFixtureSource(readFixture(process.env.CONTENT_FIXTURE ?? DEFAULT_FIXTURE));
  } else {
    source = createSanitySource(createClient({ ...SANITY, useCdn: false, perspective: 'published' }));
  }
  return source;
}

/** Esegue una query sulla sorgente scelta da CONTENT_SOURCE. */
export const fetchQuery: Fetch = (query, params) => currentSource()(query, params);
