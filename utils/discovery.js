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
    description: cleanText(value.description),
    colorFamily: cleanText(value.colorFamily),
    palette: cleanStringList(value.palette),
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
    vibeIds,
    colorFamily: cleanText(value.colorFamily),
    palette: cleanStringList(value.palette),
    description: cleanText(value.description),
    whyItMatches: cleanText(value.whyItMatches),
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

export function resolveDestinationIds(ids, catalogue) {
  const destinationById = new Map(normalizeDestinations(catalogue).map((item) => [item.id, item]));
  return cleanStringList(ids).map((id) => destinationById.get(id)).filter(Boolean);
}
