# rggndr.it v2

Il nuovo sito personale di Andrea Ruggeri: una bio, non un sito professionale. Sostituisce il WordPress in `../rggndr-website`, live su https://rggndr.it.

- **Stack:** Astro 7 statico, Tailwind CSS v4, GSAP + ScrollTrigger, Lenis.
- **Pubblicazione:** Cloudflare Pages (produzione su `master`, anteprima per ogni branch, `noindex` su tutti gli host `pages.dev`).
- **Contenuti:** Sanity (progetto `9skjzcft`, dataset `production` pubblico), Studio su https://rggndr.sanity.studio con il codice in `studio/`. Una pubblicazione nello Studio ricostruisce il sito da sola (webhook → deploy hook di Cloudflare, circa un minuto). Dettagli in `docs/sanity.md`.
- **Roadmap e decisioni prese:** `docs/superpowers/plans/2026-11-16-roadmap-v1-v2.md`. Lo spec del lab è in `docs/superpowers/specs/`.

## Regole di design (vincolanti)

- **Palette:** solo i token in `src/styles/global.css` (primary `#898d7f`, white, cream, background). Le palette di default di Tailwind sono disattivate. **Niente nero, da nessuna parte.**
- **Tipografia:** tutto maiuscolo. Montreal per il testo, Compact per i titoli, scala `h1`–`h6` in `global.css`. **Editorial solo nella card del footer.**
- **Fedeltà:** le pagine replicano fedelmente il sito attuale. Si cambia solo ciò che Andrea ha chiesto.
- **Animazioni:** "il più pulite e precise possibile". Si verificano frame per frame: niente scatti, pause o salti. Con `prefers-reduced-motion` non ci sono animazioni.
- **Contenuti:** il testo è sempre nell'HTML, leggibile senza JS e indicizzabile. Gli stati nascosti in attesa di JS hanno sempre un paracadute CSS.

## Scelte di motion (in produzione)

| Elemento | Scelta |
|---|---|
| Reveal on scroll | **Soft** (`src/lib/reveal.ts`) |
| Righe dei testi | Divise da `src/lib/split-lines.ts`, misurate dal browser. Non usare SplitText |
| Intro dell'hero | Quella attuale (`src/lib/hero-intro.ts`) |
| Loader | Monogram **Rullo**, compatto (`src/lib/monogram.ts` + `src/lib/loader.ts`). Una volta per sessione (`sessionStorage`, classe `loader-seen` messa nel `<head>`) |
| Gallery | Slider infinito alla Bruno Arizio (`src/lib/gallery.ts`, `src/components/site/Gallery.astro`): miniatura attiva allineata al titolo, stacco netto sulla foto grande, cornice primary al 10%, slider a tutta larghezza |
| Card del footer | In codice, versione originale, inclinazione massima 5° (`src/components/site/Card.astro`, `src/lib/card.ts`). Motto e orari con `pointer-events: none` |
| Simbolo del footer | Un giro mentre il footer attraversa lo schermo (`src/lib/footer.ts`) |

`src/lib/site.ts` monta il motion comune (smooth scroll, reveal, footer) sulle pagine a scorrimento.

## Struttura

- `src/pages/`: pagine pubblicate (`/`, `/gallery/`). Indirizzi con la barra finale (`trailingSlash: 'always'`).
- `src/components/site/`: componenti. `src/lib/`: motion e logica. `src/content/`: adattatore Sanity (query GROQ in `queries.ts`, tipi generati in `sanity.types.ts`, immagini in `image.ts`). Si legge solo in fase di build, con `fetchQuery` (`source.ts`).
- `studio/`: Sanity Studio, pacchetto npm separato (non un workspace). `scripts/migrate-wp/`: migrazione dal WordPress.
- `src/lab/`: utility interna (pagine di prova per i test). Entra solo con `astro dev` o `LAB=1` (`integrations/lab.mjs`); `scripts/check-dist.mjs` verifica che la build di produzione non la contenga.

## Comandi

- `npm run dev`: sviluppo su http://localhost:4321 (spesso c'è già un server di Andrea su 4321).
- `npm run build`, `npm run preview`.
- `npm test`: Playwright. Costruisce con `LAB=1` e `CONTENT_SOURCE=fixture` e serve su **porta 4329** con `--ignore-lock`, così non va in conflitto con il server di Andrea. Per i test che non riguardano il loader usare `skipLoader` (`tests/helpers.ts`). Importare `test` ed `expect` da `./helpers`, e creare i contesti con `newContext(browser, …)`: servono le immagini del dataset di prova dai file locali.
- `npm run test:unit`: test senza browser (adattatori, immagini, migrazione), `playwright.unit.config.ts`.
- `npm run typegen`: rigenera i tipi delle query dopo una modifica a schemi o query. `npm run studio`: Studio in locale. `npm run migrate:wp`: migrazione dal WordPress (vedi `docs/sanity.md`).
- `npm run typecheck`: `astro check` con `@astrojs/check` installato, quindi senza prompt. **Non usare `npx astro check`.**
- `npm run format` / `format:check`: Prettier.
- `npm run check`: tipi, formattazione, build (sul dataset vero), `check-dist`, test unitari e test. È quello che esegue la CI (`.github/workflows/ci.yml`) a ogni push e PR.

## Modo di lavorare

- **TDD con Playwright:** prima il test, verificare che fallisca, poi il codice. Per il motion si registrano i frame (`requestAnimationFrame`) e si verificano tempi, posizioni e assenza di stati intermedi.
- **Test ripetuti:** dopo ogni cambio di motion, eseguire i test con `--repeat-each 3`. I problemi di tempistica emergono solo in parallelo.
- **Controllo visivo:** screenshot o frame in Playwright, da guardare prima di dichiarare finito.
- **Lingua:** commenti nel codice e messaggi di commit in italiano. Con Andrea si parla in italiano.
- **Branch:** una milestone, un branch (`feat/m1-…`), merge in `master` quando è pronta.
- **Commit:** frequenti e piccoli. Merge e push solo su richiesta di Andrea.

## Attenzioni tecniche emerse

- **Contenuti nei test:** i test leggono `tests/fixtures/dataset.ndjson` (valutato con `groq-js`), mai Sanity: una modifica nello Studio non rompe la CI. Le immagini di prova hanno asset `fixture…`, e `check-dist` rifiuta una build di produzione che li contiene.

- **GSAP e `translate`:** se un elemento ha un `translate` CSS, GSAP lo assorbe in `y`. Prima si toglie lo stato CSS, poi `gsap.set({ y: 0, yPercent })`.
- **Font:** le misure (maschere delle lettere, larghezze) vanno prese a font caricati (`fontsReady` in `src/lib/motion.ts`). Editorial si carica a parte.
- **Proprietà `rotate` CSS:** è separata da `transform`. Per misurare un elemento "dritto" vanno azzerate entrambe.
- **Unità `cqw`:** dentro un elemento che è esso stesso container si riferiscono al container antenato.
- **Contenitori con `overflow: hidden`:** il browser può farli scorrere da solo (focus, `scrollIntoView`). Va bloccato se la posizione la decide il JS (vedi la gallery).
