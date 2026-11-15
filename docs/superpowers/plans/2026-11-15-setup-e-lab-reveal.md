# Setup Astro + Lab Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Progetto Astro funzionante in `rggndr` con font/palette del sito attuale, indice `/lab` e pagina `/lab/reveal` con 4 varianti di reveal (testi + immagini) selezionabili.

**Architecture:** Astro 5 statico. Un solo modulo `src/lib/reveal.ts` espone `initReveals(root, variant)` che legge `data-reveal="text|image"` e applica la variante scelta con GSAP + ScrollTrigger + SplitText. Lo split avviene solo dopo `document.fonts.ready` con `autoSplit: true` (fix a-capo). Lenis per lo smooth scroll.

**Tech Stack:** Astro 5, Tailwind CSS v4 (`@tailwindcss/vite`), GSAP ≥3.13 (SplitText, ScrollTrigger), Lenis, Playwright per smoke test.

**Spec:** `docs/superpowers/specs/2026-11-15-stack-e-lab-design.md`

## Global Constraints
- Colori: `primary #898D7F`, `background #F9F9F8`.
- Font da `public/fonts/`: `Compact` (CompactBlack.woff2, 900), `Montreal` (Montreal-Regular 400, Montreal-Bold 700), `Editorial` (Editorial-Regular 400). `font-display: swap`.
- Testo sempre nel DOM e visibile senza JS (stati iniziali nascosti applicati solo via JS / classe `js` su `<html>`).
- `prefers-reduced-motion: reduce` → nessuna animazione, contenuto visibile.
- Tutte le pagine `/lab/*` hanno `<meta name="robots" content="noindex">`.
- Package manager: npm.

## Review Focus
- Font non ancora caricati al momento dello split → righe calcolate col fallback (il bug attuale). Test: le righe di un paragrafo dopo il load coincidono con quelle senza animazione.
- Resize della finestra → le righe devono ricalcolarsi (`autoSplit`), non restare spezzate male.
- JS disabilitato → tutto il testo e le immagini visibili.
- Reduced motion → tutto visibile subito.
- Cambio variante dallo switcher → le animazioni precedenti vengono distrutte (nessun doppio split, nessun ScrollTrigger orfano).

---

