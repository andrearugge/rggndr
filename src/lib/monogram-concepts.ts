import { gsap, fontsReady } from './motion';
import { prepareColumn } from './loader';

/**
 * Cinque modi di passare da RUGGERI ANDREA a RGGNDR. Ognuno usa un solo gesto:
 * tre variazioni sempre più rapide (ritmo accelerando) e, come quarto battito,
 * lo stesso gesto porta via le lettere superflue. Le lettere restano sempre sulla stessa baseline
 * quando sono ferme, e nessuna sparisce per dissolvenza.
 */
export interface Concept {
  id: string;
  label: string;
  /** Il gesto che lega tutti i passaggi. */
  thread: string;
  /** Come spariscono le lettere superflue. */
  exit: string;
  build: (tl: gsap.core.Timeline, c: Ctx) => number;
}

export interface Ctx {
  root: HTMLElement;
  name: HTMLElement;
  letters: HTMLElement[];
  columns: HTMLElement[];
  keep: HTMLElement[];
  drop: HTMLElement[];
  spaces: HTMLElement[];
}

const EASE = 'power3.inOut';
/** Ritmo accelerando comune a tutti i concept: inizio, durata e ritardo tra lettere di ogni battito. */
const BEATS = [
  { at: 0.4, d: 0.9, st: 0.05 },
  { at: 1.1, d: 0.7, st: 0.04 },
  { at: 1.6, d: 0.55, st: 0.03 },
];
const EXIT = { d: 0.55, st: 0.03 };
const even = (_: HTMLElement, i: number) => i % 2 === 0;
const odd = (_: HTMLElement, i: number) => i % 2 === 1;

/** Prepara il nome: ogni lettera ha larghezza e altezza fisse, così nessuna si sposta dalla baseline. */
export function setup(root: HTMLElement): Ctx {
  const name = root.querySelector<HTMLElement>('[data-loader-name]')!;
  const letters = [...root.querySelectorAll<HTMLElement>('[data-loader-letter]')];
  const spaces = [...root.querySelectorAll<HTMLElement>('[data-loader-space]')];
  const sizes = letters.map((l) => l.getBoundingClientRect());
  letters.forEach((l, i) => {
    l.style.width = `${sizes[i].width}px`;
    l.style.height = `${sizes[i].height}px`;
  });
  spaces.forEach((s) => (s.style.width = `${s.getBoundingClientRect().width}px`));
  return {
    root,
    name,
    letters,
    columns: letters.map((l) => l.firstElementChild as HTMLElement),
    keep: letters.filter((l) => l.hasAttribute('data-keep')),
    drop: letters.filter((l) => !l.hasAttribute('data-keep')),
    spaces,
  };
}

/** Pianifica un movimento per lettera senza mai sovrapporlo al precedente della stessa lettera. */
function scheduler() {
  const free = new Map<Element, number>();
  let end = 0;
  return {
    at(el: Element, wanted: number, duration: number) {
      const start = Math.max(wanted, free.get(el) ?? 0);
      free.set(el, start + duration);
      end = Math.max(end, start + duration);
      return start;
    },
    get end() {
      return end;
    },
  };
}

/** Compatto: gli spazi lasciati dalle lettere superflue si chiudono. Ritorna la fine. */
export function closeUp(tl: gsap.core.Timeline, c: Ctx, at: number): number {
  const gaps = [...c.drop, ...c.spaces];
  tl.to(gaps, { width: 0, duration: 0.6, ease: EASE, stagger: 0.02 }, at);
  return at + 0.6 + 0.02 * (gaps.length - 1);
}

