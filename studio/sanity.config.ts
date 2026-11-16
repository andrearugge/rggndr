import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';
import { structure, SINGLETONS } from './structure';

const singletonIds = new Set<string>(SINGLETONS.map((s) => s.id));
const singletonTypes = new Set<string>(SINGLETONS.map((s) => s.type));

export default defineConfig({
  name: 'default',
  title: 'rggndr.it',
  projectId: '9skjzcft',
  dataset: 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // i documenti singoli non compaiono tra quelli da creare
    templates: (templates) => templates.filter((t) => !singletonTypes.has(t.schemaType)),
  },
  document: {
    // dei singoli si può solo pubblicare, annullare le modifiche e ripristinare
    actions: (actions, { schemaType, documentId }) =>
      singletonTypes.has(schemaType) || (documentId && singletonIds.has(documentId))
        ? actions.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
    newDocumentOptions: (items) => items.filter((item) => !singletonTypes.has(item.templateId)),
  },
});
