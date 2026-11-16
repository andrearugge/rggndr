import { defineArrayMember, defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Impostazioni del sito',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Nome del sito', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'description',
      title: 'Descrizione predefinita',
      description: 'Per le pagine senza una descrizione SEO propria.',
      type: 'text',
      rows: 3,
    }),
    defineField({ name: 'ogImage', title: 'Immagine predefinita per le condivisioni', type: 'imageWithAlt' }),
    defineField({
      name: 'socials',
      title: 'Social',
      description: 'Nel footer, in quest’ordine. La voce "Instagram" dà anche il nome sulla card.',
      type: 'array',
      of: [defineArrayMember({ type: 'link' })],
    }),
    defineField({ name: 'email', title: 'Email', type: 'email', validation: (r) => r.required() }),
    defineField({
      name: 'phone',
      title: 'Telefono',
      description: 'Come si legge, es. (+39) 393 857 6657. Il link si ricava da solo.',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'copyright', title: 'Copyright', description: 'Riga in fondo al footer.', type: 'string' }),
    defineField({ name: 'umamiId', title: 'Umami: website ID', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Impostazioni del sito' }) },
});
