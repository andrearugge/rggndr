import { gsap, fontsReady, prefersReducedMotion } from './motion';

export type CardVariant = 'originale' | 'lucida' | 'rilievo' | 'foil' | 'mazzo';
export const CARD_VARIANTS: CardVariant[] = ['originale', 'lucida', 'rilievo', 'foil', 'mazzo'];

/** Inclinazione massima (gradi) e quanto la card si solleva al passaggio del mouse. */
const MAX_TILT = 10;
const LIFT = 24;
/** Il mouse "aggancia" la card anche poco fuori dai suoi bordi (frazione della dimensione). */
const REACH = 0.15;

/** Editorial è usato solo nella card: si aspetta anche lui prima di mostrarla pronta. */
const cardFonts = () =>
  Promise.race([
    Promise.allSettled([document.fonts.load('400 1em Editorial'), fontsReady(1200)]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

export function initCard(root: HTMLElement, variant: CardVariant): () => void {
  root.dataset.variant = variant;
  const front = root.querySelector<HTMLElement>('[data-card-front]')!;
  const light = root.querySelector<SVGElement>('[data-card-light]');
  const foil = root.querySelector<SVGElement>('[data-card-foil]');
  const flipBtn = root.querySelector<HTMLButtonElement>('[data-card-flip]');
  cardFonts().then(() => root.toggleAttribute('data-ready', true));

  // stato smussato: posizione normalizzata del puntatore (-1..1), presenza del mouse (0..1), giro (0/1)
  const s = { nx: 0, ny: 0, hover: 0, flip: 0 };
  const apply = () => {
    const rx = -s.ny * MAX_TILT;
    const ry = s.nx * MAX_TILT + s.flip * 180;
    // ruota attorno al centro della card (l'origine 0 0 serve solo alla rotazione di -3° dell'originale)
    front.style.transform = `translate(50%, 50%) perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${s.hover * LIFT}px) translate(-50%, -50%)`;
    front.style.setProperty('--nx', s.nx.toFixed(4));
    front.style.setProperty('--ny', s.ny.toFixed(4));
    front.style.setProperty('--px', `${((s.nx + 1) / 2) * 100}%`);
    front.style.setProperty('--py', `${((s.ny + 1) / 2) * 100}%`);
    front.style.setProperty('--hover', s.hover.toFixed(4));
    // la luce del rilievo sta sopra il punto indicato dal mouse (coordinate del logo ≈ card + origine)
    // card larga 524×340; il logo usa le coordinate del file originale (spostate di 14.5, 40.4)
    light?.setAttribute('x', String(((s.nx + 1) / 2) * 524 + 14.5));
    light?.setAttribute('y', String(((s.ny + 1) / 2) * 340 + 40.4 - 70));
    // la lamina scorre in senso opposto all'inclinazione, come un riflesso vero
    if (foil) {
      foil.setAttribute('x1', String(24 - s.nx * 260));
      foil.setAttribute('x2', String(500 - s.nx * 260));
    }
  };
  apply();

  if (prefersReducedMotion()) {
    return () => {
      delete root.dataset.variant;
      front.style.transform = '';
    };
  }

  const ease = { duration: 0.8, ease: 'power3.out', onUpdate: apply };
  const toX = gsap.quickTo(s, 'nx', ease);
  const toY = gsap.quickTo(s, 'ny', ease);
  const toH = gsap.quickTo(s, 'hover', { ...ease, duration: 0.6 });

  const onMove = (e: PointerEvent) => {
    // rettangolo della card dritta: il bordo esterno della scena, allargato un poco
    const r = root.getBoundingClientRect();
    const inside =
      e.clientX > r.left - r.width * REACH &&
      e.clientX < r.right + r.width * REACH &&
      e.clientY > r.top - r.height * REACH &&
      e.clientY < r.bottom + r.height * REACH;
    if (!inside) return onLeave();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    toX(nx);
    toY(ny);
    toH(1);
    root.toggleAttribute('data-hover', true);
  };
  const onLeave = () => {
    toX(0);
    toY(0);
    toH(0);
    root.toggleAttribute('data-hover', false);
  };
  window.addEventListener('pointermove', onMove);
  document.documentElement.addEventListener('pointerleave', onLeave);

  // mazzo: al clic (fuori dai link) la card si gira
  const flip = () => {
    if (variant !== 'mazzo') return;
    gsap.to(s, { flip: s.flip > 0.5 ? 0 : 1, duration: 1, ease: 'power3.inOut', onUpdate: apply });
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    flip();
  };
  front.addEventListener('click', onClick);
  flipBtn?.addEventListener('click', flip);
  if (variant === 'mazzo') front.style.cursor = 'pointer';

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    front.removeEventListener('click', onClick);
    flipBtn?.removeEventListener('click', flip);
    gsap.killTweensOf(s);
    s.nx = s.ny = s.hover = s.flip = 0;
    apply();
    front.style.cursor = '';
    root.removeAttribute('data-hover');
  };
}
