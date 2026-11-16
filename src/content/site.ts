/**
 * Contenuti comuni a tutto il sito. Oggi sono scritti qui; in M1 arriveranno da Sanity (`siteSettings`)
 * e queste funzioni diventeranno l'adattatore, senza cambiare chi le usa.
 */
export interface Social {
  label: string;
  href: string;
}

export interface SiteContent {
  socials: Social[];
}

export function getSite(): SiteContent {
  return {
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/andrearugge/' },
      { label: 'Linkedin', href: 'https://www.linkedin.com/in/andrerugge/' },
      { label: 'Twitter', href: 'https://x.com/andrea_rugge' },
    ],
  };
}
