import { gsap, ScrollTrigger, fontsReady, prefersReducedMotion } from './motion';
import { autoSplitLines } from './split-lines';

/** Reveal "Soft": opacità, sfocatura e un leggero spostamento verso l'alto, riga per riga. */
const EASE = 'power4.out';
const DURATION = 1.2;
const STAGGER = 0.08;
const START = 'top 85%';
const CLEAR = 'transform,opacity,visibility,filter';
const FROM = { autoAlpha: 0, y: 16, filter: 'blur(6px)' };

type Cleanup = () => void;
type Builder = (el: HTMLElement, done: () => void) => Cleanup;

/** Toglie il gate CSS `[data-reveal]:not([data-reveal-shown])`; i tween non possono annullarlo. */
const show = (el: HTMLElement) => {
  el.setAttribute('data-reveal-shown', '');
  return { revert: () => el.removeAttribute('data-reveal-shown') };
};

/** Testi: le righe misurate dal browser entrano una dopo l'altra. */
const revealText: Builder = (el, done) => {
  const visible = show(el);
  const stop = autoSplitLines(el, (split) => {
    if (el.dataset.revealDone) return;
    return gsap.from(split ? split.lines : [el], {
      ...FROM,
      duration: DURATION,
      ease: EASE,
      stagger: STAGGER,
      clearProps: CLEAR,
      scrollTrigger: { trigger: el, start: START, once: true },
      onComplete: done,
    });
  });
  return () => {
    stop();
    visible.revert();
  };
};

/** Immagini: il contenitore entra come i testi, la foto si assesta da una scala appena maggiore. */
const revealImage: Builder = (el, done) => {
  const target = el.querySelector('img, video');
  const visible = show(el);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: el, start: START, once: true },
    defaults: { duration: DURATION * 1.25, ease: EASE },
    onComplete: done,
  });
  tl.from(el, { ...FROM, clearProps: CLEAR });
  if (target) tl.from(target, { scale: 1.04, clearProps: 'transform' }, 0);
  return () => {
    tl.revert();
    visible.revert();
  };
};

/**
 * Applica il reveal a tutti gli `[data-reveal="text|image"]` dentro `root`.
 * Le righe vengono calcolate solo a font caricati e ricalcolate su resize.
 * Ritorna una funzione di cleanup che ripristina DOM, tween e ScrollTrigger.
 */
export function initReveals(root: HTMLElement): Cleanup {
  const html = document.documentElement;
  html.dataset.revealReady = 'false';

  if (prefersReducedMotion()) {
    html.dataset.revealReady = 'true';
    return () => {};
  }

  const cleanups: Cleanup[] = [];
  let alive = true;

  fontsReady().then(() => {
    if (!alive) return;
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      delete el.dataset.revealDone;
      const build = el.dataset.reveal === 'image' ? revealImage : revealText;
      cleanups.push(build(el, () => (el.dataset.revealDone = 'true')));
    });
    ScrollTrigger.refresh();
    html.dataset.revealReady = 'true';
  });

  return () => {
    alive = false;
    cleanups.splice(0).forEach((fn) => fn());
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => delete el.dataset.revealDone);
  };
}
