/**
 * Images used on the page. Place photos come from Wikimedia Commons (see photos.ts);
 * the scooter drawings below are only a fallback for a model without a photo.
 */
import scooterCompact from '../assets/media/scooter-compact.svg';
import scooterTouring from '../assets/media/scooter-touring.svg';
import scooterMaxi from '../assets/media/scooter-maxi.svg';
import { photos } from './photos';

export interface Credit {
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export interface Media {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  illustration: boolean;
  credit?: Credit;
}

export const media = {
  hero: photos.hero,
  story: photos.story,
  frigiliana: photos.frigiliana,
  maro: photos.maro,
  herradura: photos.herradura,
} satisfies Record<string, Media>;

export const scooterArt = {
  compact: { src: scooterCompact, width: 480, height: 300, illustration: true },
  touring: { src: scooterTouring, width: 480, height: 300, illustration: true },
  maxi: { src: scooterMaxi, width: 480, height: 300, illustration: true },
} satisfies Record<string, Media>;

/** Every credited image, for the footer. */
export const credits = Object.values(photos).map((p) => p.credit);
