import { defineArrayMember, defineField, defineType } from 'sanity';

export const gallery = defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Foto',
      description: 'In ordine di apparizione: si riordinano trascinando.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'galleryItem',
          title: 'Foto',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Titolo', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'image', title: 'Immagine', type: 'imageWithAlt', validation: (r) => r.required() }),
          ],
          preview: { select: { title: 'title', media: 'image' } },
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'Gallery' }) },
});
