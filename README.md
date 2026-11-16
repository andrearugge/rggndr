# rggndr.it

Il sito personale di Andrea Ruggeri: Astro statico, Tailwind CSS v4, GSAP + ScrollTrigger, Lenis, contenuti in Sanity
([docs/sanity.md](docs/sanity.md)).
Regole di design e modo di lavorare in [CLAUDE.md](CLAUDE.md); milestone e decisioni nella
[roadmap](docs/superpowers/plans/2026-11-16-roadmap-v1-v2.md).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm install` | Installa le dipendenze (Node indicato in `.nvmrc`) |
| `npm run dev` | Sviluppo su http://localhost:4321, lab compreso (`/lab/`) |
| `npm run build` | Build di produzione in `dist/`, senza lab |
| `npm run preview` | Serve `dist/` |
| `npm run typecheck` | Controllo dei tipi (`astro check`, senza prompt) |
| `npm run format` | Formatta con Prettier |
| `npm test` | Playwright: costruisce con `LAB=1` sul dataset di prova e serve sulla porta 4329 |
| `npm run test:unit` | Test senza browser: adattatori, immagini, migrazione |
| `npm run typegen` | Rigenera i tipi delle query Sanity (`src/content/sanity.types.ts`) |
| `npm run studio` | Sanity Studio in locale (online: https://rggndr.sanity.studio) |
| `npm run migrate:wp` | Migrazione dal WordPress a NDJSON per Sanity |
| `npm run check` | Tipi, formattazione, build, controllo di `dist/` e test: quello che fa la CI |

Lo Studio ha le sue dipendenze: `npm install --prefix studio`.

## Struttura

```text
src/
  components/site/   componenti del sito
  content/           adattatore Sanity: query, tipi generati, immagini, sorgente dei contenuti
  lib/               motion e logica: reveal, loader, monogram, gallery, card, footer, site
  pages/             pagine pubblicate
  lab/               utility interna: entra solo in sviluppo e con LAB=1 (integrations/lab.mjs)
studio/                  Sanity Studio (pacchetto separato)
scripts/check-dist.mjs   verifica che la build di produzione non contenga il lab né il dataset di prova
scripts/migrate-wp/      migrazione dal WordPress
tests/                   Playwright (tests/unit: test senza browser; tests/fixtures: dataset di prova)
```
