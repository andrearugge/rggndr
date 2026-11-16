/**
 * Risposte di WordPress → documenti Sanity (schemi in studio/schemaTypes).
 * Id e _key dipendono solo dai dati, quindi due esecuzioni danno lo stesso NDJSON: con
 * `sanity dataset import --missing` i documenti già presenti non vengono toccati.
 * Le immagini restano agli URL di WordPress (`_sanityAsset`): le scarica `sanity dataset import`.
 */
import { parse } from 'node-html-parser';
import { htmlToBlocks, type Block } from './html-to-pt.ts';
import type { WpImage, WpLink, WpMedia, WpPage, WpSnapshot } from './wp.ts';

type Doc = { _id: string; _type: string; [field: string]: unknown };
type Img = { _type: 'imageWithAlt'; _sanityAsset: string; alt: string };

// Righe e note dell'hero: in WordPress erano scritte nel template, non in ACF.
const HERO = {
  line1: 'Andrea Ruggeri',
  line2: 'Design-driven entrepreneur',
  line3: 'Who generally crafts',
  line4: 'W** products',
  line5: 'digital Experiences.',
  note1: ['12 may', '1992'],
  note2: ['Italian', 'Left handed'],
  note3: ['Based on', 'weather'],
};

/** Testo semplice: entità decodificate e spazi come nell'HTML. */
const plain = (s: unknown) => (typeof s === 'string' ? parse(s).text.replace(/\s+/g, ' ').trim() : '');

