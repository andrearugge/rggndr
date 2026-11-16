/** Foto della gallery (dal sito attuale). Con Sanity arriveranno dal CMS. */
export interface GalleryItem {
  title: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
}

export const GALLERY: GalleryItem[] = [
  { title: "Giulia, Lanzarote", src: '/lab/gallery/01.jpg', thumb: '/lab/gallery/01-thumb.jpg', width: 1600, height: 1600 },
  { title: "Cascina Lago Scuro", src: '/lab/gallery/02.jpg', thumb: '/lab/gallery/02-thumb.jpg', width: 900, height: 1600 },
  { title: "Mud Millo", src: '/lab/gallery/03.jpg', thumb: '/lab/gallery/03-thumb.jpg', width: 899, height: 1600 },
  { title: "Home of dreams", src: '/lab/gallery/04.jpg', thumb: '/lab/gallery/04-thumb.jpg', width: 899, height: 1600 },
  { title: "Lanzarote", src: '/lab/gallery/05.jpg', thumb: '/lab/gallery/05-thumb.jpg', width: 910, height: 1600 },
  { title: "Sand in Famara", src: '/lab/gallery/06.jpg', thumb: '/lab/gallery/06-thumb.jpg', width: 1200, height: 1600 },
  { title: "Indian food", src: '/lab/gallery/07.jpg', thumb: '/lab/gallery/07-thumb.jpg', width: 900, height: 1600 },
  { title: "Istanbul Ferry", src: '/lab/gallery/08.jpg', thumb: '/lab/gallery/08-thumb.jpg', width: 1280, height: 1600 },
  { title: "Walking in the clouds", src: '/lab/gallery/09.jpg', thumb: '/lab/gallery/09-thumb.jpg', width: 900, height: 1600 },
  { title: "Sleeping at home", src: '/lab/gallery/10.jpg', thumb: '/lab/gallery/10-thumb.jpg', width: 900, height: 1600 },
  { title: "Cheeeese", src: '/lab/gallery/11.jpg', thumb: '/lab/gallery/11-thumb.jpg', width: 1200, height: 1600 },
  { title: "Playing Basketball", src: '/lab/gallery/12.jpg', thumb: '/lab/gallery/12-thumb.jpg', width: 1600, height: 1200 },
  { title: "Formentera", src: '/lab/gallery/13.jpg', thumb: '/lab/gallery/13-thumb.jpg', width: 899, height: 1600 },
  { title: "Snowboard", src: '/lab/gallery/14.jpg', thumb: '/lab/gallery/14-thumb.jpg', width: 1200, height: 1600 },
];
