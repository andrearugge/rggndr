import { defineArrayMember, defineField, defineType } from 'sanity';

const links = (name: string, title: string) =>
  defineField({ name, title, type: 'array', of: [defineArrayMember({ type: 'link' })] });

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About',
  type: 'document',
  fields: [
    defineField({ name: 'who', title: 'Who', description: 'Presentazione accanto all’immagine.', type: 'richText' }),
    defineField({ name: 'image', title: 'Immagine', type: 'imageWithAlt' }),
    links('work', 'What I am doing'),
    links('emails', 'Email'),
    links('phones', 'Phone'),
    links('socials', 'Social'),
    defineField({ name: 'descriptionKicker', title: 'Titolino della descrizione', type: 'string' }),
    defineField({ name: 'description', title: 'Descrizione', type: 'richText' }),
    defineField({ name: 'seo', title: 'SEO', type: 'seo' }),
  ],
  preview: { prepare: () => ({ title: 'About' }) },
});
