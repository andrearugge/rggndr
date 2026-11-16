/** Foto della gallery, dal documento `gallery` di Sanity, nell'ordine scelto nello Studio. */
import { imageAttrs, type ImageAttrs } from './image';
import { GALLERY_QUERY } from './queries';
import type { GALLERY_QUERY_RESULT } from './sanity.types';
import { fetchQuery, type Fetch } from './source';

export interface GalleryItem {
  key: string;
  title: string;
  /** La foto grande. */
  image: ImageAttrs;
  /** La miniatura nella striscia in basso: stessa immagine, più piccola. */
  thumb: ImageAttrs;
}

export async function getGallery(fetch: Fetch = fetchQuery): Promise<GalleryItem[]> {
  const doc = await fetch<GALLERY_QUERY_RESULT>(GALLERY_QUERY);
  if (!doc) throw new Error('Sanity: manca il documento gallery');
  const items = (doc.items ?? []).filter((i) => i.title && i.image);
  if (!items.length) throw new Error('Sanity: nessuna foto nella gallery');

  return items.map((i) => ({
    key: i._key,
    title: i.title!,
    image: imageAttrs(i.image, { width: 1600, widths: [800, 1200, 1600, 2400], sizes: '50vw' }),
    thumb: imageAttrs(i.image, { width: 300, widths: [150, 300], sizes: '150px' }),
  }));
}
