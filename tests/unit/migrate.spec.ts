import { expect, test } from '@playwright/test';
import { htmlToBlocks } from '../../scripts/migrate-wp/html-to-pt';
import { toNdjson, transform } from '../../scripts/migrate-wp/transform';
import { readSnapshot } from '../../scripts/migrate-wp/wp';

const SNAP = readSnapshot('tests/unit/fixtures/wp');
type Doc = Record<string, any>;
const byId = (docs: Doc[], id: string) => docs.find((d) => d._id === id)!;
const text = (blocks: Doc[]) => blocks.map((b) => b.children.map((c: Doc) => c.text).join('')).join('\n\n');

test('htmlToBlocks: paragraphs, marks, line breaks and links', () => {
  const { blocks, warnings } = htmlToBlocks('<p>A <b>B</b><br>C <a href="https://x.y">D</a></p><p>E</p>', 'k');
  expect(warnings).toEqual([]);
  expect(blocks).toHaveLength(2);
  const [first] = blocks;
  expect(first.children.map((c) => [c.text, c.marks])).toEqual([
    ['A ', []],
    ['B', ['strong']],
    ['\nC ', []],
    ['D', [first.markDefs![0]._key]],
  ]);
  expect(first.markDefs).toEqual([{ _type: 'link', _key: first.markDefs![0]._key, href: 'https://x.y' }]);
  expect(text([blocks[1]])).toBe('E');
});

test('htmlToBlocks: bare text, entities and WordPress line endings', () => {
  const { blocks } = htmlToBlocks('Andrea<br />\r\nA.K.A. Rugge &amp; co.<br />\r\n33 years old ', 'k');
  expect(blocks).toHaveLength(1);
  expect(text(blocks)).toBe('Andrea\nA.K.A. Rugge & co.\n33 years old');
});

test('htmlToBlocks: unknown tags are flattened and reported', () => {
  const { blocks, warnings } = htmlToBlocks('<p><span>X</span></p>', 'k');
  expect(text(blocks)).toBe('X');
  expect(warnings.join()).toContain('span');
});

test('transform: home', () => {
  const { docs } = transform(SNAP);
  const home = byId(docs, 'homePage');
  expect(text(home.hero.subtitle)).toBe(
    'Combining creativity with strategic thinking to shape purposeful digital products.',
  );
  expect(home.hero.subtitle[0].children.find((c: Doc) => c.marks.includes('strong')).text).toBe(
    'purposeful digital products',
  );
  expect(home.hero.line1).toBe('Andrea Ruggeri');
  expect(home.linkColumns.map((c: Doc) => c.title)).toEqual(['Open info', 'AI Journal', 'Fav readings']);
  expect(home.manifesto.body).toHaveLength(2);
  expect(home.manifesto.alsoText).toBe('KPI6 / Montipadel / Luc.ia / Something cool is brewing');
  expect(home.projects.map((p: Doc) => p._ref)).toEqual([
    'project-ai-journal',
    'project-marklayer',
    'project-beconcept-pantacon-ai-workshop',
    'project-dialetto-libero',
    'project-montipadel',
    'project-beconcept',
    'project-giulia-pampuri',
  ]);
});

test('transform: site settings, about, gallery and projects', () => {
  const { docs } = transform(SNAP);
  const site = byId(docs, 'siteSettings');
  expect(site.umamiId).toBe('5c960479-9c5c-4ee9-9200-7c2bc7612115');
  expect(site.copyright).toBe('©2025 Andrea Ruggeri. All rights reserved.');
  expect(site.phone).toBe('(+39) 393 857 6657');
  expect(site.email).toBe('hello@rggndr.it');

  const about = byId(docs, 'aboutPage');
  expect(text(about.who)).toBe('Andrea Ruggeri\nA.K.A. Rugge.\n33 years old\nItalian, living in Asola (MN).');
  expect(about.work.map((w: Doc) => w.label)).toContain('Montipadel');

  const gallery = byId(docs, 'gallery');
  expect(gallery.items).toHaveLength(14);
  expect(gallery.items[0].title).toBe('Giulia, Lanzarote');

  const journal = byId(docs, 'project-ai-journal');
  expect(journal.slug.current).toBe('ai-journal');
  expect(journal.type).toBe('Personal Project');
  expect(journal.links[0]).toMatchObject({ label: 'Live Website' });
  expect(journal.cover._sanityAsset).toMatch(/^image@https:\/\/rggndr\.it\/wp-content\/uploads\//);

  const blockTypes = new Set(['imageFull', 'imagesSideBySide', 'paragraph', 'video']);
  for (const p of docs.filter((d) => d._type === 'project'))
    for (const b of (p.content as Doc[] | undefined) ?? []) expect(blockTypes.has(b._type)).toBe(true);
});

test('transform: every image has an alt', () => {
  const { docs } = transform(SNAP);
  const images: Doc[] = [];
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      if ('_sanityAsset' in x && String((x as Doc)._sanityAsset).startsWith('image@')) images.push(x as Doc);
      Object.values(x).forEach(walk);
    }
  };
  walk(docs);
  expect(images.length).toBeGreaterThan(20);
  expect(images.filter((i) => !i.alt?.trim())).toEqual([]);
});

test('transform is stable', () => {
  expect(toNdjson(transform(SNAP).docs)).toBe(toNdjson(transform(readSnapshot('tests/unit/fixtures/wp')).docs));
});

test('unknown flexible layout is reported, not dropped silently', () => {
  const snap = structuredClone(SNAP);
  snap.projects[0].acf.contenuto_pagina = [{ acf_fc_layout: 'xyz', mostra_sezione: true }];
  const { warnings } = transform(snap);
  expect(warnings.join('\n')).toMatch(/ai-journal.*xyz/);
});
