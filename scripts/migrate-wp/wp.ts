/**
 * Lettura della REST API del WordPress (rggndr.it). I campi ACF arrivano in REST da quando i gruppi
 * hanno "Show in REST API"; `acf_format=standard` dà le immagini come oggetti con url, alt e misure.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const WP = 'https://rggndr.it';

export type WpImage = { id: number; url: string; alt: string; title?: string; width: number; height: number };
export type WpLink = { label?: string; testo?: string; link?: string };
export type WpPage = {
  id: number;
  slug: string;
  title: { rendered: string };
  acf: Record<string, any>;
  yoast_head_json?: { title?: string; description?: string };
};
export type WpProject = WpPage & { featured_media: number };
export type WpMedia = {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: { width: number; height: number };
};

/** Tutto ciò che serve alla migrazione, letto in una volta (dal vivo o da file registrati). */
export type WpSnapshot = {
  home: WpPage;
  about: WpPage;
  gallery: WpPage;
  projects: WpProject[];
  media: WpMedia[];
  homeHtml: string;
};

const FILES = ['home', 'about', 'gallery', 'projects', 'media'] as const;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${WP}${path}`);
  if (!res.ok) throw new Error(`WordPress ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const page = (slug: string) =>
  get<WpPage[]>(`/wp-json/wp/v2/pages?slug=${slug}&acf_format=standard`).then((r) => {
    if (!r[0]) throw new Error(`WordPress: manca la pagina ${slug}`);
    return r[0];
  });

export async function fetchSnapshot(): Promise<WpSnapshot> {
  const [home, about, gallery, projects, homeHtml] = await Promise.all([
    page('homepage'),
    page('about'),
    page('gallery'),
    // menu_order non è ammesso in REST: l'ordine della home attuale coincide con la data crescente
    get<WpProject[]>('/wp-json/wp/v2/progetto?per_page=100&acf_format=standard&orderby=date&order=asc'),
    fetch(`${WP}/`).then((r) => r.text()),
  ]);
  const ids = projects.map((p) => p.featured_media).filter(Boolean);
  const media = ids.length ? await get<WpMedia[]>(`/wp-json/wp/v2/media?per_page=100&include=${ids.join(',')}`) : [];
  return { home, about, gallery, projects, media, homeHtml };
}

export function writeSnapshot(dir: string, snap: WpSnapshot) {
  mkdirSync(dir, { recursive: true });
  for (const f of FILES) writeFileSync(join(dir, `${f}.json`), JSON.stringify(snap[f], null, 2) + '\n');
  writeFileSync(join(dir, 'home.html'), snap.homeHtml);
}

export function readSnapshot(dir: string): WpSnapshot {
  const read = (f: string) => JSON.parse(readFileSync(join(dir, `${f}.json`), 'utf8'));
  return {
    home: read('home'),
    about: read('about'),
    gallery: read('gallery'),
    projects: read('projects'),
    media: read('media'),
    homeHtml: readFileSync(join(dir, 'home.html'), 'utf8'),
  };
}
