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
  node: Text;
  offset: number;
}

/**
 * Divide `el` in righe usando il layout reale del browser: misura la posizione verticale
 * di ogni carattere nel testo originale e taglia dove il browser va a capo.
 * Le righe risultanti coincidono per costruzione con quelle del testo non animato.
 */
export function splitLines(el: HTMLElement, options: LineSplitOptions = {}): LineSplit {
  const original = el.innerHTML;
  const starts = findLineStarts(el);

  const fragments: DocumentFragment[] = [];
  for (let i = 0; i < starts.length; i++) {
    const range = document.createRange();
    range.setStart(starts[i].node, starts[i].offset);
    if (i + 1 < starts.length) range.setEnd(starts[i + 1].node, starts[i + 1].offset);
    else range.setEnd(el, el.childNodes.length);
    fragments.push(range.cloneContents());
  }

  const lines: HTMLElement[] = [];
  const words: HTMLElement[] = [];
  el.textContent = '';

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
      el.append(mask);
    } else {
      el.append(line);
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
  let lastTop = Number.NaN;
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
      if (starts.length === 0 || Math.abs(rect.top - lastTop) > rect.height / 2) {
        starts.push({ node: text, offset: i });
      }
      lastTop = rect.top;
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
  onSplit: (split: LineSplit) => { revert(): unknown } | void,
): () => void {
  let split: LineSplit | null = null;
  let anim: { revert(): unknown } | void;
  let width = -1;
  let frame = 0;

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

  const observer = new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    if (w === width) return;
    width = w;
    schedule();
  });

  run();
  width = Math.round(el.getBoundingClientRect().width);
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
