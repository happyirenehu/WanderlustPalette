import getContrastColor from './accessibility';

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const FALLBACK_PRIMARY = '#E8EEF2';
const FALLBACK_SECONDARY = '#B8C4C1';
const LIGHT_ATMOSPHERE = '#F7F2E8';
const DARK_ATMOSPHERE = '#151C1C';
const CARD_SURFACE = '#FFFCF7';

function normalizeHex(value) {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
    ? value.trim().toUpperCase()
    : '';
}

function hexToRgb(hex) {
  return {
    red: parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue: parseInt(hex.slice(5, 7), 16),
  };
}

function channelToHex(value) {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase();
}

function blendHex(foreground, background, foregroundWeight) {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  const backgroundWeight = 1 - foregroundWeight;
  return `#${channelToHex((foregroundRgb.red * foregroundWeight) + (backgroundRgb.red * backgroundWeight))}${channelToHex((foregroundRgb.green * foregroundWeight) + (backgroundRgb.green * backgroundWeight))}${channelToHex((foregroundRgb.blue * foregroundWeight) + (backgroundRgb.blue * backgroundWeight))}`;
}

export default function getJourneyPaletteTheme(palette) {
  const validPalette = Array.isArray(palette) ? palette.map(normalizeHex).filter(Boolean) : [];
  const primaryColor = validPalette[0] || FALLBACK_PRIMARY;
  const secondaryColor = validPalette.find((color, index) => index > 0 && color !== primaryColor)
    || FALLBACK_SECONDARY;
  const tertiaryColor = validPalette.find((color, index) => (
    index > 1 && color !== primaryColor && color !== secondaryColor
  )) || secondaryColor;
  const primaryForegroundColor = getContrastColor(primaryColor);
  const darkAtmosphere = primaryForegroundColor === '#FFFFFF';
  const backgroundColor = blendHex(
    primaryColor,
    darkAtmosphere ? DARK_ATMOSPHERE : LIGHT_ATMOSPHERE,
    darkAtmosphere ? 0.52 : 0.3,
  );

  return {
    backgroundColor,
    borderColor: blendHex(secondaryColor, CARD_SURFACE, 0.28),
    foregroundColor: getContrastColor(backgroundColor),
    primaryColor,
    primaryForegroundColor,
    secondaryColor,
    tertiaryColor,
  };
}
