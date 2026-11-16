# rggndr.it v2

Il nuovo sito personale di Andrea Ruggeri: una bio, non un sito professionale. Sostituisce il WordPress in `../rggndr-website`, live su https://rggndr.it.

- **Stack:** Astro 7 statico, Tailwind CSS v4, GSAP + ScrollTrigger, Lenis.
- **In arrivo:** Sanity (M1) e pubblicazione su Cloudflare Pages.
- **Roadmap e decisioni prese:** `docs/superpowers/plans/2026-11-16-roadmap-v1-v2.md`. Lo spec del lab è in `docs/superpowers/specs/`.

## Regole di design (vincolanti)

- **Palette:** solo i token in `src/styles/global.css` (primary `#898d7f`, white, cream, background). Le palette di default di Tailwind sono disattivate. **Niente nero, da nessuna parte.**
- **Tipografia:** tutto maiuscolo. Montreal per il testo, Compact per i titoli, scala `h1`–`h6` in `global.css`. **Editorial solo nella card del footer.**
- **Fedeltà:** le pagine replicano fedelmente il sito attuale. Si cambia solo ciò che Andrea ha chiesto.
- **Animazioni:** "il più pulite e precise possibile". Si verificano frame per frame: niente scatti, pause o salti. Con `prefers-reduced-motion` non ci sono animazioni.
- **Contenuti:** il testo è sempre nell'HTML, leggibile senza JS e indicizzabile. Gli stati nascosti in attesa di JS hanno sempre un paracadute CSS.

## Scelte del lab (da portare in produzione)

| Elemento | Scelta |
|---|---|
| Reveal on scroll | **Soft** (`src/lib/reveal.ts`) |
| Righe dei testi | Divise da `src/lib/split-lines.ts`, misurate dal browser. Non usare SplitText |
| Intro dell'hero | Quella attuale (`src/lib/hero-intro.ts`) |
| Loader | Monogram, concept **Rullo**, compatto (`src/lib/monogram-concepts.ts` + `src/lib/loader.ts`). Una volta per sessione |
| Gallery | Slider infinito alla Bruno Arizio (`src/lib/gallery.ts`, `src/components/site/Gallery.astro`): miniatura attiva allineata al titolo, stacco netto sulla foto grande, cornice primary al 10%, slider a tutta larghezza |
| Card del footer | In codice, versione originale, inclinazione massima 5° (`src/components/site/Card.astro`, `src/lib/card.ts`). Motto e orari con `pointer-events: none` |

Le varianti non scelte sono ancora nel lab e vanno tolte in M0: reveal Mask, Wipe e Scrub; loader Classic, Slot e Bands; gli altri concept del monogram; la pagina dei timing.

## Comandi

- `npm run dev`: sviluppo su http://localhost:4321 (spesso c'è già un server di Andrea su 4321).
- `npm run build`, `npm run preview`.
- `npm test`: Playwright. Costruisce e serve su **porta 4329** con `--ignore-lock`, così non va in conflitto con il server di Andrea.
- **Non usare `npx astro check`:** si blocca su un prompt interattivo. Per i tipi, installare `@astrojs/check` come dipendenza (previsto in M0).

## Modo di lavorare

- **TDD con Playwright:** prima il test, verificare che fallisca, poi il codice. Per il motion si registrano i frame (`requestAnimationFrame`) e si verificano tempi, posizioni e assenza di stati intermedi.
- **Test ripetuti:** dopo ogni cambio di motion, eseguire i test con `--repeat-each 3`. I problemi di tempistica emergono solo in parallelo.
- **Controllo visivo:** screenshot o frame in Playwright, da guardare prima di dichiarare finito.
- **Lingua:** commenti nel codice e messaggi di commit in italiano. Con Andrea si parla in italiano.
- **Commit:** frequenti e piccoli. Merge e push solo su richiesta di Andrea.

## Attenzioni tecniche emerse

- **GSAP e `translate`:** se un elemento ha un `translate` CSS, GSAP lo assorbe in `y`. Prima si toglie lo stato CSS, poi `gsap.set({ y: 0, yPercent })`.
- **Font:** le misure (maschere delle lettere, larghezze) vanno prese a font caricati (`fontsReady` in `src/lib/motion.ts`). Editorial si carica a parte.
- **Proprietà `rotate` CSS:** è separata da `transform`. Per misurare un elemento "dritto" vanno azzerate entrambe.
- **Unità `cqw`:** dentro un elemento che è esso stesso container si riferiscono al container antenato.
- **Contenitori con `overflow: hidden`:** il browser può farli scorrere da solo (focus, `scrollIntoView`). Va bloccato se la posizione la decide il JS (vedi la gallery).
