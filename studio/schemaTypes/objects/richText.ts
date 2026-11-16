import { defineArrayMember, defineType } from 'sanity';

/** Testo con paragrafi, grassetto, corsivo e link: solo ciò che il sito sa mostrare (RichText.astro). */
export const richText = defineType({
  name: 'richText',
  title: 'Testo',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{ title: 'Paragrafo', value: 'normal' }],
      lists: [],
      marks: {
        decorators: [
          { title: 'Grassetto', value: 'strong' },
          { title: 'Corsivo', value: 'em' },
        ],
        annotations: [
          {
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              {
                name: 'href',
                title: 'Indirizzo',
                type: 'url',
                validation: (r) => r.required().uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
              },
            ],
          },
        ],
      },
    }),
  ],
});
