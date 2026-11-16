import { defineField, defineType } from 'sanity';
import { hiddenField } from './shared';

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'source',
      title: 'Sorgente',
      type: 'string',
      options: {
        list: [
          { title: 'YouTube', value: 'youtube' },
          { title: 'Vimeo', value: 'vimeo' },
          { title: 'File', value: 'file' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'url',
      title: 'Indirizzo del video',
      type: 'url',
      hidden: ({ parent }) => parent?.source === 'file',
    }),
    defineField({
      name: 'mp4',
      title: 'File MP4',
      type: 'file',
      options: { accept: 'video/mp4' },
      hidden: ({ parent }) => parent?.source !== 'file',
    }),
    defineField({
      name: 'webm',
      title: 'File WebM',
      type: 'file',
      options: { accept: 'video/webm' },
      hidden: ({ parent }) => parent?.source !== 'file',
    }),
    hiddenField,
  ],
  preview: {
    select: { title: 'url', subtitle: 'source' },
    prepare: (s) => ({ title: s.title || 'Video', subtitle: s.subtitle }),
  },
});
