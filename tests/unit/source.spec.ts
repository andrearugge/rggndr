import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { createFixtureSource, createSanitySource, readFixture } from '../../src/content/source';

test('fixture source evaluates GROQ', async () => {
  const fetch = createFixtureSource([
    { _id: 'a', _type: 't', n: 1 },
    { _id: 'b', _type: 't', n: 2 },
  ]);
  expect(await fetch('*[_type=="t"] | order(n desc).n')).toEqual([2, 1]);
});

test('fixture source ignores drafts', async () => {
  const fetch = createFixtureSource([
    { _id: 'homePage', _type: 'homePage', title: 'pub' },
    { _id: 'drafts.homePage', _type: 'homePage', title: 'draft' },
  ]);
  expect(await fetch('*[_id in ["homePage","drafts.homePage"]].title')).toEqual(['pub']);
});

test('fixture source passes params', async () => {
  const fetch = createFixtureSource([{ _id: 'a', _type: 't' }]);
  expect(await fetch('*[_id == $id][0]._type', { id: 'a' })).toBe('t');
});

test('readFixture parses NDJSON and skips blank lines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fixture-'));
  const file = join(dir, 'dataset.ndjson');
  writeFileSync(file, '{"_id":"a","_type":"t"}\n\n{"_id":"b","_type":"t"}\n');
  expect(readFixture(file).map((d) => d._id)).toEqual(['a', 'b']);
});

test('sanity source reports unreachable API', async () => {
  const fetch = createSanitySource({
    fetch: () => Promise.reject(new Error('connect ECONNREFUSED')),
  });
  const err = await fetch('*[_id == "homePage"][0]').catch((e: Error) => e);
  expect(err).toBeInstanceOf(Error);
  expect((err as Error).message).toContain('Sanity:');
  expect((err as Error).message).toContain('ECONNREFUSED');
});
