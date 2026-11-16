/**
 * Attributi di <img> per un'immagine di Sanity, serviti dal suo CDN in formato automatico (AVIF/WebP).
 * Larghezza e altezza sono quelle naturali, lette dal riferimento dell'asset (image-<id>-<w>x<h>-<fmt>):
 * il browser riserva lo spazio giusto prima del caricamento, senza salti di layout.
 */
import { createImageUrlBuilder } from '@sanity/image-url';
import { SANITY } from './sanity';

export type SanityImage = { asset?: { _ref: string } | null; alt?: string | null };

export type ImageAttrs = {
  src: string;
  srcset?: string;
  sizes?: string;
  width: number;
  height: number;
  alt: string;
};

const builder = createImageUrlBuilder({ projectId: SANITY.projectId, dataset: SANITY.dataset });

export function imageAttrs(
  image: SanityImage | null | undefined,
  opts: { width: number; widths?: number[]; sizes?: string },
): ImageAttrs {
  const ref = image?.asset?._ref;
  const size = ref?.match(/^image-[^-]+-(\d+)x(\d+)-[a-z0-9]+$/);
  if (!ref || !size) throw new Error(`Immagine senza asset valido: ${JSON.stringify(image)}`);
  if (!image.alt?.trim()) throw new Error(`Immagine senza alt: ${ref}`);

  const width = Number(size[1]);
  const height = Number(size[2]);
  const url = (w: number) => builder.image(ref).width(w).auto('format').url();
  const widths = opts.widths?.filter((w) => w <= width);

  return {
    src: url(Math.min(opts.width, width)),
    ...(widths?.length ? { srcset: widths.map((w) => `${url(w)} ${w}w`).join(', ') } : {}),
    ...(opts.sizes ? { sizes: opts.sizes } : {}),
    width,
    height,
    alt: image.alt,
  };
}
