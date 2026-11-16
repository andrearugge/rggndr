import { gsap } from '../motion';
import { DURATION, EASE, type GalleryVariant } from './core';

/** La foto nuova vola dalla sua miniatura al posto grande; la vecchia si chiude verso l'alto per lasciarle spazio. */
export const zoom: GalleryVariant = {
  mount(ctx, index) {
    ctx.slides.forEach((s, k) => gsap.set(s, { autoAlpha: k === index ? 1 : 0 }));
  },
  go(ctx, from, to) {
    const a = ctx.slides[from];
    const b = ctx.slides[to];
    const img = ctx.images[to];
    gsap.set(b, { autoAlpha: 1, zIndex: 3 });
    gsap.set(a, { zIndex: 1 });
    // FLIP: la foto parte esattamente da dove sta la miniatura
    const R = img.getBoundingClientRect();
    const T = ctx.thumbs[to].querySelector('img')!.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.fromTo(
      img,
      { transformOrigin: '0 0', x: T.left - R.left, y: T.top - R.top, scale: T.width / R.width },
      { x: 0, y: 0, scale: 1, duration: DURATION, ease: EASE },
      0,
    );
    tl.fromTo(a, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: DURATION * 0.8, ease: EASE }, 0.1);
    tl.to(ctx.images[from], { yPercent: -8, duration: DURATION * 0.8, ease: EASE }, 0.1);
    tl.set(a, { autoAlpha: 0, clearProps: 'clipPath,zIndex' });
    tl.set(ctx.images[from], { clearProps: 'transform' });
    tl.set(img, { clearProps: 'transform,transformOrigin' });
    tl.set(b, { clearProps: 'zIndex' });
    return tl.then(() => undefined);
  },
};
