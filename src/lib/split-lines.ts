export interface LineSplitOptions {
  /** Avvolge ogni riga in un contenitore con overflow nascosto (per effetti "maschera"). */
  mask?: boolean;
  /** Avvolge anche le parole (inline) dentro le righe. */
  words?: boolean;
}

export interface LineSplit {
  lines: HTMLElement[];
  words: HTMLElement[];
  revert(): void;
}

interface Point {
  node: Node;
  offset: number;
}

function indexInParent(node: Node): number {
  return Array.prototype.indexOf.call(node.parentNode!.childNodes, node);
}

function liftBoundary(root: HTMLElement, p: Point): Point {
  let { node, offset } = p;
  while (offset === 0 && node !== root && node.parentNode) {
    offset = indexInParent(node);
    node = node.parentNode;
  }
  return { node, offset };
}

/**
 * Divide `el` in righe usando il layout reale del browser: misura la posizione verticale
 * di ogni carattere nel testo originale e taglia dove il browser va a capo.
 * Le righe risultanti coincidono per costruzione con quelle del testo non animato.
 */
/** Elementi che non vanno mai duplicati dallo split (link, controlli, id referenziabili). */
const UNSPLITTABLE = 'a, button, input, select, textarea, label, [id], [tabindex], [contenteditable]';

export function splitLines(el: HTMLElement, options: LineSplitOptions = {}): LineSplit | null {
  const found = findLineStarts(el);
  if (found.length === 0) return null; // nascosto o senza testo misurabile

  // Un confine che cade all'inizio di un elemento viene spostato prima dell'elemento:
  // così un link che inizia una riga non lascia una copia vuota nella riga precedente.
  const starts = found.map((p, i) => (i === 0 ? p : liftBoundary(el, p)));

  // Si rifiuta lo split solo se un link/controllo/id verrebbe davvero spezzato su più righe.
  const blockers = [...el.querySelectorAll(UNSPLITTABLE)];
  if (starts.some((p, i) => i > 0 && blockers.some((b) => b.contains(p.node)))) return null;

  const original = el.innerHTML;
  const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim();

  const fragments: DocumentFragment[] = [];
  for (let i = 0; i < starts.length; i++) {
    const range = document.createRange();
    if (i === 0) range.setStart(el, 0); // conserva eventuali nodi prima del primo carattere
    else range.setStart(starts[i].node, starts[i].offset);
    if (i + 1 < starts.length) range.setEnd(starts[i + 1].node, starts[i + 1].offset);
    else range.setEnd(el, el.childNodes.length);
    fragments.push(range.cloneContents());
  }

  const lines: HTMLElement[] = [];
  const words: HTMLElement[] = [];
  el.textContent = '';

  // Gli screen reader leggono il testo una volta sola, non riga per riga.
  const readable = document.createElement('span');
  readable.className = 'sr-only';
  Object.assign(readable.style, {
    position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
    overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0',
  });
  readable.textContent = label;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.style.display = 'block';
  el.append(readable, visual);

  for (const fragment of fragments) {
    const line = document.createElement('span');
    line.className = 'line';
    line.style.display = 'block';
    if (options.words) words.push(...wrapWords(fragment));
    line.append(fragment);

    if (options.mask) {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      // un po' di respiro per non tagliare ascendenti/discendenti con interlinee strette
      Object.assign(mask.style, { display: 'block', overflow: 'clip', paddingBlock: '0.12em', marginBlock: '-0.12em' });
      mask.append(line);
      visual.append(mask);
    } else {
      visual.append(line);
    }
    lines.push(line);
  }

  return {
    lines,
    words,
    revert() {
      el.innerHTML = original;
    },
  };
}

function findLineStarts(el: HTMLElement): Point[] {
  const starts: Point[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let lastLeft = Number.NaN;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = node as Text;
    const value = text.data;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (/\s/.test(value[i]) || (code >= 0xdc00 && code <= 0xdfff)) continue;
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      // Nuova riga quando il carattere torna a sinistra del precedente (testo LTR).
      // Il confronto orizzontale regge anche con corpi diversi sulla stessa riga.
      if (starts.length === 0 || rect.left < lastLeft - 0.5) {
        starts.push({ node: text, offset: i });
      }
      lastLeft = rect.left;
    }
  }
  return starts;
}

function wrapWords(fragment: DocumentFragment): HTMLElement[] {
  const words: HTMLElement[] = [];
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) texts.push(node as Text);

  for (const text of texts) {
    const parts = text.data.split(/(\s+)/);
    const out = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        out.append(part);
      } else {
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = part;
        out.append(word);
        words.push(word);
      }
    }
    text.replaceWith(out);
  }
  return words;
}

/**
 * Come `splitLines`, ma rifà lo split quando cambia la larghezza dell'elemento o
 * quando finiscono di caricare dei font. `onSplit` può restituire un'animazione:
 * viene annullata (`revert`) prima di ogni nuovo split e al cleanup.
 */
export function autoSplitLines(
  el: HTMLElement,
  options: LineSplitOptions,
  onSplit: (split: LineSplit | null) => { revert(): unknown } | void,
): () => void {
  let split: LineSplit | null = null;
  let anim: { revert(): unknown } | void;
  let key = '';
  let frame = 0;
  const measure = () => `${Math.round(el.getBoundingClientRect().width)}|${getComputedStyle(el).fontSize}`;

  const run = () => {
    if (anim) anim.revert();
    if (split) split.revert();
    split = splitLines(el, options);
    anim = onSplit(split);
  };

  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(run);
  };

  // Si rifà lo split se cambia la larghezza o il corpo del testo (es. breakpoint che cambia solo il font-size).
  const observer = new ResizeObserver(() => {
    const k = measure();
    if (k === key) return;
    key = k;
    schedule();
  });

  run();
  key = measure();
  observer.observe(el);
  document.fonts.addEventListener('loadingdone', schedule);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.fonts.removeEventListener('loadingdone', schedule);
    if (anim) anim.revert();
    if (split) split.revert();
    split = null;
    anim = undefined;
  };
}
