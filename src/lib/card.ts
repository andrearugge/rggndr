import { gsap, fontsReady, prefersReducedMotion } from './motion';

/** Inclinazione massima (gradi) e quanto la card si solleva al passaggio del mouse: movimento discreto. */
const MAX_TILT = 5;
const LIFT = 8;
/** Il mouse "aggancia" la card anche poco fuori dai suoi bordi (frazione della dimensione). */
const REACH = 0.15;

/** Editorial è usato solo nella card: si aspetta anche lui prima di mostrarla pronta. */
const cardFonts = () =>
  Promise.race([
    Promise.allSettled([document.fonts.load('400 1em Editorial'), fontsReady(1200)]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

/** La card segue il mouse con una leggera inclinazione 3D; l'ombra si sposta dal lato opposto. */
export function initCard(root: HTMLElement): () => void {
  const front = root.querySelector<HTMLElement>('[data-card-front]')!;
  cardFonts().then(() => root.toggleAttribute('data-ready', true));

  // stato smussato: posizione normalizzata del puntatore (-1..1) e presenza del mouse (0..1)
  const s = { nx: 0, ny: 0, hover: 0 };
  const apply = () => {
    // ruota attorno al centro (l'origine 0 0 serve solo alla rotazione di -3° dell'originale)
    front.style.transform = `translate(50%, 50%) perspective(1400px) rotateX(${-s.ny * MAX_TILT}deg) rotateY(${s.nx * MAX_TILT}deg) translateZ(${s.hover * LIFT}px) translate(-50%, -50%)`;
    front.style.setProperty('--nx', s.nx.toFixed(4));
    front.style.setProperty('--ny', s.ny.toFixed(4));
    front.style.setProperty('--hover', s.hover.toFixed(4));
  };
  apply();
  if (prefersReducedMotion()) return () => {};

  const ease = { duration: 0.8, ease: 'power3.out', onUpdate: apply };
  const toX = gsap.quickTo(s, 'nx', ease);
  const toY = gsap.quickTo(s, 'ny', ease);
  const toH = gsap.quickTo(s, 'hover', { ...ease, duration: 0.6 });

  const onLeave = () => {
    toX(0);
    toY(0);
    toH(0);
  };
  const onMove = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const inside =
      e.clientX > r.left - r.width * REACH &&
      e.clientX < r.right + r.width * REACH &&
      e.clientY > r.top - r.height * REACH &&
      e.clientY < r.bottom + r.height * REACH;
    if (!inside) return onLeave();
    toX(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)));
    toY(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)));
    toH(1);
  };
  window.addEventListener('pointermove', onMove);
  document.documentElement.addEventListener('pointerleave', onLeave);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(s);
  };
}
