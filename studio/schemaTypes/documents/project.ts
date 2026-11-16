import { defineArrayMember, defineField, defineType } from 'sanity';

export const project = defineType({
  name: 'project',
  title: 'Progetto',
  type: 'document',
  groups: [
    { name: 'info', title: 'Informazioni', default: true },
    { name: 'content', title: 'Contenuto' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Titolo', type: 'string', group: 'info', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'Indirizzo',
      description: 'La pagina sarà /progetto/<indirizzo>/.',
      type: 'slug',
      group: 'info',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'year',
      title: 'Anno',
      description: 'Es. 2025 o 2018 – Today.',
      type: 'string',
      group: 'info',
    }),
    defineField({ name: 'type', title: 'Tipo di progetto', type: 'string', group: 'info' }),
    defineField({ name: 'description', title: 'Descrizione', type: 'richText', group: 'info' }),
    defineField({
      name: 'links',
      title: 'Link',
      type: 'array',
      group: 'info',
      of: [defineArrayMember({ type: 'link' })],
    }),
    defineField({
      name: 'cover',
      title: 'Copertina',
      type: 'imageWithAlt',
      group: 'info',
      validation: (r) => r.required().assetRequired(),
    }),
    defineField({
      name: 'content',
      title: 'Contenuto',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({ type: 'imageFull' }),
        defineArrayMember({ type: 'imagesSideBySide' }),
        defineArrayMember({ type: 'paragraph' }),
        defineArrayMember({ type: 'video' }),
      ],
    }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo', group: 'seo' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year', media: 'cover' } },
});