### Task 1: Scaffold Astro + Tailwind + font + layout base

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`
- Create: `src/styles/global.css` (`@import "tailwindcss"`, `@theme` con colori e font, `@font-face`)
- Create: `src/layouts/Base.astro` (props `title: string`, `noindex?: boolean`; preload di Montreal-Regular e CompactBlack; script inline che aggiunge classe `js` a `<html>`)
- Create: `src/pages/index.astro` (placeholder con nome e link a `/lab`)
- Create: `playwright.config.ts`, `tests/smoke.spec.ts`

**Interfaces:**
- Produces: `Base.astro` con props `{ title: string; noindex?: boolean }` e `<slot />`; classi Tailwind `font-compact`, `font-montreal`, `font-editorial`, `bg-background`, `text-primary`.

- [ ] **Step 1:** `npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git` poi `npm i`, `npx astro add tailwind -y`, `npm i -D @playwright/test && npx playwright install chromium`.
- [ ] **Step 2: Test** `tests/smoke.spec.ts` → `home has fonts loaded`: apre `/`, attende `document.fonts.ready`, verifica `document.fonts.check('16px Montreal') === true` e `document.fonts.check('16px Compact') === true`; il body ha background `rgb(249, 249, 248)`.
- [ ] **Step 3:** Esegui `npx playwright test` → FAIL (stili/font assenti).
- [ ] **Step 4:** Implementa `global.css` e `Base.astro`; `playwright.config.ts` con `webServer: npm run build && npm run preview`, port 4321.
- [ ] **Step 5:** `npx playwright test` → PASS; `npm run build` senza errori.
- [ ] **Step 6:** Commit `feat: scaffold Astro + Tailwind v4 + font self-hosted`.

### Task 2: Indice /lab + layout Lab con switcher varianti

**Files:**
- Create: `src/layouts/Lab.astro` (usa `Base` con `noindex`; header con titolo esperimento e switcher)
- Create: `src/components/lab/VariantSwitcher.astro` (props `variants: { id: string; label: string }[]`; aggiorna `?v=<id>` nell'URL e dispatcha `CustomEvent('lab:variant', { detail: id })` su `window`)
- Create: `src/pages/lab/index.astro` (lista: reveal, loader, gallery, card; solo reveal attivo, gli altri "presto")
- Test: `tests/lab.spec.ts`

**Interfaces:**
- Produces: evento `lab:variant` con `detail: string`; helper `getVariant(defaultId: string): string` in `src/lib/lab.ts` che legge `?v=`.

- [ ] **Step 1: Test** `lab pages are noindex`: `/lab` contiene `meta[name=robots][content=noindex]`. `switcher updates url`: su `/lab/reveal` click su variante `b` → URL contiene `?v=b`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementa i file sopra.
- [ ] **Step 4:** Run → PASS (il secondo test passa dopo Task 3; marcarlo `test.fixme` fino ad allora).
- [ ] **Step 5:** Commit `feat: lab index e switcher varianti`.

### Task 3: Modulo reveal con 4 varianti + pagina /lab/reveal

**Files:**
- Create: `src/lib/motion.ts` (registra plugin GSAP, init Lenis collegato a `ScrollTrigger.update`, `prefersReducedMotion(): boolean`)
- Create: `src/lib/reveal.ts`
- Create: `src/pages/lab/reveal.astro` (contenuti finti in stile homepage: titolo grande Compact uppercase, paragrafo Montreal lungo, slogan Editorial, 3 immagini di progetto da `public/lab/` o placeholder grigi con proporzioni reali)
- Test: `tests/reveal.spec.ts`

**Interfaces:**
- Consumes: `getVariant`, evento `lab:variant` (Task 2).
- Produces: `type RevealVariant = 'mask' | 'soft' | 'wipe' | 'scrub'`; `initReveals(root: HTMLElement, variant: RevealVariant): () => void` (ritorna cleanup che fa `revert()` di split, timeline e ScrollTrigger).

Varianti (stessa logica per testi e immagini):
- `mask` — righe che salgono da dentro una maschera (`yPercent: 110`, `overflow: clip` per riga); immagini: clip-path dal basso + scale 1.15→1 interna.
- `soft` — righe in opacity 0→1 + blur 6px→0 + y 16px→0, stagger 0.08; immagini stesso trattamento più scale 1.04→1.
- `wipe` — clip-path `inset(0 0 100% 0)`→`inset(0)` per riga e per immagine, ease `expo.out`.
- `scrub` — legato allo scroll (`scrub: 1`): parole da opacity 0.15→1; immagini parallax interno + opacity.
Durate base 1.2s, ease `power4.out`, trigger `top 85%`, `once: true` (tranne `scrub`).

- [ ] **Step 1: Test** in `tests/reveal.spec.ts`:
  - `lines are identical to static layout`: per un paragrafo con `data-reveal="text"`, conta le righe (via `getClientRects` dei `.line`) dopo l'init; confronta con il numero di righe misurato su `/lab/reveal?static=1` (nessuna animazione, Range rects). Devono coincidere, per viewport 1440 e 390.
  - `resplits on resize`: viewport 1440 → 700, le righe aumentano e il testo totale è invariato.
  - `visible without js`: contesto con `javaScriptEnabled: false`, ogni `[data-reveal]` ha opacity computata `1`.
  - `reduced motion`: `reducedMotion: 'reduce'`, dopo load ogni `[data-reveal]` visibile senza scroll.
  - `switching variant cleans up`: cambia variante 4 volte; `document.querySelectorAll('.line').length` uguale al conteggio dopo la prima init; `ScrollTrigger.getAll().length` invariato (esporre `window.__ST = ScrollTrigger` solo in dev/lab).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementa `motion.ts` e `reveal.ts`. Split: `await document.fonts.ready` poi `SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'line', onSplit: self => animazione })` (per `scrub`: `type: 'words,lines'`). Stati iniziali impostati solo da JS. Un solo split per elemento.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Verifica manuale: `npm run dev`, apri `/lab/reveal`, prova le 4 varianti a 1440 e 390px.
- [ ] **Step 6:** Commit `feat: lab reveal con 4 varianti e fix split righe`.
