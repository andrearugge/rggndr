import { gsap, fontsReady, prefersReducedMotion } from './motion';

export type LoaderVariant = 'classic' | 'slot' | 'bands' | 'monogram';
export const LOADER_VARIANTS: LoaderVariant[] = ['classic', 'slot', 'bands', 'monogram'];

interface LoaderOptions {
  /** Chiamata quando l'hero deve iniziare ad animarsi (sovrapposta all'uscita del pannello). */
  onHandoff?: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomChar = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

/**
 * Trasforma una lettera in una colonna di celle [lettera, ...extra] dentro la sua maschera.
 * Ritorna il tween che fa scorrere la colonna fino all'ultima cella.
 */
function rollColumn(letter: HTMLElement, extra: string[], vars: gsap.TweenVars): gsap.core.Tween {
  const column = letter.firstElementChild as HTMLElement;
  // La maschera resta alta una lettera: le celle aggiunte scorrono dentro, non la allargano.
  const first = (column.firstElementChild as HTMLElement).getBoundingClientRect();
  letter.style.height = `${first.height}px`;
  letter.style.width = `${first.width}px`; // anche le lettere casuali più larghe non spostano il nome
  column.style.textAlign = 'center';
  for (const c of extra) {
    const cell = document.createElement('span');
    cell.className = 'block';
    cell.textContent = c;
    column.append(cell);
  }
  const cells = extra.length + 1;
  return gsap.to(column, { yPercent: (-100 * (cells - 1)) / cells, ...vars });
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
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        finish();
        resolve();
      },
    });

    // 1. Il nome emerge dalla sfocatura (come oggi, ma più rapido)
    tl.to([name, sub], { opacity: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.08 }, 0.1);

    // 2. Gesto sul nome
    if (variant === 'classic' || variant === 'bands') {
      const rolling = letters.filter((l) => l.hasAttribute('data-roll'));
      rolling.forEach((l, i) =>
        tl.add(rollColumn(l, [l.dataset.char!], { duration: 0.8, ease: 'power4.inOut' }), 0.45 + i * 0.06),
      );
    }

    if (variant === 'slot') {
      letters.forEach((l, i) =>
        tl.add(
          rollColumn(l, [randomChar(), randomChar(), randomChar(), l.dataset.char!], {
            duration: 0.8,
            ease: 'expo.inOut',
          }),
          0.45 + i * 0.035,
        ),
      );
    }

    if (variant === 'monogram') {
      // RUGGERI ANDREA → RGGNDR: le lettere in più si chiudono
      const drop = [...letters.filter((l) => !l.hasAttribute('data-keep')), ...el.querySelectorAll<HTMLElement>('[data-loader-space]')];
      drop.forEach((d) => (d.style.width = `${d.getBoundingClientRect().width}px`));
      tl.to(drop, { width: 0, opacity: 0, duration: 0.7, ease: 'power4.inOut', stagger: 0.025 }, 0.7);
      tl.to(sub, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 0.7);
    }

    // 3. Uscita del pannello + passaggio all'hero
    const exitAt = variant === 'slot' ? 1.6 : variant === 'monogram' ? 1.5 : 1.55;

    if (variant === 'monogram') {
      // RGGNDR vola sul logo dell'header mentre il pannello sale
      const target = headerLogo();
      tl.add(() => {
        if (!target) return;
        const from = name.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const scale = to.height / from.height;
        gsap.to(name, {
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale,
          color: 'var(--color-primary)',
          duration: 1,
          ease: 'power4.inOut',
        });
      }, exitAt);
      tl.to(name, { opacity: 0, duration: 0.25, ease: 'none' }, exitAt + 0.85);
    } else {
      tl.to([name, sub], { y: -24, opacity: 0, duration: 0.5, ease: 'power3.in', stagger: 0.04 }, exitAt);
    }

    const bandsAt = variant === 'monogram' ? exitAt : exitAt + 0.15;
    if (variant === 'bands') {
      tl.to(bands, { yPercent: -101, duration: 0.9, ease: 'expo.inOut', stagger: 0.07 }, bandsAt);
    } else {
      tl.to(bands, { yPercent: -101, duration: 1.05, ease: 'expo.inOut' }, bandsAt);
    }

    tl.add(() => onHandoff?.(), bandsAt + 0.35);
  });
}
