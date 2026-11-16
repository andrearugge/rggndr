import { gsap } from '../motion';
import { DURATION, EASE, type GalleryCtx, type GalleryVariant } from './core';

/**
 * Le foto stanno su una striscia orizzontale infinita: si trascinano con il mouse o il dito
 * e si assestano sulla più vicina. Dentro ogni foto l'immagine scorre più lenta (parallasse).
 */
const GAP = 24;
const PARALLAX = 0.3;

let pos = 0;
let tween: gsap.core.Tween | null = null;
let resolveTween: (() => void) | null = null;
let dragFrom = 0;

const wrap = (v: number, n: number) => ((v % n) + n) % n;
const width = (ctx: GalleryCtx) => ctx.stage.getBoundingClientRect().width + GAP;

function render(ctx: GalleryCtx) {
  const W = width(ctx);
  const n = ctx.count;
  ctx.slides.forEach((s, i) => {
    // distanza della foto dal centro, sul cerchio delle n foto
    const o = wrap(i - pos + n / 2, n) - n / 2;
    const near = Math.abs(o) < 1 - 1e-4;
    gsap.set(s, { x: o * W, autoAlpha: near ? 1 : 0 });
    gsap.set(ctx.images[i], { x: near ? -o * W * PARALLAX : 0 });
  });
}

function animateTo(ctx: GalleryCtx, target: number, duration: number, ease: string) {
  stop();
  return new Promise<void>((resolve) => {
    resolveTween = resolve;
    tween = gsap.to({ p: pos }, {
      p: target,
      duration,
      ease,
      onUpdate() {
        pos = (this.targets()[0] as { p: number }).p;
        render(ctx);
      },
      onComplete() {
        pos = wrap(Math.round(target), ctx.count);
        render(ctx);
        tween = null;
        resolveTween = null;
        resolve();
      },
    });
  });
}

/** Interrompe l'assestamento in corso (es. un nuovo trascinamento) senza lasciare promesse appese. */
function stop() {
  tween?.kill();
  tween = null;
  resolveTween?.();
  resolveTween = null;
}

export const scorrimento: GalleryVariant = {
  mount(ctx, index) {
    ctx.stage.style.overflow = 'hidden';
    ctx.stage.style.cursor = 'grab';
    pos = index;
    render(ctx);
  },
  go(ctx, from, to, dir) {
    const n = ctx.count;
    const k = wrap(to - Math.round(pos), n);
    const delta = dir > 0 ? k || n : k - n;
    const duration = Math.min(DURATION + 0.04 * (Math.abs(delta) - 1), 1.6);
    return animateTo(ctx, pos + delta, duration, EASE);
  },
  drag: {
    start(ctx) {
      stop();
      dragFrom = pos;
      ctx.stage.style.cursor = 'grabbing';
    },
    move(ctx, dx) {
      pos = dragFrom - dx / width(ctx);
      render(ctx);
    },
    end(ctx, dx, vx) {
      ctx.stage.style.cursor = 'grab';
      const W = width(ctx);
      // lancio: la velocità sposta la destinazione, ma al massimo di una foto
      const projected = pos - (Math.max(-2, Math.min(2, vx)) * 180) / W;
      const base = Math.round(dragFrom);
      const target = Math.max(base - 1, Math.min(base + 1, Math.round(projected)));
      const settle = animateTo(ctx, target, 0.8, 'power3.out');
      return { to: wrap(target, ctx.count), dir: target >= dragFrom ? 1 : -1, settle };
    },
  },
  destroy() {
    stop();
  },
};
