/**
 * HTML dei campi WYSIWYG di WordPress → Portable Text dello schema `richText`
 * (paragrafi, grassetto, corsivo, link). Gli spazi seguono le regole dell'HTML; <br> diventa "\n".
 * Un tag che lo schema non conosce perde la formattazione (resta il testo) e finisce negli avvisi.
 */
import { HTMLElement, NodeType, parse, type Node } from 'node-html-parser';

export type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
export type LinkDef = { _type: 'link'; _key: string; href: string };
export type Block = { _type: 'block'; _key: string; style: 'normal'; markDefs?: LinkDef[]; children: Span[] };

type Segment = { text: string; marks: string[] };

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']);

export function htmlToBlocks(html: string, keyPrefix: string): { blocks: Block[]; warnings: string[] } {
  const warnings: string[] = [];
  const raw: { segments: Segment[]; links: LinkDef[] }[] = [];
  let current: { segments: Segment[]; links: LinkDef[] } | null = null;
  const open = () => (current ??= (raw.push({ segments: [], links: [] }), raw[raw.length - 1]));
  const close = () => (current = null);

  const walk = (node: Node, marks: string[]) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = node.text.replace(/\s+/g, ' ');
      if (text) open().segments.push({ text, marks });
      return;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.rawTagName?.toLowerCase() ?? '';
    const children = () => el.childNodes.forEach((c) => walk(c, marks));

    if (BLOCK_TAGS.has(tag)) {
      if (tag !== 'p') warnings.push(`<${tag}> trattato come paragrafo`);
      close();
      el.childNodes.forEach((c) => walk(c, marks));
      close();
    } else if (tag === 'br') open().segments.push({ text: '\n', marks });
    else if (tag === 'b' || tag === 'strong') el.childNodes.forEach((c) => walk(c, [...marks, 'strong']));
    else if (tag === 'i' || tag === 'em') el.childNodes.forEach((c) => walk(c, [...marks, 'em']));
    else if (tag === 'a' && el.getAttribute('href')) {
      const block = open();
      const def: LinkDef = {
        _type: 'link',
        _key: `${keyPrefix}-${raw.indexOf(block)}-l${block.links.length}`,
        href: el.getAttribute('href')!,
      };
      block.links.push(def);
      el.childNodes.forEach((c) => walk(c, [...marks, def._key]));
    } else {
      if (tag) warnings.push(`<${tag}> non gestito: resta solo il testo`);
      children();
    }
  };
  parse(html).childNodes.forEach((n) => walk(n, []));

  const blocks: Block[] = [];
  for (const [b, { segments, links }] of raw.entries()) {
    const prefix = `${keyPrefix}-${b}`;
    const segs = normalize(segments);
    if (!segs.length) continue;
    blocks.push({
      _type: 'block',
      _key: prefix,
      style: 'normal',
      ...(links.length ? { markDefs: links } : {}),
      children: segs.map((s, i) => ({ _type: 'span', _key: `${prefix}-${i}`, text: s.text, marks: s.marks })),
    });
  }
  return { blocks, warnings: [...new Set(warnings)] };
}

/** Spazi come nell'HTML: niente spazi ai bordi del paragrafo né intorno agli a capo; span uguali uniti. */
function normalize(segments: Segment[]): Segment[] {
  const segs = segments.map((s) => ({ ...s }));
  for (let i = 0; i < segs.length; i++) {
    const prev = segs[i - 1];
    if (segs[i].text === '\n') {
      if (prev) prev.text = prev.text.replace(/ +$/, '');
      if (segs[i + 1]) segs[i + 1].text = segs[i + 1].text.replace(/^ +/, '');
    } else if (prev && / $/.test(prev.text)) segs[i].text = segs[i].text.replace(/^ +/, '');
  }
  if (segs.length) {
    segs[0].text = segs[0].text.replace(/^\s+/, '');
    segs[segs.length - 1].text = segs[segs.length - 1].text.replace(/\s+$/, '');
  }
  const merged: Segment[] = [];
  for (const s of segs.filter((s) => s.text)) {
    const last = merged[merged.length - 1];
    if (last && last.marks.join() === s.marks.join()) last.text += s.text;
    else merged.push(s);
  }
  return merged;
}
