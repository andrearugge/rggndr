/**
 * Query GROQ del sito. TypeGen (npm run typegen) ne ricava i tipi dei risultati in sanity.types.ts:
 * dopo ogni modifica a una query o agli schemi va rieseguito (la CI controlla che i tipi siano aggiornati).
 */
import { defineQuery } from 'groq';

export const SITE_QUERY = defineQuery(`*[_id == "siteSettings"][0]{ name }`);

export const HOME_QUERY = defineQuery(`*[_id == "homePage"][0]{ _id }`);

export const GALLERY_QUERY = defineQuery(`*[_id == "gallery"][0]{ _id }`);
