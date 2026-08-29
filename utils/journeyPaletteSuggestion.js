const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export function normalizeJourneyPalette(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((color) => typeof color === 'string' && color.trim())
    .map((color) => color.trim().toUpperCase());
}

export function normalizePhotoPaletteSuggestion(value) {
  if (!Array.isArray(value) || value.length !== 3) return [];
  const colors = value.map((item) => (
    typeof item === 'string' ? item : item?.hex
  ));
  return colors.every((color) => typeof color === 'string' && HEX_COLOR.test(color.trim()))
    ? colors.map((color) => color.trim().toUpperCase())
    : [];
}

export function resolvePhotoPalette({
  currentPalette,
  suggestedPalette,
  isEditing,
  hasManualEdits = false,
  acceptSuggestion = false,
} = {}) {
  const current = normalizeJourneyPalette(currentPalette);
  const suggestion = normalizePhotoPaletteSuggestion(suggestedPalette);
  const applied = suggestion.length === 3
    && (acceptSuggestion || (!isEditing && !hasManualEdits));
  return { applied, palette: applied ? suggestion : current, suggestion };
}

export function validateJourneyPalette(value) {
  const palette = normalizeJourneyPalette(value);
  const valid = palette.length <= 5 && palette.every((color) => HEX_COLOR.test(color));
  return { valid, palette: valid ? palette : [] };
}
