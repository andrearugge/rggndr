import { imageFull } from './blocks/imageFull';
import { imagesSideBySide } from './blocks/imagesSideBySide';
import { paragraph } from './blocks/paragraph';
import { video } from './blocks/video';
import { aboutPage } from './documents/aboutPage';
import { gallery } from './documents/gallery';
import { homePage } from './documents/homePage';
import { project } from './documents/project';
import { siteSettings } from './documents/siteSettings';
import { imageWithAlt } from './objects/imageWithAlt';
import { link } from './objects/link';
import { richText } from './objects/richText';
import { seo } from './objects/seo';

export const schemaTypes = [
  link,
  imageWithAlt,
  richText,
  seo,
  imageFull,
  imagesSideBySide,
  paragraph,
  video,
  siteSettings,
  homePage,
  aboutPage,
  project,
  gallery,
];
