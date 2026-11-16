import { defineField, defineType } from 'sanity';
import { hiddenField } from './shared';

export const paragraph = defineType({
  name: 'paragraph',
  title: 'Paragrafo',
  type: 'object',
  fields: [
    defineField({
      name: 'variant',
      title: 'Tipo',
      type: 'string',
      options: {
        list: [
          { title: 'Solo testo', value: 'plain' },
          { title: 'Con titolo', value: 'withTitle' },
          { title: 'Titolo e sottotitolo', value: 'titleSubtitle' },
        ],
        layout: 'radio',
      },
      initialValue: 'plain',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'title',
      title: 'Titolo',
      type: 'string',
      hidden: ({ parent }) => parent?.variant === 'plain',
    }),
    defineField({
      name: 'subtitle',
      title: 'Sottotitolo',
      type: 'string',
      hidden: ({ parent }) => parent?.variant !== 'titleSubtitle',
    }),
    defineField({ name: 'text', title: 'Testo', type: 'richText' }),
    hiddenField,
  ],
  preview: {
    select: { title: 'title' },
    prepare: ({ title }) => ({ title: title || 'Paragrafo', subtitle: 'Paragrafo' }),
  },
});
