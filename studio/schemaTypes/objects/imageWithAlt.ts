import { defineField, defineType } from 'sanity';

/** Immagine con testo alternativo obbligatorio. Niente hotspot: il sito mostra sempre l'immagine intera. */
export const imageWithAlt = defineType({
  name: 'imageWithAlt',
  title: 'Immagine',
  type: 'image',
  // un'immagine con il solo alt passerebbe lo Studio e farebbe fallire la build del sito.
  // Un campo con una validation propria sostituisce questa: lì va ripetuto assetRequired().
  validation: (r) => r.assetRequired(),
  fields: [
    defineField({
      name: 'alt',
      title: 'Testo alternativo',
      description: 'Cosa mostra l’immagine, per chi non la vede.',
      type: 'string',
      validation: (r) => r.required(),
    }),
  ],
});
