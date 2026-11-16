import type Lenis from 'lenis';
import { initSmoothScroll } from './motion';
import { initReveals } from './reveal';
import { initFooterRotator } from './footer';

/** Motion comune alle pagine con contenuto a scorrimento: smooth scroll, reveal Soft, simbolo del footer. */
export function initSite(): Lenis | null {
  const lenis = initSmoothScroll();
  const main = document.querySelector<HTMLElement>('main');
  if (main) initReveals(main);
  const footer = document.querySelector<HTMLElement>('footer');
  if (footer) initFooterRotator(footer);
  return lenis;
}
