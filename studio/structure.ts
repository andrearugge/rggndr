import type { StructureResolver } from 'sanity/structure';

/** Documenti singoli: un solo documento per tipo, con id fisso (lo stesso che usa la migrazione). */
export const SINGLETONS = [
  { id: 'siteSettings', type: 'siteSettings', title: 'Impostazioni del sito' },
  { id: 'homePage', type: 'homePage', title: 'Home' },
  { id: 'aboutPage', type: 'aboutPage', title: 'About' },
  { id: 'gallery', type: 'gallery', title: 'Gallery' },
] as const;

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Contenuti')
    .items([
      ...SINGLETONS.map((s) =>
        S.listItem().title(s.title).id(s.id).child(S.document().schemaType(s.type).documentId(s.id).title(s.title)),
      ),
      S.divider(),
      S.documentTypeListItem('project').title('Progetti'),
    ]);
