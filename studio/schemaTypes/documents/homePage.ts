import { defineArrayMember, defineField, defineType } from 'sanity';

// L'hero ha un layout fisso: ogni campo ha la sua posizione (vedi le descrizioni).
const line = (name: string, title: string, description: string) =>
  defineField({ name, title, description, type: 'string', validation: (r) => r.required() });
const note = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    description: `${description} Al massimo due righe.`,
    type: 'array',
    of: [defineArrayMember({ type: 'string' })],
    validation: (r) => r.max(2),
  });

export const homePage = defineType({
  name: 'homePage',
  title: 'Home',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'sections', title: 'Sezioni' },
    { name: 'projects', title: 'Progetti' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        line('line1', 'Riga 1', 'Prima riga del titolo (es. il nome).'),
        line('line2', 'Riga 2', 'Seconda riga, spostata a destra.'),
        line('line3', 'Riga 3', 'Terza riga.'),
        line('line4', 'Riga 4, prima della &', 'Quarta riga, prima del simbolo &.'),
        line('line5', 'Riga 4, dopo la &', 'Quarta riga, dopo il simbolo &.'),
        note('note1', 'Nota della riga 1', 'A destra della riga 1, visibile anche su mobile.'),
        note('note2', 'Nota della riga 2', 'A sinistra della riga 2, solo desktop.'),
        note('note3', 'Nota della riga 3', 'A destra della riga 3, solo desktop.'),
        defineField({
          name: 'subtitle',
          title: 'Sottotitolo',
          description: 'Un solo paragrafo: il sito mostra il sottotitolo su una riga.',
          type: 'richText',
          validation: (r) => r.max(1),
        }),
      ],
    }),
    defineField({
      name: 'linkColumns',
      title: 'Colonne sotto l’hero',
      description: 'Esattamente tre colonne (es. Open info, AI Journal, Fav readings).',
      type: 'array',
      group: 'sections',
      of: [
        defineArrayMember({
          name: 'linkColumn',
          title: 'Colonna',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Titolo', type: 'string', validation: (r) => r.required() }),
            defineField({
              name: 'items',
              title: 'Righe',
              description: 'Una voce per riga; con un indirizzo diventa un link.',
              type: 'array',
              of: [defineArrayMember({ type: 'link' })],
            }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
      validation: (r) => r.required().length(3),
    }),
    defineField({
      name: 'manifesto',
      title: 'Manifesto',
      type: 'object',
      group: 'sections',
      fields: [
        defineField({ name: 'kicker', title: 'Titolino', type: 'string' }),
        defineField({ name: 'body', title: 'Testo', type: 'richText' }),
        defineField({ name: 'alsoTitle', title: 'Sottotitolo', type: 'string' }),
        defineField({ name: 'alsoText', title: 'Testo accanto al sottotitolo', type: 'string' }),
      ],
    }),
    defineField({
      name: 'projects',
      title: 'Progetti in home',
      description: 'Quali progetti e in che ordine.',
      type: 'array',
      group: 'projects',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'project' }] })],
      validation: (r) => r.unique(),
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Home' }) },
});
