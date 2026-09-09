import colorsData from '../data/colors';
import { normalizeHex } from './colourIdentity';

export const PASSPORT_ARTWORK_SHAPE_COUNT = 5;
export const PASSPORT_ARTWORK_NEUTRALS = ['#B8AAA1', '#C8BDB0', '#A7B4B0'];

function primaryColorHex(colorId, colors) {
  if (typeof colorId !== 'string' || !colorId.trim() || !Array.isArray(colors)) return '';
  const color = colors.find((item) => item?.id === colorId.trim());
  return normalizeHex(color?.palette?.[0]);
}

function addUniqueHex(target, value) {
  const hex = normalizeHex(value);
  if (hex && !target.includes(hex)) target.push(hex);
}

export default function getPassportArtworkPalette(passport, colors = colorsData) {
  const palette = [];
  addUniqueHex(palette, primaryColorHex(passport?.dream?.dominantColor?.id, colors));
  addUniqueHex(palette, primaryColorHex(passport?.memory?.dominantColor?.id, colors));
  (Array.isArray(passport?.representativePalette) ? passport.representativePalette : [])
    .forEach((hex) => addUniqueHex(palette, hex));

  if (!palette.length) return [...PASSPORT_ARTWORK_NEUTRALS];

  PASSPORT_ARTWORK_NEUTRALS.forEach((hex) => addUniqueHex(palette, hex));
  let fallbackIndex = 0;
  while (palette.length < PASSPORT_ARTWORK_SHAPE_COUNT) {
    palette.push(PASSPORT_ARTWORK_NEUTRALS[fallbackIndex % PASSPORT_ARTWORK_NEUTRALS.length]);
    fallbackIndex += 1;
  }
  return palette.slice(0, PASSPORT_ARTWORK_SHAPE_COUNT);
}
