import { gsap, ScrollTrigger, fontsReady, prefersReducedMotion } from './motion';
import { autoSplitLines } from './split-lines';

export type RevealVariant = 'mask' | 'soft' | 'wipe' | 'scrub';
export const REVEAL_VARIANTS: RevealVariant[] = ['mask', 'soft', 'wipe', 'scrub'];

const EASE = 'power4.out';
const DURATION = 1.2;
const STAGGER = 0.08;
const START = 'top 85%';
const CLEAR = 'transform,opacity,visibility,filter,clipPath';

type Cleanup = () => void;
type Builder = (el: HTMLElement, done: () => void) => Cleanup;

const show = (el: HTMLElement) => gsap.set(el, { visibility: 'visible' });

/* ---------- testi ---------- */

const textOnce =
  (vars: gsap.TweenVars, mask: boolean): Builder =>
  (el, done) => {
    const visible = show(el);
    const stop = autoSplitLines(el, { mask }, ({ lines }) => {
      if (el.dataset.revealDone) return;
      return gsap.from(lines, {
        ...vars,
        duration: vars.duration ?? DURATION,
        ease: vars.ease ?? EASE,
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

const textScrub: Builder = (el) => {
  const visible = show(el);
  const stop = autoSplitLines(el, { words: true }, ({ words }) =>
    gsap.fromTo(
      words,
      { opacity: 0.15 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: START, end: 'top 40%', scrub: 1 },
      },
    ),
  );
  return () => {
    stop();
    visible.revert();
  };
};

const TEXT: Record<RevealVariant, Builder> = {
  mask: textOnce({ yPercent: 110 }, true),
  soft: textOnce({ autoAlpha: 0, y: 16, filter: 'blur(6px)' }, false),
  wipe: textOnce({ clipPath: 'inset(0% 0% 100% 0%)', ease: 'expo.out' }, false),
  scrub: textScrub,
};

/* ---------- immagini ---------- */

const imageOnce =
  (wrap: gsap.TweenVars, media: gsap.TweenVars, ease = EASE): Builder =>
  (el, done) => {
    const target = el.querySelector('img, video');
    const visible = show(el);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: START, once: true },
      defaults: { duration: DURATION * 1.25, ease },
      onComplete: done,
    });
    tl.from(el, { ...wrap, clearProps: CLEAR });
    if (target && Object.keys(media).length) tl.from(target, { ...media, clearProps: 'transform' }, 0);
    return () => {
      tl.revert();
      visible.revert();
    };
  };

const imageScrub: Builder = (el) => {
  const target = el.querySelector('img, video');
  const visible = show(el);
  const anims: gsap.core.Animation[] = [
    gsap.fromTo(
      el,
      { opacity: 0.15 },
      { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: START, end: 'top 40%', scrub: 1 } },
    ),
  ];
  if (target) {
    anims.push(
      gsap.fromTo(
        target,
        { yPercent: -6, scale: 1.14 },
        {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      ),
    );
  }
  return () => {
    anims.forEach((a) => a.revert());
    visible.revert();
  };
};

const IMAGE: Record<RevealVariant, Builder> = {
  mask: imageOnce({ clipPath: 'inset(100% 0% 0% 0%)' }, { scale: 1.15 }),
  soft: imageOnce({ autoAlpha: 0, y: 16, filter: 'blur(6px)' }, { scale: 1.04 }),
  wipe: imageOnce({ clipPath: 'inset(0% 0% 100% 0%)' }, {}, 'expo.out'),
  scrub: imageScrub,
};

/**
 * Applica la variante a tutti gli `[data-reveal="text|image"]` dentro `root`.
 * Le righe vengono calcolate solo a font caricati e ricalcolate su resize.
 * Ritorna una funzione di cleanup che ripristina DOM, tween e ScrollTrigger.
 */
export function initReveals(root: HTMLElement, variant: RevealVariant): Cleanup {
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
      const build = el.dataset.reveal === 'image' ? IMAGE[variant] : TEXT[variant];
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
