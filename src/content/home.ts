/** Contenuti della home, dal documento `homePage` di Sanity e dai progetti che seleziona. */
import { imageAttrs, type ImageAttrs } from './image';
import { HOME_QUERY } from './queries';
import type { HOME_QUERY_RESULT, RichText } from './sanity.types';
import { fetchQuery, type Fetch } from './source';

export type { ImageAttrs, RichText };

export interface Hero {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
  note1: string[];
  note2: string[];
  note3: string[];
  subtitle: RichText;
}

export interface LinkColumn {
  key: string;
  title: string;
  items: { key: string; label: string; href?: string }[];
}

export interface Manifesto {
  kicker: string;
  body: RichText;
  alsoTitle: string;
  alsoText: string;
}

export interface ProjectCard {
  title: string;
  slug: string;
  year: string;
  image: ImageAttrs;
}

export interface Home {
  hero: Hero;
  linkColumns: LinkColumn[];
  manifesto: Manifesto;
  projects: ProjectCard[];
}

export async function getHome(fetch: Fetch = fetchQuery): Promise<Home> {
  const doc = await fetch<HOME_QUERY_RESULT>(HOME_QUERY);
  if (!doc) throw new Error('Sanity: manca il documento homePage');
  const hero = doc.hero ?? {};
  const manifesto = doc.manifesto ?? {};

  return {
    hero: {
      line1: hero.line1 ?? '',
      line2: hero.line2 ?? '',
      line3: hero.line3 ?? '',
      line4: hero.line4 ?? '',
      line5: hero.line5 ?? '',
      note1: hero.note1 ?? [],
      note2: hero.note2 ?? [],
      note3: hero.note3 ?? [],
      subtitle: hero.subtitle ?? [],
    },
    linkColumns: (doc.linkColumns ?? []).map((c) => ({
      key: c._key,
      title: c.title ?? '',
      items: (c.items ?? [])
        .filter((i) => i.label)
        .map((i) => ({ key: i._key, label: i.label!, ...(i.url ? { href: i.url } : {}) })),
    })),
    manifesto: {
      kicker: manifesto.kicker ?? '',
      body: manifesto.body ?? [],
      alsoTitle: manifesto.alsoTitle ?? '',
      alsoText: manifesto.alsoText ?? '',
    },
    // un riferimento a un progetto non pubblicato o cancellato si risolve in null: lo si salta
    projects: (doc.projects ?? []).flatMap((p) =>
      p?.title && p.slug
        ? [
            {
              title: p.title,
              slug: p.slug,
              year: p.year ?? '',
              image: imageAttrs(p.cover, {
                width: 1200,
                widths: [400, 800, 1200, 1600],
                sizes: '(min-width: 1024px) 50vw, 100vw',
              }),
            },
          ]
        : [],
    ),
  };
}
