import { gsap } from '../motion';
import { DURATION, EASE, type GalleryVariant } from './core';

/** La nuova foto si scopre dal basso (dall'alto tornando indietro), la vecchia sale: il gesto del loader. */
export const rullo: GalleryVariant = {
  mount(ctx, index) {
    ctx.stage.style.overflow = 'hidden';
    ctx.slides.forEach((s, k) => gsap.set(s, { autoAlpha: k === index ? 1 : 0 }));
  },
  go(ctx, from, to, dir) {
    const a = ctx.slides[from];
    const b = ctx.slides[to];
    const tl = gsap.timeline();
    tl.set(a, { zIndex: 1 });
    tl.set(b, { autoAlpha: 1, zIndex: 2, clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' });
    tl.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION, ease: EASE }, 0);
    tl.fromTo(ctx.images[to], { yPercent: 14 * dir, scale: 1.06 }, { yPercent: 0, scale: 1, duration: DURATION, ease: EASE }, 0);
    tl.to(ctx.images[from], { yPercent: -14 * dir, duration: DURATION, ease: EASE }, 0);
    tl.set(a, { autoAlpha: 0, zIndex: 0 });
    tl.set(ctx.images[from], { yPercent: 0 });
    tl.set(b, { clearProps: 'clipPath,zIndex' });
    return tl.then(() => undefined);
  },
};
