/**
 * Query GROQ del sito. TypeGen (npm run typegen) ne ricava i tipi dei risultati in sanity.types.ts:
 * dopo ogni modifica a una query o agli schemi va rieseguito (la CI controlla che i tipi siano aggiornati).
 */
import { defineQuery } from 'groq';

export const SITE_QUERY = defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
  name, description, email, phone, copyright,
  socials[]{ label, url }
}`);

export const HOME_QUERY = defineQuery(`*[_type == "homePage" && _id == "homePage"][0]{
  hero,
  linkColumns[]{ _key, title, items[]{ _key, label, url } },
  manifesto,
  "projects": projects[]->{ title, "slug": slug.current, year, cover }
}`);

export const GALLERY_QUERY = defineQuery(`*[_type == "gallery" && _id == "gallery"][0]{
  items[]{ _key, title, image }
}`);
