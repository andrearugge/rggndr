import { defineField, defineType } from 'sanity';
import { hiddenField } from './shared';

export const imageFull = defineType({
  name: 'imageFull',
  title: 'Immagine piena',
  type: 'object',
  fields: [
    defineField({ name: 'image', title: 'Immagine', type: 'imageWithAlt', validation: (r) => r.required() }),
    defineField({ name: 'caption', title: 'Didascalia', type: 'string' }),
    hiddenField,
  ],
  preview: { select: { title: 'caption', media: 'image' }, prepare: (s) => ({ ...s, subtitle: 'Immagine piena' }) },
});
