import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Attende che i font del sito siano realmente caricati: lo split deve misurare le righe col font finale. */
export async function fontsReady(): Promise<void> {
  await Promise.allSettled([
    document.fonts.load('400 1em Montreal'),
    document.fonts.load('700 1em Montreal'),
    document.fonts.load('900 1em Compact'),
    document.fonts.load('400 1em Editorial'),
  ]);
  await document.fonts.ready;
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
