import { gsap, prefersReducedMotion } from './motion';

/** Il simbolo del footer ruota di un giro mentre il footer attraversa lo schermo, come sul sito attuale. */
export function initFooterRotator(footer: HTMLElement): () => void {
  const rotator = footer.querySelector('[data-footer-rotator]');
  if (!rotator || prefersReducedMotion()) return () => {};
  const tween = gsap.to(rotator, {
    rotate: 360,
    ease: 'none',
    scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom top', scrub: true },
  });
  return () => tween.revert();
}
