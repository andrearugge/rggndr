import { gsap, fontsReady, prefersReducedMotion } from './motion';

export type LoaderVariant = 'classic' | 'slot' | 'bands' | 'monogram';
export const LOADER_VARIANTS: LoaderVariant[] = ['classic', 'slot', 'bands', 'monogram'];

interface LoaderOptions {
  /** Chiamata quando l'hero deve iniziare ad animarsi (sovrapposta all'uscita del pannello). */
  onHandoff?: () => void;
}

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
function prepareColumn(letter: HTMLElement, extra: string[]): HTMLElement {
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

/** Larghezza reale del glifo di ogni cella della colonna. */
function cellWidths(column: HTMLElement): number[] {
  const range = document.createRange();
  return [...column.children].map((c) => {
    range.selectNodeContents(c);
    return range.getBoundingClientRect().width;
  });
}

/** Posizione del logo RGGNDR visibile nell'header (desktop o mobile). */
function headerLogo(): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>('header a[href="/"]')].find((a) => a.offsetParent !== null) ?? null;
}

export async function playLoader(el: HTMLElement, variant: LoaderVariant, { onHandoff }: LoaderOptions = {}): Promise<void> {
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
        .forEach((l, i) => tl.add(rollColumn(l, [l.dataset.char!], { duration: 0.8, ease: EASE }), 0.4 + i * 0.06));
    }

    if (variant === 'slot') {
      // scorrimento continuo su lettere casuali, a onda da sinistra
      letters.forEach((l, i) =>
        tl.add(rollColumn(l, [...distinctRandoms(l.dataset.char!, 3), l.dataset.char!], { duration: 0.8, ease: 'expo.inOut' }), 0.45 + i * 0.035),
      );
    }

    let rollsEnd = 0;
    if (variant === 'monogram') {
      // Rotazione "classic" su tutte le lettere, per 3 giri a scatti: ogni lettera sale di una cella,
      // si ferma, poi riparte. I primi due giri mostrano lettere diverse, il terzo torna sulla propria.
      const ROUNDS = 3;
      const ROLL = 0.45; // durata di uno scatto
      const INTERVAL = 0.5; // da un giro al successivo (ROLL < INTERVAL → pausa netta tra gli scatti)
      const WAVE = 0.02; // onda da sinistra a destra
      const START = 0.3;
      const columns = letters.map((l) => prepareColumn(l, [...distinctRandoms(l.dataset.char!, ROUNDS - 1), l.dataset.char!]));
      const widths = columns.map(cellWidths);
      for (let r = 1; r <= ROUNDS; r++) {
        columns.forEach((col, i) => {
          const at = START + (r - 1) * INTERVAL + i * WAVE;
          tl.to(col, { yPercent: (-100 * r) / (ROUNDS + 1), duration: ROLL, ease: EASE }, at);
          // la maschera segue la larghezza della nuova lettera: niente tagli, niente salti
          tl.to(letters[i], { width: widths[i][r], duration: ROLL, ease: EASE }, at);
        });
        tl.add(() => name.setAttribute('data-round', String(r)), START + (r - 1) * INTERVAL + ROLL + 0.02);
        tl.add(() => name.setAttribute('data-round-done', String(r)), START + (r - 1) * INTERVAL + ROLL + (letters.length - 1) * WAVE + 0.02);
      }
      rollsEnd = START + (ROUNDS - 1) * INTERVAL + (letters.length - 1) * WAVE + ROLL;
    }

    let exitAt = variant === 'slot' ? 1.6 : 1.55;

    if (variant === 'monogram') {
      // RUGGERI ANDREA → RGGNDR: le lettere in più si chiudono, le altre si ricompattano
      const collapseAt = rollsEnd - 0.05;
      const drop = [
        ...letters.filter((l) => !l.hasAttribute('data-keep')),
        ...el.querySelectorAll<HTMLElement>('[data-loader-space]'),
      ];
      tl.add(() => drop.forEach((d) => (d.style.width = `${d.getBoundingClientRect().width}px`)), collapseAt);
      tl.to(drop, { width: 0, opacity: 0, duration: 0.55, ease: EASE, stagger: 0.015 }, collapseAt);
      tl.to(sub, { opacity: 0, filter: 'blur(5px)', duration: 0.4, ease: 'power2.in' }, collapseAt);
      exitAt = collapseAt + 0.55 + 0.015 * drop.length + 0.05;

      // RGGNDR vola sul logo dell'header: misurato solo a chiusura finita, allineato su bordo sinistro e larghezza
      const FLIGHT = 0.9;
      tl.add(() => {
        const target = headerLogo();
        if (!target) return;
        const from = name.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        gsap.set(name, { transformOrigin: 'left center' });
        gsap.to(name, {
          x: to.left - from.left,
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: to.width / from.width,
          duration: FLIGHT,
          ease: EASE,
        });
        gsap.to(name, { color: getComputedStyle(target).color, duration: FLIGHT * 0.5, delay: FLIGHT * 0.5, ease: 'none' });
      }, exitAt);
      tl.to(name, { opacity: 0, duration: 0.15, ease: 'none' }, exitAt + FLIGHT);
      tl.to(bands, { y: () => -window.innerHeight - 2, duration: FLIGHT, ease: EASE }, exitAt);
      tl.add(() => onHandoff?.(), exitAt + 0.3);
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
