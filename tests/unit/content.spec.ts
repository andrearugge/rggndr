import { expect, test } from '@playwright/test';
import { getHome } from '../../src/content/home';
import { getSite } from '../../src/content/site';
import { createFixtureSource, readFixture, type SanityDocumentLike } from '../../src/content/source';

const DATASET = readFixture('tests/fixtures/dataset.ndjson');
const withDocs = (...docs: SanityDocumentLike[]) => createFixtureSource([...DATASET, ...docs]);
const without = (id: string) => createFixtureSource(DATASET.filter((d) => d._id !== id));

const cover = (id: string) => ({ _type: 'imageWithAlt', asset: { _ref: `image-${id}-10x10-jpg` }, alt: id });

test('getHome skips unpublished projects', async () => {
  const home = DATASET.find((d) => d._id === 'homePage')!;
  const fetch = createFixtureSource([
    {
      ...home,
      projects: [
        { _key: 'a', _ref: 'project-a' },
        { _key: 'x', _ref: 'project-x' },
      ],
    },
    { _id: 'project-a', _type: 'project', title: 'A', slug: { current: 'a' }, year: '2025', cover: cover('a') },
    { _id: 'drafts.project-x', _type: 'project', title: 'X', slug: { current: 'x' }, cover: cover('x') },
  ]);
  expect((await getHome(fetch)).projects.map((p) => p.title)).toEqual(['A']);
});

test('getHome fails without homePage', async () => {
  await expect(getHome(without('homePage'))).rejects.toThrow('manca il documento homePage');
});

test('getHome ignores the draft homePage', async () => {
  expect((await getHome(withDocs())).hero.line1).toBe('Andrea Ruggeri');
});

test('getSite fails without siteSettings', async () => {
  await expect(getSite(without('siteSettings'))).rejects.toThrow('manca il documento siteSettings');
});

test('getSite builds tel href', async () => {
  const site = await getSite(withDocs());
  expect(site.phone).toBe('(+39) 393 857 6657');
  expect(site.phoneHref).toBe('tel:+393938576657');
});
