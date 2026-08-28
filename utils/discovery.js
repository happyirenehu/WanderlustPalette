import { normalizeBudget } from './budget';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(cleanText).filter(Boolean))];
}

export function normalizeVibe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = cleanText(value.id);
  const name = cleanText(value.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    colorId: cleanText(value.colorId),
    description: cleanText(value.description),
    colorFamily: cleanText(value.colorFamily),
    palette: cleanStringList(value.palette),
    imageUri: cleanText(value.imageUri),
    imageAlt: cleanText(value.imageAlt),
    imageCredit: cleanText(value.imageCredit),
    imageAttributionUrl: cleanText(value.imageAttributionUrl),
  };
}

export function normalizeVibes(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.reduce((result, item) => {
    const vibe = normalizeVibe(item);
    if (!vibe || seen.has(vibe.id)) return result;
    seen.add(vibe.id);
    result.push(vibe);
    return result;
  }, []);
}

export function normalizeDestination(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = cleanText(value.id);
  const name = cleanText(value.name);
  const country = cleanText(value.country);
  const vibeIds = cleanStringList(value.vibeIds);
  if (!id || !name || !country || vibeIds.length === 0) return null;
  return {
    id,
    name,
    country,
    countryCode: cleanText(value.countryCode).toUpperCase(),
    travelRegion: cleanText(value.travelRegion),
    budget: normalizeBudget(value.budget),
    vibeIds,
    colorIds: cleanStringList(value.colorIds),
    colorFamily: cleanText(value.colorFamily),
    palette: cleanStringList(value.palette),
    description: cleanText(value.description),
    whyItMatches: cleanText(value.whyItMatches),
    imageUri: cleanText(value.imageUri),
    imageAlt: cleanText(value.imageAlt),
    imageCredit: cleanText(value.imageCredit),
    imageAttributionUrl: cleanText(value.imageAttributionUrl),
  };
}

export function normalizeDestinations(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.reduce((result, item) => {
    const destination = normalizeDestination(item);
    if (!destination || seen.has(destination.id)) return result;
    seen.add(destination.id);
    result.push(destination);
    return result;
  }, []);
}

export function getVibeById(vibeId, vibes) {
  return normalizeVibes(vibes).find((vibe) => vibe.id === vibeId) || null;
}

export function recommendDestinations(vibeId, catalogue, vibes) {
  if (!getVibeById(vibeId, vibes)) return [];
  return normalizeDestinations(catalogue).filter((destination) => destination.vibeIds.includes(vibeId));
}

export function recommendDestinationsByColor(colorId, catalogue, colors) {
  const id = cleanText(colorId);
  const validColor = Array.isArray(colors) && colors.some((color) => (
    color && typeof color === 'object' && cleanText(color.id) === id
  ));
  if (!validColor) return [];
  return normalizeDestinations(catalogue).filter((destination) => destination.colorIds.includes(id));
}

export function getRelatedDestinations(destinationId, catalogue, limit = 3) {
  const destinations = normalizeDestinations(catalogue);
  const current = destinations.find((destination) => destination.id === cleanText(destinationId));
  if (!current) return [];

  return destinations
    .map((destination, index) => {
      if (destination.id === current.id) return null;
      const sharedVibes = destination.vibeIds.filter((id) => current.vibeIds.includes(id)).length;
      const sharedColors = destination.colorIds.filter((id) => current.colorIds.includes(id)).length;
      return { destination, index, score: (sharedVibes * 2) + sharedColors };
    })
    .filter((item) => item && item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Number.isFinite(limit) ? limit : 3))
    .map((item) => item.destination);
}

export function resolveDestinationIds(ids, catalogue) {
  const destinationById = new Map(normalizeDestinations(catalogue).map((item) => [item.id, item]));
  return cleanStringList(ids).map((id) => destinationById.get(id)).filter(Boolean);
}