export const CONCEPTS: Concept[] = [
  {
    id: 'rullo',
    label: 'Rullo',
    thread: 'Le lettere rotolano sempre verso l’alto, a onde: prima le lettere pari, poi le dispari, poi tutte.',
    exit: 'All’ultima onda le superflue rotolano su una cella vuota.',
    build(tl, c) {
      const s = scheduler();
      // ogni lettera rotola due volte: le pari al primo battito, le dispari al secondo, tutte al terzo.
      // Le superflue hanno una cella in meno: all'ultima onda escono dalla maschera verso l'alto.
      c.letters.forEach((l, i) => {
        const ch = l.dataset.char!;
        const keep = l.hasAttribute('data-keep');
        prepareColumn(l, keep ? [ch, ch] : [ch]);
        const n = keep ? 3 : 2;
        [i % 2 === 0 ? 0 : 1, 2].forEach((b, step) => {
          const beat = BEATS[b];
          const start = s.at(l, beat.at + i * beat.st, beat.d);
          tl.to(c.columns[i], { yPercent: (-100 / n) * (step + 1), duration: beat.d, ease: EASE }, start);
        });
      });
      return s.end;
    },
  },
  {
    id: 'scambio',
    label: 'Scambio',
    thread: 'Lettere uguali si scambiano di posto (le due G, le E, le A, le R): una passa sopra, l’altra sotto.',
    exit: 'Le superflue scendono sotto la baseline, dalla parte di chi passava sotto.',
    build(tl, c) {
      const L = c.letters;
      const steps: [number, number][][] = [
        [[2, 3], [4, 11]],
        [[7, 12], [0, 5]],
        [[5, 10], [2, 3]],
      ];
      const h = L[0].getBoundingClientRect().height;
      const left = L.map((l) => l.getBoundingClientRect().left);
      steps.forEach((pairs, b) => {
        const beat = BEATS[b];
        pairs.forEach(([a, z], k) => {
          const at = beat.at + k * beat.st * 3;
          const dx = left[z] - left[a];
          tl.to(L[a], { x: dx, duration: beat.d, ease: EASE }, at);
          tl.to(L[z], { x: -dx, duration: beat.d, ease: EASE }, at);
          tl.to(L[a], { keyframes: { y: [0, -h * 0.55, 0], easeEach: 'sine.inOut' }, duration: beat.d }, at);
          tl.to(L[z], { keyframes: { y: [0, h * 0.55, 0], easeEach: 'sine.inOut' }, duration: beat.d }, at);
          // lettere identiche: tornare al proprio posto a scambio finito non si vede
          tl.set([L[a], L[z]], { x: 0 }, at + beat.d);
        });
      });
      const exitAt = BEATS[2].at + BEATS[2].d + 0.05;
      tl.to(
        c.drop.map((l) => l.firstElementChild),
        { yPercent: 100, duration: EXIT.d, ease: EASE, stagger: EXIT.st },
        exitAt,
      );
      return exitAt + EXIT.d + EXIT.st * (c.drop.length - 1);
    },
  },
  {
    id: 'peso',
    label: 'Peso',
    thread: 'Le lettere si allungano e si schiacciano restando appoggiate alla baseline.',
    exit: 'Le superflue si schiacciano fino a sparire sulla baseline.',
    build(tl, c) {
      c.letters.forEach((l) => (l.style.overflow = 'visible'));
      gsap.set(c.columns, { transformOrigin: '50% 100%' });
      const wave = (els: HTMLElement[], b: number, scale: number[]) =>
        els.forEach((col, k) => {
          const beat = BEATS[b];
          tl.to(col, { keyframes: { scaleY: scale, easeEach: 'sine.inOut' }, duration: beat.d }, beat.at + k * beat.st);
        });
      wave(c.columns.filter(even), 0, [1, 1.5, 1]);
      wave(c.columns.filter(odd), 1, [1, 0.45, 1]);
      const beat = BEATS[2];
      c.columns.forEach((col, i) => {
        const keep = c.letters[i].hasAttribute('data-keep');
        tl.to(col, keep ? { keyframes: { scaleY: [1, 1.3, 1], easeEach: 'sine.inOut' }, duration: beat.d } : { scaleY: 0, duration: beat.d, ease: EASE }, beat.at + 0.25 + i * beat.st);
      });
      return beat.at + 0.25 + beat.d + beat.st * (c.letters.length - 1);
    },
  },
  {
    id: 'selezione',
    label: 'Selezione',
    thread: 'Come in un editor: si seleziona RUGGERI, poi ANDREA, poi solo le lettere superflue.',
    exit: 'Le superflue selezionate vengono cancellate da destra, come con il tasto indietro.',
    build(tl, c) {
      const cream = getComputedStyle(c.name).color;
      const primary = '#898d7f';
      const on = { backgroundColor: cream, color: primary, boxShadow: `0 0.07em 0 ${cream}, 0 -0.07em 0 ${cream}`, duration: 0.12, ease: 'none' };
      const off = { backgroundColor: 'rgba(253,255,244,0)', color: cream, boxShadow: '0 0.07em 0 rgba(253,255,244,0), 0 -0.07em 0 rgba(253,255,244,0)', duration: 0.12, ease: 'none' };
      gsap.set(c.columns, { backgroundColor: 'rgba(253,255,244,0)', color: cream, overflow: 'hidden', whiteSpace: 'nowrap' });
      c.columns.forEach((col) => (col.style.width = `${col.getBoundingClientRect().width}px`));
      c.columns.forEach((col) => (col.style.textAlign = 'left'));
      const select = (idx: number[], b: number) => {
        const beat = BEATS[b];
        idx.forEach((i, k) => tl.to(c.columns[i], on, beat.at + k * beat.st * 1.4));
        return beat.at + idx.length * beat.st * 1.4;
      };
      const ruggeri = [0, 1, 2, 3, 4, 5, 6];
      const andrea = [7, 8, 9, 10, 11, 12];
      let t = select(ruggeri, 0);
      tl.to(ruggeri.map((i) => c.columns[i]), off, t + 0.35);
      t = select(andrea, 1);
      tl.to(andrea.map((i) => c.columns[i]), off, t + 0.3);
      const dropIdx = c.letters.map((l, i) => (l.hasAttribute('data-keep') ? -1 : i)).filter((i) => i >= 0);
      t = select(dropIdx, 2);
      const delAt = t + 0.25;
      // cancellazione da destra verso sinistra, una lettera dopo l'altra
      [...dropIdx].reverse().forEach((i, k) => tl.to(c.columns[i], { width: 0, duration: 0.3, ease: 'power2.inOut' }, delAt + k * 0.05));
      return delAt + 0.3 + 0.05 * (dropIdx.length - 1);
    },
  },
  {
    id: 'flip',
    label: 'Flip',
    thread: 'Le lettere girano su sé stesse attorno all’asse orizzontale, a onde.',
    exit: 'All’ultima onda le superflue si fermano di taglio e spariscono.',
    build(tl, c) {
      c.name.style.perspective = '500px';
      c.letters.forEach((l) => (l.style.overflow = 'visible'));
      const wave = (els: HTMLElement[], b: number, to: string) =>
        els.forEach((col, k) => {
          const beat = BEATS[b];
          tl.to(col, { rotationX: to, duration: beat.d, ease: EASE }, beat.at + k * beat.st);
        });
      wave(c.columns.filter(even), 0, '+=360');
      wave(c.columns.filter(odd), 1, '-=360');
      const beat = BEATS[2];
      const s = scheduler();
      c.columns.forEach((col, i) => {
        const keep = c.letters[i].hasAttribute('data-keep');
        const start = s.at(col, beat.at + 0.3 + i * beat.st, beat.d);
        tl.to(col, { rotationX: keep ? '+=360' : '+=90', duration: beat.d, ease: EASE }, start);
      });
      return s.end;
    },
  },
];

/** Un concept in loop continuo dentro `root`: nome → variazioni → RGGNDR → pausa → da capo. */
export async function loopConcept(root: HTMLElement, concept: Concept, compact: boolean) {
  await fontsReady(800);
  const original = root.innerHTML;
  const run = () => {
    root.innerHTML = original;
    root.dataset.state = 'name';
    const c = setup(root);
    const sub = root.querySelector<HTMLElement>('[data-loader-sub]')!;
    const tl = gsap.timeline({ onComplete: () => void gsap.delayedCall(0.5, run) });
    tl.fromTo([c.name, sub], { opacity: 0, filter: 'blur(5px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.06, ease: 'power4.out' }, 0.1);
    let end = concept.build(tl, c);
    if (compact) end = closeUp(tl, c, end + 0.05);
    tl.call(() => void (root.dataset.state = 'monogram'), [], end);
    tl.to([c.name, sub], { opacity: 0, filter: 'blur(5px)', duration: 0.4, ease: 'power2.in' }, end + 1.1);
  };
  run();
}
