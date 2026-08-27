export function getContrastColor(hex) {
  const normalizedHex = hex.replace('#', '');
  const fullHex = normalizedHex.length === 3
    ? normalizedHex.split('').map((character) => character + character).join('')
    : normalizedHex;
  const red = parseInt(fullHex.slice(0, 2), 16);
  const green = parseInt(fullHex.slice(2, 4), 16);
  const blue = parseInt(fullHex.slice(4, 6), 16);
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

  return luminance > 128 ? '#000000' : '#FFFFFF';
}

export default getContrastColor;