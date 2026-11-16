/** Foto della gallery (dal sito attuale). In M1 arriveranno da Sanity (`galleryItem`). */
export interface GalleryItem {
  title: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
}

const GALLERY: GalleryItem[] = [
  { title: "Giulia, Lanzarote", src: '/media/gallery/01.jpg', thumb: '/media/gallery/01-thumb.jpg', width: 1600, height: 1600 },
  { title: "Cascina Lago Scuro", src: '/media/gallery/02.jpg', thumb: '/media/gallery/02-thumb.jpg', width: 900, height: 1600 },
  { title: "Mud Millo", src: '/media/gallery/03.jpg', thumb: '/media/gallery/03-thumb.jpg', width: 899, height: 1600 },
  { title: "Home of dreams", src: '/media/gallery/04.jpg', thumb: '/media/gallery/04-thumb.jpg', width: 899, height: 1600 },
  { title: "Lanzarote", src: '/media/gallery/05.jpg', thumb: '/media/gallery/05-thumb.jpg', width: 910, height: 1600 },
  { title: "Sand in Famara", src: '/media/gallery/06.jpg', thumb: '/media/gallery/06-thumb.jpg', width: 1200, height: 1600 },
  { title: "Indian food", src: '/media/gallery/07.jpg', thumb: '/media/gallery/07-thumb.jpg', width: 900, height: 1600 },
  { title: "Istanbul Ferry", src: '/media/gallery/08.jpg', thumb: '/media/gallery/08-thumb.jpg', width: 1280, height: 1600 },
  { title: "Walking in the clouds", src: '/media/gallery/09.jpg', thumb: '/media/gallery/09-thumb.jpg', width: 900, height: 1600 },
  { title: "Sleeping at home", src: '/media/gallery/10.jpg', thumb: '/media/gallery/10-thumb.jpg', width: 900, height: 1600 },
  { title: "Cheeeese", src: '/media/gallery/11.jpg', thumb: '/media/gallery/11-thumb.jpg', width: 1200, height: 1600 },
  { title: "Playing Basketball", src: '/media/gallery/12.jpg', thumb: '/media/gallery/12-thumb.jpg', width: 1600, height: 1200 },
  { title: "Formentera", src: '/media/gallery/13.jpg', thumb: '/media/gallery/13-thumb.jpg', width: 899, height: 1600 },
  { title: "Snowboard", src: '/media/gallery/14.jpg', thumb: '/media/gallery/14-thumb.jpg', width: 1200, height: 1600 },
];

export function getGallery(): GalleryItem[] {
  return GALLERY;
}
