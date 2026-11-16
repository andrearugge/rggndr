import { defineField } from 'sanity';

/** Campo comune a tutti i blocchi del contenuto di un progetto (in WordPress: "mostra sezione"). */
export const hiddenField = defineField({
  name: 'hidden',
  title: 'Nascondi questo blocco',
  type: 'boolean',
  initialValue: false,
});
