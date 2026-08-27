const FALLBACK_PALETTE = ['#1A1A1A', '#4A5568', '#718096', '#CBD5E0', '#F7FAFC'];

export function extractPalette(rgbArray) {
  if (!Array.isArray(rgbArray) || rgbArray.length === 0) {
    return FALLBACK_PALETTE.slice();
  }

  const colorCounts = new Map();

  rgbArray.forEach((rgb) => {
    if (!Array.isArray(rgb) || rgb.length < 3 || rgb.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
      return;
    }

    const hex = rgb
      .slice(0, 3)
      .map((value) => Math.round(value).toString(16).padStart(2, '0').toUpperCase())
      .join('');
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  });

  if (colorCounts.size === 0) {
    return FALLBACK_PALETTE.slice();
  }

  const palette = Array.from(colorCounts.entries())
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, 5)
    .map(([hex]) => `#${hex}`);

  FALLBACK_PALETTE.forEach((color) => {
    if (palette.length < 5 && !palette.includes(color)) {
      palette.push(color);
    }
  });

  return palette;
}