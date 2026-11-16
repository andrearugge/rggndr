import { defineField, defineType } from 'sanity';

/** SEO della pagina. I campi vuoti prendono i valori delle impostazioni del sito (M3). */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: 'title', title: 'Titolo', type: 'string' }),
    defineField({ name: 'description', title: 'Descrizione', type: 'text', rows: 3 }),
    defineField({
      name: 'ogImage',
      title: 'Immagine per le condivisioni',
      description: 'Se vuota, il sito ne genera una (1200×630).',
      type: 'imageWithAlt',
    }),
    defineField({
      name: 'noindex',
      title: 'Nascondi ai motori di ricerca',
      type: 'boolean',
      initialValue: false,
    }),
  ],
});
