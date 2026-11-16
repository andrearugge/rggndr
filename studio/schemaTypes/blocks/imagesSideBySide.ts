import { defineArrayMember, defineField, defineType } from 'sanity';
import { hiddenField } from './shared';

export const imagesSideBySide = defineType({
  name: 'imagesSideBySide',
  title: 'Immagini affiancate',
  type: 'object',
  fields: [
    defineField({
      name: 'images',
      title: 'Immagini',
      type: 'array',
      of: [defineArrayMember({ type: 'imageWithAlt' })],
      validation: (r) => r.required().min(2),
    }),
    defineField({ name: 'caption', title: 'Didascalia', type: 'string' }),
    defineField({
      name: 'height',
      title: 'Altezza personalizzata (px)',
      description: 'Facoltativa: se vuota, le immagini prendono l’altezza naturale.',
      type: 'number',
      validation: (r) => r.positive().integer(),
    }),
    hiddenField,
  ],
  preview: {
    select: { title: 'caption', media: 'images.0' },
    prepare: (s) => ({ ...s, subtitle: 'Immagini affiancate' }),
  },
});