export function transform(wp: WpSnapshot): { docs: Doc[]; warnings: string[] } {
  const warnings: string[] = [];

  const rich = (html: unknown, key: string, where: string): Block[] | undefined => {
    if (typeof html !== 'string' || !html.trim()) return undefined;
    const { blocks, warnings: w } = htmlToBlocks(html, key);
    warnings.push(...w.map((x) => `${where}: ${x}`));
    return blocks;
  };

  const image = (img: WpImage | false | null | undefined, fallbackAlt: string, where: string): Img | undefined => {
    if (!img || !img.url) return undefined;
    let alt = plain(img.alt);
    if (!alt) {
      alt = fallbackAlt;
      warnings.push(`${where}: alt mancante in WordPress, uso "${fallbackAlt}"`);
    }
    return { _type: 'imageWithAlt', _sanityAsset: `image@${img.url}`, alt };
  };

  const links = (items: WpLink[] | false | null | undefined, key: string) =>
    (items || [])
      .map((l, i) => {
        const label = plain(l.label ?? l.testo);
        const url = (l.link ?? '').trim();
        return label ? { _type: 'link', _key: `${key}-${i}`, label, ...(url ? { url } : {}) } : null;
      })
      .filter(Boolean);

  const seo = (p: WpPage) => {
    const title = plain(p.yoast_head_json?.title);
    const description = plain(p.yoast_head_json?.description);
    return title || description
      ? { _type: 'seo', ...(title ? { title } : {}), ...(description ? { description } : {}) }
      : undefined;
  };

  /** Toglie i campi vuoti: in Sanity un campo assente e uno vuoto non sono la stessa cosa. */
  const omitEmpty = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;

  // --- impostazioni del sito
  const home = wp.home.acf;
  const about = wp.about.acf;
  const umamiId = wp.homeHtml.match(/data-website-id="([^"]+)"/)?.[1];
  if (!umamiId) warnings.push('siteSettings: Umami ID non trovato nella home');
  const firstLabel = (items: WpLink[] | false) => plain((items || [])[0]?.label);

  const siteSettings: Doc = omitEmpty({
    _id: 'siteSettings',
    _type: 'siteSettings',
    name: 'Andrea Ruggeri',
    description: plain(wp.home.yoast_head_json?.description),
    socials: links(about.intro_social, 'social'),
    email: firstLabel(about.intro_email),
    phone: firstLabel(about.intro_telefono),
    copyright: plain(home.copyright_footer),
    umamiId,
  });

  // --- progetti (nell'ordine della home)
  const media = new Map<number, WpMedia>(wp.media.map((m) => [m.id, m]));
  const projects: Doc[] = wp.projects.map((p) => {
    const title = plain(p.title.rendered);
    const where = `progetto ${p.slug}`;
    const m = media.get(p.featured_media);
    if (!m) warnings.push(`${where}: manca l'immagine in evidenza`);
    const cover = m
      ? image(
          {
            id: m.id,
            url: m.source_url,
            alt: m.alt_text,
            width: m.media_details.width,
            height: m.media_details.height,
          },
          title,
          `${where}, copertina`,
        )
      : undefined;

    const content = ((p.acf.contenuto_pagina || []) as Record<string, any>[]).flatMap((b, i): object[] => {
      const key = `c${i}`;
      const hidden = b.mostra_sezione === false;
      const at = `${where}, blocco ${i + 1}`;
      switch (b.acf_fc_layout) {
        case 'immagine_full': {
          const img = image(b.immagine, title, at);
          return img
            ? [omitEmpty({ _type: 'imageFull', _key: key, image: img, caption: plain(b.caption), hidden })]
            : [];
        }
        case 'immagini_affiancate': {
          const imgs = ((b.immagini_repeater || []) as Record<string, any>[])
            .map((r, j) => image(r.img, title, `${at}, immagine ${j + 1}`))
            .filter(Boolean)
            .map((img, j) => ({ ...img, _key: `${key}-${j}` }));
          const adv = b.impostazioni_avanzate || {};
          const height = adv.button_h === 'custom' && Number(adv.custom_h) > 0 ? Number(adv.custom_h) : undefined;
          return [
            omitEmpty({
              _type: 'imagesSideBySide',
              _key: key,
              images: imgs,
              caption: plain(b.caption),
              height,
              hidden,
            }),
          ];
        }
        case 'paragrafo': {
          const variant =
            b.personalizza_paragrafo === 'con-titolo'
              ? 'withTitle'
              : b.personalizza_paragrafo === 'titolo-piu-sottotitolo'
                ? 'titleSubtitle'
                : 'plain';
          return [
            omitEmpty({
              _type: 'paragraph',
              _key: key,
              variant,
              title: plain(b.titolo),
              subtitle: plain(b.ilsottotitolo),
              text: rich(b.testo, `${key}-t`, at),
              hidden,
            }),
          ];
        }
        case 'video_full': {
          const src = String(b.sorgente_video ?? '').toLowerCase();
          const source = /yt|youtube/.test(src) ? 'youtube' : /vimeo/.test(src) ? 'vimeo' : 'file';
          const file = (f: unknown) =>
            f && typeof f === 'object' && 'url' in f
              ? { _type: 'file', _sanityAsset: `file@${(f as WpImage).url}` }
              : undefined;
          return [
            omitEmpty({
              _type: 'video',
              _key: key,
              source,
              url: source === 'youtube' ? b.yt_embed : source === 'vimeo' ? b.vimeo_embed : undefined,
              mp4: source === 'file' ? file(b.self_mp4) : undefined,
              webm: source === 'file' ? file(b.self_webm) : undefined,
              hidden,
            }),
          ];
        }
        default:
          warnings.push(`${where}: layout "${b.acf_fc_layout}" non gestito, blocco ${i + 1} saltato`);
          return [];
      }
    });

    return omitEmpty({
      _id: `project-${p.slug}`,
      _type: 'project',
      title,
      slug: { _type: 'slug', current: p.slug },
      year: plain(p.acf.anno_progetto),
      type: plain(p.acf.tipo_progetto),
      description: rich(p.acf.descrizione_progetto, 'desc', where),
      links: links(p.acf.link_progetto, 'link'),
      cover,
      content,
      seo: seo(p),
    });
  });

  // --- home
  const column = (title: unknown, items: WpLink[], key: string) => ({
    _type: 'linkColumn',
    _key: key,
    title: plain(title),
    items: links(items, `${key}-i`),
  });
  const homePage: Doc = omitEmpty({
    _id: 'homePage',
    _type: 'homePage',
    hero: { ...HERO, subtitle: rich(home.hero_sublabel, 'sub', 'home, sottotitolo') },
    linkColumns: [
      column(home.links_one_titolo, home.links_link_one, 'col0'),
      column(home.links_two_titolo, home.links_link_two, 'col1'),
      column(home.links_three_titolo, home.links_link_three, 'col2'),
    ],
    manifesto: {
      kicker: plain(home.manifesto_titolino),
      body: rich(home.manifesto_contenuto, 'man', 'home, manifesto'),
      alsoTitle: plain(home.manifesto_sottotitolo_one),
      alsoText: plain(home.manifesto_sottotitolo_two),
    },
    projects: projects.map((p) => ({ _type: 'reference', _key: p._id, _ref: p._id })),
    seo: seo(wp.home),
  });

  // --- about
  const aboutPage: Doc = omitEmpty({
    _id: 'aboutPage',
    _type: 'aboutPage',
    who: rich(about.intro_presentazione, 'who', 'about, who'),
    image: image(about.intro_immagine, 'Andrea Ruggeri', 'about, immagine'),
    work: links(about.intro_work, 'work'),
    emails: links(about.intro_email, 'email'),
    phones: links(about.intro_telefono, 'phone'),
    socials: links(about.intro_social, 'social'),
    descriptionKicker: plain(about.descrizione_titolino),
    description: rich(about.descrizione_contenuto, 'desc', 'about, descrizione'),
    seo: seo(wp.about),
  });

  // --- gallery
  const gallery: Doc = omitEmpty({
    _id: 'gallery',
    _type: 'gallery',
    items: ((wp.gallery.acf.gallery_elementi || []) as Record<string, any>[]).map((e, i) => {
      const title = plain(e.titolo);
      return { _type: 'galleryItem', _key: `g${i}`, title, image: image(e.immagine, title, `gallery, foto ${i + 1}`) };
    }),
    seo: seo(wp.gallery),
  });

  return { docs: [siteSettings, homePage, aboutPage, gallery, ...projects], warnings };
}

export const toNdjson = (docs: Doc[]) => docs.map((d) => JSON.stringify(d)).join('\n') + '\n';
