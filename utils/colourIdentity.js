function cleanHex(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function normalizeHex(value) {
  const hex = cleanHex(value);
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : '';
}

export function hexToRgb(value) {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

// Stored Journey HEX values are assigned to their nearest curated palette swatch.
// Equal distances deliberately keep the supplied colour catalogue order.
export function classifyHexColor(value, colors) {
  const rgb = hexToRgb(value);
  if (!rgb || !Array.isArray(colors)) return '';
  let winner = null;
  colors.forEach((color) => {
    if (typeof color?.id !== 'string' || !color.id.trim()) return;
    (Array.isArray(color.palette) ? color.palette : []).forEach((swatch) => {
      const candidate = hexToRgb(swatch);
      if (!candidate) return;
      const distance = ((rgb.red - candidate.red) ** 2)
        + ((rgb.green - candidate.green) ** 2)
        + ((rgb.blue - candidate.blue) ** 2);
      if (!winner || distance < winner.distance) winner = { id: color.id.trim(), distance };
    });
  });
  return winner?.id || '';
}
