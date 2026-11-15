# rggndr.it v2 — Stack e Lab di sperimentazione

## Intento
Rifare rggndr.it (oggi WordPress, repo `rggndr-website`) con uno stack più veloce e più indicizzabile, mantenendo identità visiva (tipografia, palette, hero, navbar, footer, concept del loader) e alzando la qualità del motion. Prima del sito vero: una fase di test ("lab") per scegliere gli effetti.

## Obiettivi
- Sito velocissimo e SEO-first (HTML statico, JS solo dove serve).
- Tutto su piani free.
- Lab per valutare più opzioni su: reveal testi/immagini, intro/loader, gallery, card SVG del footer.
- Fix del bug di a-capo dei paragrafi con SplitText.

## Non-obiettivi (per ora)
- Pagina "Metodo" (v2, dopo un'intervista).
- Migrazione contenuti da WordPress e setup Sanity: dopo il lab.

## Anti-obiettivi
- Cambiare tipografia o palette.
- Motion che pesa sulla performance o rompe l'indicizzazione (testo sempre nel DOM, leggibile senza JS).

## Approcci considerati
| Approccio | Pro | Contro |
|---|---|---|
| **Astro 5 + Sanity + GSAP/Lenis** (scelto) | HTML statico, zero JS di default, isole per componenti interattivi, View Transitions per navigazione persistente | Navigazione persistente un po' meno "nativa" di un'app React |
| Next.js (App Router) + Sanity | Shell persistente nativa, ecosistema React (R3F) | Runtime React ~90KB sempre caricato, overkill per un sito di contenuto |
| Test via artefatti HTML | Rapidi da condividere | Niente font reali (licenze), motion non giudicabile fedelmente, lavoro da rifare |

Scelto da Andrea: Astro + Sanity + GSAP/Lenis, test direttamente nel codice in `/lab`.

## Decisioni
- **Frontend:** Astro 5, output statico, `<ClientRouter />` per View Transitions (loader solo alla prima visita, header/footer persistenti).
- **Styling:** Tailwind CSS v4, token dal sito attuale: `primary #898D7F`, `background #F9F9F8`.
- **Font:** self-hosted in `public/fonts` (scaricati dal sito live): Compact Black, Montreal Regular/Bold, Editorial Regular. `font-display: swap` + preload dei font above-the-fold.
- **Motion:** GSAP 3.13+ (SplitText con `autoSplit`/`onSplit`, split solo dopo `document.fonts.ready`), Lenis per smooth scroll, `prefers-reduced-motion` rispettato.
- **Card footer:** isola dedicata; varianti CSS 3D e WebGL (OGL/Three) da confrontare.
- **CMS:** Sanity free (dopo il lab). Rebuild via webhook.
- **Hosting:** Cloudflare Pages (free, uso commerciale consentito).

## Lab
- `/lab` indice; una pagina per esperimento: `/lab/reveal`, `/lab/loader`, `/lab/gallery`, `/lab/card`.
- Ogni pagina mostra più varianti affiancate o selezionabili (switcher), con contenuti finti ma tipografia e palette reali.
- Ordine: reveal → loader → gallery → card.
- `/lab` escluso dall'indicizzazione (`noindex`) e rimosso o protetto prima del go-live.

## Lasciato a chi costruisce
- Struttura cartelle e componenti, versioni esatte delle dipendenze, dettagli delle singole varianti (da proporre e iterare con Andrea).
