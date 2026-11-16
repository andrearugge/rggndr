/**
 * Monogram "Rullo": RUGGERI ANDREA diventa RGGNDR. Le lettere rotolano sempre verso l'alto, a onde
 * (prima le pari, poi le dispari, poi tutte); all'ultima onda le superflue rotolano su una cella vuota
 * ed escono dalla maschera, poi i vuoti si chiudono. Le lettere ferme restano sempre sulla stessa baseline
 * e nessuna sparisce per dissolvenza.
 */
export interface Ctx {
  root: HTMLElement;
  name: HTMLElement;
  letters: HTMLElement[];
  columns: HTMLElement[];
  spaces: HTMLElement[];
  /** Quando ogni lettera superflua è quasi uscita: il suo vuoto può iniziare a chiudersi da lì. */
  exitEnd: Map<HTMLElement, number>;
}

const EASE = 'power3.inOut';

/** Onde senza collisioni: la terza parte quando la seconda ha finito, con lo stesso ritardo tra lettere. */
const WAVES = [
  { at: 0.4, d: 0.9, st: 0.05 },
  { at: 0.95, d: 0.7, st: 0.035 },
  { at: 1.75, d: 0.55, st: 0.035 },
];

/** Prepara il nome: ogni lettera ha larghezza e altezza fisse, così nessuna si sposta dalla baseline. */
export function setup(root: HTMLElement): Ctx {
  const name = root.querySelector<HTMLElement>('[data-loader-name]')!;
  const letters = [...root.querySelectorAll<HTMLElement>('[data-loader-letter]')];
  const spaces = [...root.querySelectorAll<HTMLElement>('[data-loader-space]')];
  const sizes = letters.map((l) => l.getBoundingClientRect());
  letters.forEach((l, i) => {
    l.style.width = `${sizes[i].width}px`;
    l.style.height = `${sizes[i].height}px`;
  });
  spaces.forEach((s) => (s.style.width = `${s.getBoundingClientRect().width}px`));
  return {
    root,
    name,
    letters,
    columns: letters.map((l) => l.firstElementChild as HTMLElement),
    spaces,
    exitEnd: new Map(),
  };
}

/** Aggiunge le celle `extra` sotto la lettera, bloccando la maschera su una cella. Ritorna la colonna. */
export function prepareColumn(letter: HTMLElement, extra: string[]): HTMLElement {
  const column = letter.firstElementChild as HTMLElement;
  // La maschera resta alta una lettera: le celle aggiunte scorrono dentro, non la allargano.
  const first = (column.firstElementChild as HTMLElement).getBoundingClientRect();
  letter.style.height = `${first.height}px`;
  // la maschera taglia solo sopra e sotto: le lettere larghe non vengono mai rifilate ai lati
  letter.style.overflow = 'visible';
  letter.style.clipPath = 'inset(0 -100% 0 -100%)';
  letter.style.width = `${first.width}px`;
  column.style.textAlign = 'center';
  for (const c of extra) {
    const cell = document.createElement('span');
    cell.className = 'block';
    cell.textContent = c;
    column.append(cell);
  }
  return column;
}

/** Pianifica un movimento per lettera senza mai sovrapporlo al precedente della stessa lettera. */
function scheduler() {
  const free = new Map<Element, number>();
  let end = 0;
  return {
    at(el: Element, wanted: number, duration: number) {
      const start = Math.max(wanted, free.get(el) ?? 0);
      free.set(el, start + duration);
      end = Math.max(end, start + duration);
      return start;
    },
    get end() {
      return end;
    },
  };
}

/** Aggiunge a `tl` le tre onde del Rullo. Ritorna quando l'ultima rotazione è finita (s). */
export function buildRullo(tl: gsap.core.Timeline, c: Ctx): number {
  const s = scheduler();
  // ogni lettera rotola due volte: le pari al primo battito, le dispari al secondo, tutte al terzo.
  // Le superflue hanno una cella in meno: all'ultima onda escono dalla maschera verso l'alto.
  c.letters.forEach((l, i) => {
    const ch = l.dataset.char!;
    const keep = l.hasAttribute('data-keep');
    prepareColumn(l, keep ? [ch, ch] : [ch]);
    const n = keep ? 3 : 2;
    [i % 2 === 0 ? 0 : 1, 2].forEach((w, step) => {
      const wave = WAVES[w];
      const start = s.at(l, wave.at + i * wave.st, wave.d);
      tl.to(c.columns[i], { yPercent: (-100 / n) * (step + 1), duration: wave.d, ease: EASE }, start);
      if (!keep && step === 1) c.exitEnd.set(l, start + wave.d - 0.15); // quasi uscita: il vuoto inizia a chiudersi
    });
  });
  return s.end;
}

/**
 * Compatto: gli spazi lasciati dalle lettere superflue si chiudono a catena, ognuno appena la lettera
 * prima di lui è uscita. Ritorna la fine.
 */
export function closeUp(tl: gsap.core.Timeline, c: Ctx, at: number): number {
  const D = 0.6;
  let end = at;
  const gaps = [...c.letters, ...c.spaces]
    .filter((el) => !el.hasAttribute('data-keep'))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  let prevReady = at;
  gaps.forEach((el, k) => {
    // uno spazio è pronto quando la lettera prima di lui è uscita
    const ready = c.exitEnd.get(el) ?? (c.exitEnd.size ? prevReady : at + 0.02 * k);
    prevReady = ready;
    tl.to(el, { width: 0, duration: D, ease: EASE }, ready);
    end = Math.max(end, ready + D);
  });
  return end;
}
