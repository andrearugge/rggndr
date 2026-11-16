# rggndr.it

Il sito personale di Andrea Ruggeri: Astro statico, Tailwind CSS v4, GSAP + ScrollTrigger, Lenis.
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
| `npm test` | Playwright: costruisce con `LAB=1` e serve sulla porta 4329 |
| `npm run check` | Tipi, formattazione, build, controllo di `dist/` e test: quello che fa la CI |

## Struttura

```text
src/
  components/site/   componenti del sito
  content/           contenuti (oggi in codice, da M1 adattatore Sanity)
  lib/               motion e logica: reveal, loader, monogram, gallery, card, footer, site
  pages/             pagine pubblicate
  lab/               utility interna: entra solo in sviluppo e con LAB=1 (integrations/lab.mjs)
scripts/check-dist.mjs   verifica che la build di produzione non contenga il lab
tests/                   Playwright
```
