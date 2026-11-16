import { gsap, prefersReducedMotion } from './motion';

/**
 * Gallery con slider infinito (riferimento: brunoarizio.com).
 * Le miniature scorrono all'infinito con rotella, trascinamento (con inerzia) e frecce; a riposo si
 * assestano con una miniatura allineata all'inizio dello slider: quella è attiva e decide titolo,
 * numero e foto. Mentre scorri, titolo e foto seguono la miniatura che passa sull'inizio;
 * la foto cambia con uno stacco netto, come nel riferimento.
 */
const GAP = 8; // gap-2
const LERP = 0.12; // inseguimento morbido della posizione (per frame a 60fps)
const SNAP_IDLE = 140; // ms senza rotella prima di assestarsi
const THROW = 260; // quanto lontano lancia la velocità al rilascio (ms)
const EASE = 'power3.out';

const wrap = (v: number, n: number) => ((v % n) + n) % n;

export function initGallery(root: HTMLElement): () => void {
  const reduced = prefersReducedMotion();
  const strip = root.querySelector<HTMLElement>('[data-gallery-thumbs]')!;
  const track = root.querySelector<HTMLElement>('[data-gallery-track]')!;
  const slides = [...root.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
  const titles = [...root.querySelectorAll<HTMLElement>('[data-gallery-title]')];
  const indexEl = root.querySelector<HTMLElement>('[data-gallery-index]')!;
  const originals = [...track.querySelectorAll<HTMLElement>('[data-gallery-item]')];
  const n = originals.length;

  // Una copia delle miniature chiude il loop anche su schermi larghi (solo visiva: niente focus né lettori di schermo)
  const copies = originals.map((li) => {
    const c = li.cloneNode(true) as HTMLElement;
    c.inert = true;
    c.querySelector('[data-gallery-thumb]')!.setAttribute('aria-hidden', 'true');
    track.append(c);
    return c;
  });
  const items = [...originals, ...copies];
  const thumbsOf = (i: number) => [originals[i], copies[i]].map((li) => li.querySelector<HTMLElement>('[data-gallery-thumb]')!);

  // Da flusso normale (senza JS) a posizionamento libero
  strip.style.overflow = 'hidden';
  track.style.position = 'relative';
  items.forEach((li) => Object.assign(li.style, { position: 'absolute', top: '0', left: '0', height: '100%' }));

  let starts: number[] = []; // posizione di ogni miniatura originale sul nastro
  let L = 1; // lunghezza di un giro
  let maxW = 0;
  let focus = 0; // lo slider va da bordo a bordo: la miniatura attiva si allinea al titolo (padding del contenitore)
  const measure = () => {
    focus = parseFloat(getComputedStyle(root).paddingLeft) || 0;
    const widths = originals.map((li) => li.getBoundingClientRect().width);
    maxW = Math.max(...widths);
    starts = [];
    let x = 0;
    for (const w of widths) {
      starts.push(x);
      x += w + GAP;
    }
    L = x;
  };

  let current = 0; // posizione mostrata
  let target = 0; // posizione desiderata
  let active = 0;

  const render = () => {
    const total = 2 * L;
    items.forEach((li, j) => {
      const base = j < n ? starts[j] : L + starts[j - n];
      // ogni miniatura sta sul giro più vicino all'inizio dello slider
      const x = wrap(base - current + focus + maxW + GAP, total) - maxW - GAP;
      li.style.transform = `translate3d(${x}px,0,0)`;
    });
    const nearest = starts.reduce(
      (best, s, i) => {
        const d = Math.abs(wrap(s - current + L / 2, L) - L / 2);
        return d < best.d ? { i, d } : best;
      },
      { i: 0, d: Infinity },
    ).i;
    if (nearest !== active) setActive(nearest, Math.sign(target - current) >= 0 ? 1 : -1);
  };

  // --- titolo, numero, foto ---------------------------------------------------
  let titleTl: gsap.core.Timeline | null = null;

  function setActive(i: number, dir: 1 | -1) {
    const prev = active;
    active = i;
    root.dataset.index = String(i);
    indexEl.textContent = String(i + 1);
    for (let k = 0; k < n; k++) for (const t of thumbsOf(k)) t.setAttribute('aria-current', String(k === i));
    slides.forEach((s, k) => s.toggleAttribute('data-active', k === i));
    titles.forEach((t, k) => t.toggleAttribute('data-active', k === i));

    // titolo: il gesto del loader, il vecchio esce e il nuovo entra nel verso dello scorrimento
    titleTl?.progress(1);
    const d = reduced ? 0 : 0.6;
    titleTl = gsap
      .timeline({ onComplete: () => (titleTl = null) })
      .set(titles, { visibility: 'hidden', yPercent: 0 })
      .set([titles[prev], titles[i]], { visibility: 'visible' })
      .fromTo(titles[prev], { yPercent: 0 }, { yPercent: -100 * dir, duration: d, ease: EASE }, 0)
      .fromTo(titles[i], { yPercent: 100 * dir }, { yPercent: 0, duration: d, ease: EASE }, 0)
      .set(titles[prev], { visibility: 'hidden', yPercent: 0 });

    // foto: stacco netto, come Bruno Arizio (nessuna transizione)
    slides.forEach((sl, k) => (sl.style.visibility = k === i ? 'visible' : 'hidden'));
    updateMoving();
  }

  // --- movimento ---------------------------------------------------------------
  let raf = 0;
  let last = 0;
  let interacting = false;

  const updateMoving = () => {
    const moving = raf !== 0 || interacting || titleTl !== null;
    root.toggleAttribute('data-moving', moving);
  };
  gsap.ticker.add(updateMoving);

  const tick = (now: number) => {
    const dt = last ? now - last : 16.7;
    last = now;
    const k = reduced ? 1 : 1 - Math.pow(1 - LERP, dt / 16.7);
    current += (target - current) * k;
    if (!interacting && Math.abs(target - current) < 0.3) current = target;
    render();
    if (current === target && !interacting) {
      raf = 0;
      last = 0;
      updateMoving();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(tick);
    updateMoving();
  };

  /** La posizione di riposo (miniatura allineata all'inizio) più vicina a `p`. */
  const snapNear = (p: number) => {
    let best = p;
    let d = Infinity;
    for (const s of starts) {
      const c = s + L * Math.round((p - s) / L);
      if (Math.abs(c - p) < d) {
        d = Math.abs(c - p);
        best = c;
      }
    }
    return best;
  };
  /** Porta la miniatura `i` all'inizio, dalla parte di `dir` (o dalla più vicina). */
  const goTo = (i: number, dir?: 1 | -1) => {
    const base = snapNear(target);
    let t = starts[i] + L * Math.round((base - starts[i]) / L);
    if (dir === 1 && t <= base) t += L;
    if (dir === -1 && t >= base) t -= L;
    target = t;
    run();
  };

  // rotella / trackpad: scorre il nastro, poi si assesta
  let idle = 0;
  const onWheel = (e: WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    target += delta;
    clearTimeout(idle);
    idle = window.setTimeout(() => {
      target = snapNear(target);
      run();
    }, SNAP_IDLE);
    run();
  };
  root.addEventListener('wheel', onWheel, { passive: false });

  // trascinamento con inerzia; un tocco senza movimento è un clic sulla miniatura
  let drag: { x: number; from: number; vx: number; lastX: number; lastT: number; moved: boolean } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, from: target, vx: 0, lastX: e.clientX, lastT: e.timeStamp, moved: false };
    strip.setPointerCapture(e.pointerId);
    strip.style.cursor = 'grabbing';
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (!drag.moved) return;
    interacting = true;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.vx = 0.8 * ((e.clientX - drag.lastX) / dt) + 0.2 * drag.vx;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    target = drag.from - dx;
    current = target; // il nastro segue il dito 1:1
    run();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    strip.style.cursor = '';
    if (!d.moved) {
      // clic: la miniatura sotto il puntatore diventa attiva
      const li = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-item]');
      const j = li ? items.indexOf(li) : -1;
      if (j >= 0) goTo(j % n);
      return;
    }
    interacting = false;
    const vx = Math.max(-4, Math.min(4, d.vx));
    target = snapNear(target - vx * THROW);
    run();
  };
  strip.addEventListener('pointerdown', onDown);
  strip.addEventListener('pointermove', onMove);
  strip.addEventListener('pointerup', onUp);
  strip.addEventListener('pointercancel', onUp);

  // tastiera: frecce e invio/spazio sulle miniature (accessibile senza mouse)
  // il passo parte dalla destinazione, non dalla foto attiva: pressioni rapide si sommano
  const targetIndex = () => {
    const p = snapNear(target);
    return starts.findIndex((st) => Math.abs(wrap(p - st + L / 2, L) - L / 2) < 0.5);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') goTo(wrap(targetIndex() + 1, n), 1);
    else if (e.key === 'ArrowLeft') goTo(wrap(targetIndex() - 1, n), -1);
  };
  window.addEventListener('keydown', onKey);
  const onThumbKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-gallery-item]');
    const j = li ? items.indexOf(li) : -1;
    if (j >= 0) {
      e.preventDefault();
      goTo(j % n);
    }
  };
  track.addEventListener('keydown', onThumbKey);

  // la fila non scorre mai da sola (focus, scrollIntoView): la posizione la decide solo lo slider
  const onScroll = () => {
    if (strip.scrollLeft !== 0) strip.scrollLeft = 0;
  };
  strip.addEventListener('scroll', onScroll);
  // da tastiera (Tab) la miniatura che riceve il focus diventa attiva
  const onFocus = (e: FocusEvent) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-gallery-item]');
    const j = li ? items.indexOf(li) : -1;
    if (j >= 0 && j % n !== active && !drag) goTo(j % n);
  };
  track.addEventListener('focusin', onFocus);

  // misure: al via e quando cambia la dimensione (la miniatura attiva resta all'inizio)
  const ro = new ResizeObserver(() => {
    measure();
    current = target = starts[active];
    render();
  });
  measure();
  ro.observe(strip);
  originals.forEach((li) => ro.observe(li));
  render();
  gsap.set(slides, { visibility: 'hidden' });
  gsap.set(slides[0], { visibility: 'visible' });
  gsap.set(titles, { visibility: 'hidden' });
  gsap.set(titles[0], { visibility: 'visible' });
  root.toggleAttribute('data-ready', true);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(idle);
    ro.disconnect();
    gsap.ticker.remove(updateMoving);
    root.removeEventListener('wheel', onWheel);
    strip.removeEventListener('pointerdown', onDown);
    strip.removeEventListener('pointermove', onMove);
    strip.removeEventListener('pointerup', onUp);
    strip.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey);
    track.removeEventListener('keydown', onThumbKey);
    track.removeEventListener('focusin', onFocus);
    strip.removeEventListener('scroll', onScroll);
    copies.forEach((c) => c.remove());
  };
}
