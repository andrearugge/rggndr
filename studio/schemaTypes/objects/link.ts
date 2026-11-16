import { defineField, defineType } from 'sanity';

/** Voce con etichetta e, se serve, un indirizzo (pagina, email o telefono). */
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Etichetta', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'url',
      title: 'Indirizzo',
      description: 'Facoltativo: senza indirizzo la voce è solo testo.',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' } },
});
