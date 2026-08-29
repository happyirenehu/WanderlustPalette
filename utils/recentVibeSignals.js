import vibesData from '../data/vibes';
import { normalizeVibes } from './discovery';

export const MAX_RECENT_VIBES = 8;

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function knownVibeIds(vibes) {
  return new Set(normalizeVibes(vibes).map((vibe) => vibe.id));
}

export function normalizeRecentVibeIds(value, vibes = vibesData) {
  if (!Array.isArray(value)) return [];
  const knownIds = knownVibeIds(vibes);
  return value
    .map(cleanId)
    .filter((id) => knownIds.has(id))
    .slice(0, MAX_RECENT_VIBES);
}

export function addRecentVibeId(recentVibeIds, vibeId, vibes = vibesData) {
  const id = cleanId(vibeId);
  const knownIds = knownVibeIds(vibes);
  if (!knownIds.has(id)) return normalizeRecentVibeIds(recentVibeIds, vibes);
  return normalizeRecentVibeIds([id, ...normalizeRecentVibeIds(recentVibeIds, vibes)], vibes);
}

export function parseStoredRecentVibeIds(value, vibes = vibesData) {
  if (value === null) return [];
  try {
    return normalizeRecentVibeIds(JSON.parse(value), vibes);
  } catch {
    return [];
  }
}
