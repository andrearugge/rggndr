import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Attende i font del sito (lo split deve misurare le righe col font finale), ma non oltre
 * `timeoutMs`: se un font è lento si parte comunque e lo split si rifà al `loadingdone`.
 */
export async function fontsReady(timeoutMs = 1200): Promise<void> {
  const loaded = Promise.allSettled([
    document.fonts.load('400 1em Montreal'),
    document.fonts.load('700 1em Montreal'),
    document.fonts.load('900 1em Compact'),
    document.fonts.load('400 1em Editorial'),
  ]).then(() => document.fonts.ready);
  await Promise.race([loaded, new Promise((r) => setTimeout(r, timeoutMs))]);
}

let lenis: Lenis | null = null;

/** Smooth scroll collegato a ScrollTrigger. Nessun effetto con reduced motion. */
export function initSmoothScroll(): Lenis | null {
  if (lenis || prefersReducedMotion()) return lenis;
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
