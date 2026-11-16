import { gsap, prefersReducedMotion } from '../motion';

export interface GalleryCtx {
  root: HTMLElement;
  stage: HTMLElement;
  slides: HTMLElement[];
  images: HTMLImageElement[];
  titles: HTMLElement[];
  thumbs: HTMLButtonElement[];
  count: number;
}

/** Una variante decide solo come la foto cambia: stato, input, titoli e miniature sono comuni. */
export interface GalleryVariant {
  /** Prepara lo stato iniziale sulla foto `index`. */
  mount(ctx: GalleryCtx, index: number): void | Promise<void>;
  /** Passa da `from` a `to`; `dir` 1 = avanti, -1 = indietro. Risolve a transizione finita. */
  go(ctx: GalleryCtx, from: number, to: number, dir: 1 | -1): Promise<void>;
  /** Varianti a trascinamento continuo: la foto segue il dito/mouse. */
  drag?: {
    start(ctx: GalleryCtx): void;
    move(ctx: GalleryCtx, dx: number): void;
    /** Ritorna la foto su cui assestarsi (la variante anima l'assestamento). */
    end(ctx: GalleryCtx, dx: number, vx: number): { to: number; dir: 1 | -1; settle: Promise<void> };
  };
  destroy?(ctx: GalleryCtx): void;
}

export const EASE = 'power3.inOut';
export const DURATION = 1.1;

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Senza motion: cambio istantaneo. */
const instant: GalleryVariant = {
  mount() {},
  async go(ctx, from, to) {
    gsap.set(ctx.slides[from], { autoAlpha: 0 });
    gsap.set(ctx.slides[to], { autoAlpha: 1 });
  },
};

export function getCtx(root: HTMLElement): GalleryCtx {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
  return {
    root,
    stage: root.querySelector<HTMLElement>('[data-gallery-stage]')!,
    slides,
    images: slides.map((s) => s.querySelector('img')!),
    titles: [...root.querySelectorAll<HTMLElement>('[data-gallery-title]')],
    thumbs: [...root.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]')],
    count: slides.length,
  };
}

/** Titolo e numero cambiano con il gesto del loader: il vecchio esce verso l'alto, il nuovo sale dal basso. */
function rollTitle(ctx: GalleryCtx, from: number, to: number, dir: 1 | -1, instantly: boolean) {
  const out = ctx.titles[from];
  const inn = ctx.titles[to];
  const index = ctx.root.querySelector<HTMLElement>('[data-gallery-index]')!;
  const d = instantly ? 0 : DURATION;
  const tl = gsap.timeline();
  tl.set(inn, { visibility: 'visible' });
  tl.fromTo(out, { yPercent: 0 }, { yPercent: -100 * dir, duration: d, ease: EASE }, 0);
  tl.fromTo(inn, { yPercent: 100 * dir }, { yPercent: 0, duration: d, ease: EASE }, 0);
  tl.set(out, { visibility: 'hidden', yPercent: 0 });
  // il numero rotola nello stesso modo, a metà del gesto
  tl.to(index, { yPercent: -100 * dir, duration: d / 2, ease: 'power3.in' }, 0);
  tl.add(() => void (index.textContent = String(to + 1)), d / 2);
  tl.fromTo(index, { yPercent: 100 * dir }, { yPercent: 0, duration: d / 2, ease: 'power3.out' }, d / 2);
  return tl;
}

/** Porta la miniatura attiva al centro della fila. */
function revealThumb(ctx: GalleryCtx, i: number, instantly: boolean) {
  const strip = ctx.root.querySelector<HTMLElement>('[data-gallery-thumbs]')!;
  const t = ctx.thumbs[i].getBoundingClientRect();
  const s = strip.getBoundingClientRect();
  const target = Math.max(0, Math.min(strip.scrollWidth - s.width, strip.scrollLeft + t.left - s.left - (s.width - t.width) / 2));
  gsap.to(strip, { scrollLeft: target, duration: instantly ? 0 : 0.9, ease: EASE, overwrite: true });
}

