import { gsap, fontsReady, prefersReducedMotion } from './motion';
import { setup, closeUp, type Concept } from './monogram-concepts';

export type LoaderVariant = 'classic' | 'slot' | 'bands' | 'monogram';
export const LOADER_VARIANTS: LoaderVariant[] = ['classic', 'slot', 'bands', 'monogram'];

interface LoaderOptions {
  /** Chiamata quando l'hero deve iniziare ad animarsi (sovrapposta all'uscita del pannello). */
  onHandoff?: () => void;
  /** Timing del monogram (default: MONOGRAM_TIMINGS[0]). */
  timing?: MonogramTiming;
  /** Monogram: uno dei concept di /lab/monogram al posto della sequenza a giri. */
  concept?: Concept;
  /** Monogram: chiude gli spazi lasciati dalle lettere superflue. */
  compact?: boolean;
}

/** Ritmo della variante monogram: giri di rotazione, chiusura in RGGNDR e dissolvenza. */
export interface MonogramTiming {
  label: string;
  note: string;
  /** Inizio di ogni giro (s). */
  roundAt: number[];
  /** Durata di una rotazione, per giro (s). */
  roll: number[];
  /** Ritardo tra lettere dello stesso set (s). */
  stagger: number;
  ease: string;
  /** Quanto prima della fine dell'ultimo giro parte la rotazione d'uscita (s; negativo = pausa). */
  exitOverlap: number;
  /** Durata della rotazione con cui le lettere in più escono (s). */
  exitRoll: number;
  /** Ritardo tra le lettere che escono (s). */
  exitStagger: number;
  exitEase?: string;
  /** Quando parte l'accorpamento, in frazione della rotazione d'uscita (0 = insieme, 1 = a uscita finita). */
  collapseDelay: number;
  collapseDuration: number;
  collapseEase?: string;
  /** Ritardo tra gli spazi che si chiudono (s). */
  dropStagger: number;
  /** Pausa su RGGNDR prima della dissolvenza (s). */
  hold: number;
  /** Durata della dissolvenza di RGGNDR e sottotitolo (s). */
  fade: number;
}

const BASE: Omit<MonogramTiming, 'label' | 'note'> = {
  roundAt: [0.4, 0.9, 1.4],
  roll: [0.8, 0.8, 0.8],
  stagger: 0.06,
  ease: 'power3.inOut',
  exitOverlap: 0.1,
  exitRoll: 0.55,
  exitStagger: 0.04,
  collapseDelay: 0.6,
  collapseDuration: 0.55,
  dropStagger: 0.015,
  hold: 0.1,
  fade: 0.4,
};

/** Alternative di timing da confrontare in /lab/loader-timing. La prima è quella in uso. */
export const MONOGRAM_TIMINGS: MonogramTiming[] = [
  { ...BASE, label: 'Accelerando · in uso', note: 'Ogni giro più breve e più vicino al precedente, fino alla chiusura', roundAt: [0.4, 1.1, 1.5], roll: [1, 0.75, 0.55], exitRoll: 0.45, collapseDuration: 0.45 },
  { ...BASE, label: 'Classic', note: 'Rotazioni classic, giri ogni 0,5s, chiusura sovrapposta' },
  { ...BASE, label: 'Rapido', note: 'Tutto più veloce: rotazioni 0,6s, giri ogni 0,35s', roundAt: [0.4, 0.75, 1.1], roll: [0.6, 0.6, 0.6], stagger: 0.045, collapseDuration: 0.45 },
  { ...BASE, label: 'Disteso', note: 'Rotazioni lunghe 1s, giri ogni 0,65s, pausa su RGGNDR', roundAt: [0.4, 1.05, 1.7], roll: [1, 1, 1], stagger: 0.08, collapseDuration: 0.7, hold: 0.35, fade: 0.5 },
  { ...BASE, label: 'Onda', note: 'Ritardo tra lettere più ampio (0,14s): ogni set scorre come un\'onda', stagger: 0.14 },
  { ...BASE, label: 'Blocchi', note: 'Le lettere di un set ruotano tutte nello stesso istante', stagger: 0 },
  { ...BASE, label: 'Serrato', note: 'Giri quasi sovrapposti (ogni 0,22s): un unico movimento fitto', roundAt: [0.4, 0.62, 0.84] },
  { ...BASE, label: 'Respiro', note: 'Giri staccati, un battito tra uno e l\'altro; chiusura dopo una pausa', roundAt: [0.4, 1.3, 2.2], exitOverlap: -0.15, hold: 0.25 },
  { ...BASE, label: 'Scatto', note: 'Ease expo: partenza e arrivo lenti, centro rapidissimo', ease: 'expo.inOut', roll: [0.9, 0.9, 0.9], roundAt: [0.4, 0.85, 1.3], collapseEase: 'expo.inOut', collapseDuration: 0.7 },
  { ...BASE, label: 'Morbido', note: 'Ease sine: movimento uniforme e calmo', ease: 'sine.inOut', roll: [0.9, 0.9, 0.9], roundAt: [0.4, 0.95, 1.5], collapseEase: 'sine.inOut', collapseDuration: 0.65 },
];

