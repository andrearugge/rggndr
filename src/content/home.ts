/**
 * Progetti della homepage, stessi e nello stesso ordine del sito attuale. In M1 arriveranno da Sanity
 * (`homePage`); i testi delle sezioni restano per ora nel markup, finché non c'è il loro schema.
 */
export interface Image {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface ProjectCard {
  title: string;
  year: string;
  image: Image;
}

export interface HomeContent {
  projects: ProjectCard[];
}

const project = (title: string, year: string, src: string, width: number, height: number): ProjectCard => ({
  title,
  year,
  image: { src, width, height, alt: title },
});

export function getHome(): HomeContent {
  return {
    projects: [
      project('AI Journal', '2025', '/media/ai-journal-cover.jpg', 1200, 901),
      project('MarkLayer', '2025', '/media/marklayer.jpg', 830, 1108),
      project('AI Workshop', '2025', '/media/ai-workshop.jpg', 550, 885),
      project('Dialetto Libero', '2019', '/media/a4.jpg', 550, 406),
      project('Montipadel', '2024', '/media/montipadel.jpg', 1200, 1600),
      project('Beconcept', '2018 – Today', '/media/beconcept.jpg', 1200, 1672),
      project('Giulia Pampuri', '2024', '/media/a8.jpg', 830, 623),
    ],
  };
}
