import { gsap, fontsReady, prefersReducedMotion } from './motion';

/**
 * Intro dell'hero, identica al sito attuale: ogni riga sale dalla sua maschera,
 * le note laterali emergono da blur + fade, poi il sottotitolo.
 * `delay` permette di agganciarla alla fine del loader.
 */
export async function playHeroIntro(root: HTMLElement, { delay = 0.5 } = {}): Promise<void> {
  const played = () => root.setAttribute('data-hero-played', '');
  if (prefersReducedMotion()) return played();

  const titles = root.querySelectorAll('.hero-line > span');
  const infos = root.querySelectorAll('.hero-info');
  const sub = root.querySelectorAll('.hero-sub > span');

  // Si toglie il gate CSS e, nello stesso frame, GSAP applica gli stessi valori: nessun salto.
  // L'ordine conta: se GSAP leggesse la `translate` del CSS la sommerebbe al proprio spostamento.
  played();
  gsap.set([...titles, ...sub], { y: 0, yPercent: 100 });
  gsap.set(infos, { autoAlpha: 0, y: 16, filter: 'blur(5px)' });

  await fontsReady(600);

  root.querySelectorAll<HTMLElement>('[data-hero-row]').forEach((row, i) => {
    const tl = gsap.timeline({ delay: delay + i * 0.05, defaults: { ease: 'power4.out' } });
    tl.to(row.querySelectorAll('.hero-line > span'), { yPercent: 0, duration: 1.5 });
    tl.to(row.querySelectorAll('.hero-info'), { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 2, clearProps: 'filter' }, '<+=0.25');
  });
  gsap.to(sub, { yPercent: 0, duration: 1.5, ease: 'power4.out', delay: delay + 0.5 });
}