/** In ogni giro due set di lettere ruotano in direzioni opposte (indici in RUGGERI ANDREA, spazio escluso). */
const MONOGRAM_ROUNDS: { up: number[]; down: number[] }[] = [
  { up: [1, 8], down: [4, 12] }, // U N ↑  E A ↓
  { up: [2, 10], down: [0, 6] }, // G R ↑  R I ↓
  { up: [5, 11], down: [3, 7] }, // R E ↑  G A ↓
];

/**
 * Aggiunge al timeline la sequenza del monogram dentro `root` (che contiene nome e sottotitolo):
 * giri di rotazione → chiusura in RGGNDR → dissolvenza. Ritorna quando la dissolvenza è finita.
 */
export function addMonogram(tl: gsap.core.Timeline, root: HTMLElement, t: MonogramTiming): number {
  const name = root.querySelector<HTMLElement>('[data-loader-name]')!;
  const sub = root.querySelector<HTMLElement>('[data-loader-sub]')!;
  const letters = [...root.querySelectorAll<HTMLElement>('[data-loader-letter]')];

  let rollsEnd = 0;
  // per ogni lettera: direzione e fine della sua ultima rotazione
  const lastRoll = new Map<HTMLElement, { dir: 1 | -1; end: number; column: HTMLElement }>();
  MONOGRAM_ROUNDS.forEach((round, r) => {
    for (const [set, dir] of [[round.up, 1], [round.down, -1]] as const) {
      set.forEach((idx, k) => {
        const l = letters[idx];
        const column = prepareColumn(l, [l.dataset.char!]);
        // la colonna ha due celle uguali: sale da 0 a -50%, scende da -50% a 0
        const from = dir === 1 ? 0 : -50;
        gsap.set(column, { yPercent: from });
        const start = t.roundAt[r] + k * t.stagger;
        tl.to(column, { yPercent: from === 0 ? -50 : 0, duration: t.roll[r], ease: t.ease }, start);
        rollsEnd = Math.max(rollsEnd, start + t.roll[r]);
        lastRoll.set(l, { dir, end: start + t.roll[r], column });
      });
    }
  });

  // RUGGERI ANDREA → RGGNDR. Ultimo giro: le lettere in più escono dalla maschera ruotando,
  // ognuna nella direzione della sua ultima rotazione (sopra se saliva, sotto se scendeva)
  const dropLetters = letters.filter((l) => !l.hasAttribute('data-keep'));
  const exitAt = rollsEnd - t.exitOverlap;
  let exitEnd = exitAt;
  dropLetters.forEach((l, k) => {
    let last = lastRoll.get(l);
    if (!last) {
      const column = prepareColumn(l, [l.dataset.char!]);
      last = { dir: 1, end: 0, column };
    }
    // mai prima che la sua rotazione sia finita: due tween sulla stessa colonna si annullerebbero
    const start = Math.max(exitAt + k * t.exitStagger, last.end);
    // colonna di due celle: oltre -50% la lettera esce sopra, oltre 0 esce sotto
    tl.to(last.column, { yPercent: last.dir === 1 ? -100 : 50, duration: t.exitRoll, ease: t.exitEase ?? t.ease }, start);
    exitEnd = Math.max(exitEnd, start + t.exitRoll);
  });

  // poi gli spazi rimasti si chiudono e RGGNDR si ricompatta (nessuna dissolvenza: le lettere sono già uscite)
  const collapseAt = exitAt + t.exitRoll * t.collapseDelay;
  const drop = [...dropLetters, ...root.querySelectorAll<HTMLElement>('[data-loader-space]')];
  drop.forEach((d) => (d.style.width = `${d.getBoundingClientRect().width}px`));
  tl.to(drop, { width: 0, duration: t.collapseDuration, ease: t.collapseEase ?? t.ease, stagger: t.dropStagger }, collapseAt);

  // RGGNDR e il sottotitolo restano al centro e sfumano insieme
  const fadeAt = Math.max(exitEnd, collapseAt + t.collapseDuration + t.dropStagger * drop.length) + t.hold;
  tl.to([name, sub], { opacity: 0, filter: 'blur(5px)', duration: t.fade, ease: 'power2.in' }, fadeAt);
  return fadeAt + t.fade;
}

