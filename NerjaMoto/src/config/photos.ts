/**
 * Photographs from Wikimedia Commons (free licences). They are loaded from
 * Wikimedia's servers; the credit for each one is shown in the footer, as the
 * licences require. Replace them with the business's own photos when available:
 * set `src`/`srcSet` to your files and update `credit` (or set it to null).
 */
import type { Media } from './media';

const thumb = (path: string, file: string, w: number) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/${w}px-${file}`;

/** srcset from Wikimedia's standard thumbnail widths that are smaller than the original. */
const commons = (path: string, file: string, width: number, height: number, widths: number[]) => ({
  src: thumb(path, file, widths.includes(1280) ? 1280 : widths[widths.length - 1]!),
  srcSet: widths.map((w) => `${thumb(path, file, w)} ${w}w`).join(', '),
  width,
  height,
  illustration: false,
});

export const photos = {
  hero: {
    ...commons('8/8d', 'View_from_Balc%C3%B3n_de_Europa_in_Nerja_2014.jpg', 4381, 3025, [960, 1280, 1920]),
    credit: { title: 'View from Balcón de Europa in Nerja', author: 'Tuxyso', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', source: 'https://commons.wikimedia.org/wiki/File:View_from_Balc%C3%B3n_de_Europa_in_Nerja_2014.jpg' },
  },
  story: {
    ...commons('9/96', 'Nerja.jpg', 5100, 3400, [960, 1280, 1920]),
    credit: { title: 'Nerja, Costa del Sol', author: 'kallerna', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:Nerja.jpg' },
  },
  frigiliana: {
    ...commons('6/64', 'Frigiliana_16_October.2006.jpg', 2560, 1920, [960, 1280]),
    credit: { title: 'Frigiliana', author: 'gildemax', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5', source: 'https://commons.wikimedia.org/wiki/File:Frigiliana_16_October.2006.jpg' },
  },
  maro: {
    ...commons('a/ac', 'Maro_%28Nerja%29%2C_landscape.jpg', 4272, 2848, [960, 1280]),
    credit: { title: 'Maro (Nerja), landscape', author: 'Dguendel', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Maro_(Nerja),_landscape.jpg' },
  },
  herradura: {
    ...commons('5/52', 'La_Herradura_aerial.jpg', 5100, 3400, [960, 1280]),
    credit: { title: 'La Herradura aerial', author: 'kallerna', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:La_Herradura_aerial.jpg' },
  },

  /* Scooters: photos of the same model (reference images, not the rental fleet). */
  'vision-110': {
    ...commons('1/17', 'Honda_Vision_110-002.JPG', 1600, 1205, [960, 1280]),
    credit: { title: 'Honda Vision 110', author: 'Millermaster', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Honda_Vision_110-002.JPG' },
  },
  'pcx-125': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/2021_Honda_PCX_125.jpg/960px-2021_Honda_PCX_125.jpg',
    srcSet:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/2021_Honda_PCX_125.jpg/960px-2021_Honda_PCX_125.jpg 960w, https://upload.wikimedia.org/wikipedia/commons/8/8f/2021_Honda_PCX_125.jpg 1272w',
    width: 1272,
    height: 1476,
    illustration: false,
    credit: { title: '2021 Honda PCX 125', author: 'Jiri Smolik', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:2021_Honda_PCX_125.jpg' },
  },
  'forza-125': {
    src: 'https://upload.wikimedia.org/wikipedia/commons/7/78/2023_Honda_Forza_125_Special_Edition.png',
    srcSet: undefined,
    width: 635,
    height: 680,
    illustration: false,
    credit: { title: '2023 Honda Forza 125 Special Edition', author: 'MotorideTV', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0', source: 'https://commons.wikimedia.org/wiki/File:2023_Honda_Forza_125_Special_Edition.png' },
  },
} satisfies Record<string, Media>;