export function initGallery(root: HTMLElement, chosen: GalleryVariant): () => void {
  const ctx = getCtx(root);
  const reduced = prefersReducedMotion();
  const variant = reduced ? instant : chosen;
  let index = 0;
  let busy = false;
  let pending: { to: number; dir: 1 | -1 } | null = null;

  const setActive = (to: number) => {
    index = to;
    root.dataset.index = String(to);
    ctx.slides.forEach((s, k) => s.toggleAttribute('data-active', k === to));
    ctx.titles.forEach((t, k) => t.toggleAttribute('data-active', k === to));
    ctx.thumbs.forEach((t, k) => t.setAttribute('aria-current', String(k === to)));
    revealThumb(ctx, to, reduced);
  };
  const setBusy = (b: boolean) => {
    busy = b;
    root.toggleAttribute('data-busy', b);
  };

  // le foto si chiedono una alla volta: i clic durante una transizione portano all'ultima scelta
  const go = async (to: number, dir: 1 | -1) => {
    to = wrap(to, ctx.count);
    if (busy) {
      pending = { to, dir };
      return;
    }
    if (to === index) return;
    const from = index;
    setBusy(true);
    setActive(to);
    const title = rollTitle(ctx, from, to, dir, reduced);
    await Promise.all([variant.go(ctx, from, to, dir), title.then()]);
    setBusy(false);
    if (pending) {
      const p = pending;
      pending = null;
      if (p.to !== index) go(p.to, p.to > index ? 1 : -1);
    }
  };
  const next = () => go(index + 1, 1);
  const prev = () => go(index - 1, -1);

  // miniature
  const onThumb = (e: Event) => {
    const i = ctx.thumbs.indexOf(e.currentTarget as HTMLButtonElement);
    go(i, i > index ? 1 : -1);
  };
  ctx.thumbs.forEach((t) => t.addEventListener('click', onThumb));

  // tastiera
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  };
  window.addEventListener('keydown', onKey);

  // rotella sulla foto: un passo per gesto
  let wheelLock = 0;
  const onWheel = (e: WheelEvent) => {
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 8) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelLock = now + 700;
    delta > 0 ? next() : prev();
  };
  ctx.stage.addEventListener('wheel', onWheel, { passive: false });

  // trascinamento sulla foto
  let down: { x: number; t: number; lastX: number; lastT: number; vx: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (busy && !variant.drag) return;
    down = { x: e.clientX, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
    ctx.stage.setPointerCapture(e.pointerId);
    variant.drag?.start(ctx);
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dt = e.timeStamp - down.lastT;
    if (dt > 0) down.vx = (e.clientX - down.lastX) / dt;
    down.lastX = e.clientX;
    down.lastT = e.timeStamp;
    variant.drag?.move(ctx, e.clientX - down.x);
  };
  const onUp = async (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const vx = down.vx;
    down = null;
    if (variant.drag) {
      const { to, dir, settle } = variant.drag.end(ctx, dx, vx);
      let title: Promise<unknown> = Promise.resolve();
      setBusy(true);
      if (to !== index) {
        const from = index;
        setActive(to);
        title = rollTitle(ctx, from, to, dir, reduced).then();
      }
      await Promise.all([settle, title]);
      setBusy(false);
      return;
    }
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  };
  ctx.stage.addEventListener('pointerdown', onDown);
  ctx.stage.addEventListener('pointermove', onMove);
  ctx.stage.addEventListener('pointerup', onUp);
  ctx.stage.addEventListener('pointercancel', onUp);

  setActive(0);
  variant.mount(ctx, 0);

  return () => {
    ctx.thumbs.forEach((t) => t.removeEventListener('click', onThumb));
    window.removeEventListener('keydown', onKey);
    ctx.stage.removeEventListener('wheel', onWheel);
    ctx.stage.removeEventListener('pointerdown', onDown);
    ctx.stage.removeEventListener('pointermove', onMove);
    ctx.stage.removeEventListener('pointerup', onUp);
    ctx.stage.removeEventListener('pointercancel', onUp);
    variant.destroy?.(ctx);
  };
}