/** Il monogram in loop continuo, senza pannello: per confrontare i timing nel lab. */
export async function loopMonogram(root: HTMLElement, timing: MonogramTiming): Promise<gsap.core.Timeline> {
  await fontsReady(800);
  const name = root.querySelector<HTMLElement>('[data-loader-name]')!;
  const sub = root.querySelector<HTMLElement>('[data-loader-sub]')!;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
  tl.fromTo([name, sub], { opacity: 0, filter: 'blur(5px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.06, ease: 'power4.out' }, 0.1);
  addMonogram(tl, root, timing);
  return tl;
}

/** Tempi della rotazione "classic": durata di una rotazione e ritardo tra una lettera e la successiva. */
const CLASSIC_ROLL = 0.8;
const CLASSIC_STAGGER = 0.06;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomChar = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

/** `n` lettere casuali, tutte diverse dalla lettera finale e dalla precedente. */
function distinctRandoms(own: string, n: number): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const c = randomChar();
    if (c !== own && c !== out.at(-1)) out.push(c);
  }
  return out;
}

/**
 * Trasforma una lettera in una colonna di celle [lettera, ...extra] dentro la sua maschera.
 * Ritorna il tween che fa scorrere la colonna fino all'ultima cella.
 */
function rollColumn(letter: HTMLElement, extra: string[], vars: gsap.TweenVars): gsap.core.Tween {
  const column = prepareColumn(letter, extra);
  const cells = extra.length + 1;
  return gsap.to(column, { yPercent: (-100 * (cells - 1)) / cells, ...vars });
}

/** Aggiunge le celle `extra` sotto la lettera, bloccando la maschera su una cella. Ritorna la colonna. */
export function prepareColumn(letter: HTMLElement, extra: string[]): HTMLElement {
  const column = letter.firstElementChild as HTMLElement;
  // La maschera resta alta una lettera: le celle aggiunte scorrono dentro, non la allargano.
  const first = (column.firstElementChild as HTMLElement).getBoundingClientRect();
  letter.style.height = `${first.height}px`;
  // la maschera taglia solo sopra e sotto: le lettere larghe non vengono mai rifilate ai lati
  letter.style.overflow = 'visible';
  letter.style.clipPath = 'inset(0 -100% 0 -100%)';
  letter.style.width = `${first.width}px`; // anche le lettere casuali più larghe non spostano il nome
  column.style.textAlign = 'center';
  for (const c of extra) {
    const cell = document.createElement('span');
    cell.className = 'block';
    cell.textContent = c;
    column.append(cell);
  }
  return column;
}


