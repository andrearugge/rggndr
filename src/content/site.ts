/** Contenuti comuni a tutto il sito, dal documento `siteSettings` di Sanity. */
import { SITE_QUERY } from './queries';
import type { SITE_QUERY_RESULT } from './sanity.types';
import { fetchQuery, type Fetch } from './source';

export interface Social {
  label: string;
  href: string;
}

export interface Site {
  name: string;
  description: string;
  email: string;
  phone: string;
  /** `tel:` con le sole cifre e il `+` di `phone`. */
  phoneHref: string;
  copyright: string;
  socials: Social[];
  /** Dalla voce "Instagram" dei social: serve alla card del footer. */
  instagram?: { href: string; handle: string };
}

export async function getSite(fetch: Fetch = fetchQuery): Promise<Site> {
  const doc = await fetch<SITE_QUERY_RESULT>(SITE_QUERY);
  if (!doc) throw new Error('Sanity: manca il documento siteSettings');

  const socials = (doc.socials ?? [])
    .filter((s): s is { label: string; url: string } => !!s.label && !!s.url)
    .map((s) => ({ label: s.label, href: s.url }));
  const ig = socials.find((s) => s.label.toLowerCase() === 'instagram');
  const phone = doc.phone ?? '';

  return {
    name: doc.name ?? '',
    description: doc.description ?? '',
    email: doc.email ?? '',
    phone,
    phoneHref: `tel:${phone.replace(/[^\d+]/g, '')}`,
    copyright: doc.copyright ?? '',
    socials,
    ...(ig
      ? { instagram: { href: ig.href, handle: new URL(ig.href).pathname.split('/').filter(Boolean).pop() ?? '' } }
      : {}),
  };
}