export async function playLoader(el: HTMLElement, variant: LoaderVariant, { onHandoff, timing = MONOGRAM_TIMINGS[0], concept, compact = false }: LoaderOptions = {}): Promise<void> {
  const html = document.documentElement;
  const finish = () => {
    el.remove();
    html.style.overflow = '';
  };

  if (prefersReducedMotion()) {
    finish();
    onHandoff?.();
    return;
  }

  html.style.overflow = 'hidden';
  el.style.animation = 'none'; // il paracadute CSS non serve più: JS è partito

  // Le lettere si misurano col font finale (Compact), altrimenti maschere e larghezze sono sbagliate.
  await fontsReady(800);

  const name = el.querySelector<HTMLElement>('[data-loader-name]')!;
  const sub = el.querySelector<HTMLElement>('[data-loader-sub]')!;
  const bands = [...el.querySelectorAll<HTMLElement>('[data-loader-bands] > div')];
  const letters = [...el.querySelectorAll<HTMLElement>('[data-loader-letter]')];

  return new Promise((resolve) => {
    const EASE = 'power3.inOut'; // parte e arriva senza esitazioni (expo restava quasi fermo ai bordi)
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        finish();
        resolve();
      },
    });

    // 1. Il nome emerge dalla sfocatura
    tl.to([name, sub], { opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.06 }, 0.1);

    // 2. Gesto sul nome
    if (variant === 'classic' || variant === 'bands') {
      letters
        .filter((l) => l.hasAttribute('data-roll'))
        .forEach((l, i) => tl.add(rollColumn(l, [l.dataset.char!], { duration: CLASSIC_ROLL, ease: EASE }), 0.4 + i * CLASSIC_STAGGER));
    }

    if (variant === 'slot') {
      // scorrimento continuo su lettere casuali, a onda da sinistra
      letters.forEach((l, i) =>
        tl.add(rollColumn(l, [...distinctRandoms(l.dataset.char!, 3), l.dataset.char!], { duration: 0.8, ease: 'expo.inOut' }), 0.45 + i * 0.035),
      );
    }

    let exitAt = variant === 'slot' ? 1.6 : 1.55;

    if (variant === 'monogram') {
      let end: number;
      if (concept) {
        const c = setup(el);
        end = concept.build(tl, c);
        if (compact) end = closeUp(tl, c, end + 0.05);
        // RGGNDR e il sottotitolo sfumano insieme dopo una breve pausa sul monogramma
        tl.to([name, sub], { opacity: 0, filter: 'blur(5px)', duration: 0.4, ease: 'power2.in' }, end + 0.35);
        end += 0.75;
      } else end = addMonogram(tl, el, timing);
      const panelAt = end - 0.25; // il pannello sale mentre la dissolvenza si chiude
      tl.to(bands, { y: () => -window.innerHeight - 2, duration: 1, ease: EASE }, panelAt);
      tl.add(() => onHandoff?.(), panelAt + 0.3);
      return;
    }

    // 3. Uscita del testo e del pannello + passaggio all'hero
    tl.to([name, sub], { y: -24, opacity: 0, duration: 0.45, ease: 'power3.in', stagger: 0.04 }, exitAt);
    const panelAt = exitAt + 0.15;
    if (variant === 'bands') {
      // ogni fascia percorre esattamente la distanza che le serve per uscire dallo schermo
      tl.to(bands, { y: (_i, b: HTMLElement) => -(b.offsetTop + b.offsetHeight + 2), duration: 0.85, ease: EASE, stagger: 0.07 }, panelAt);
    } else {
      tl.to(bands, { y: () => -window.innerHeight - 2, duration: 1, ease: EASE }, panelAt);
    }
    tl.add(() => onHandoff?.(), panelAt + 0.3);
  });
}
