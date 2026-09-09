import colorsData from '../data/colors';
import destinationsData from '../data/destinations';
import vibesData from '../data/vibes';
import { classifyHexColor } from './colourIdentity';
import { normalizeDestinations, normalizeVibes } from './discovery';
import { normalizeFavouriteIds } from './dreamPalette';
import { normalizeRecentVibeIds } from './recentVibeSignals';

const RECENT_WEIGHT = 1;
const DREAM_WEIGHT = 3;
const JOURNEY_WEIGHT = 2;
const JOURNEY_PALETTE_WEIGHT = 1;
const DOMINANT_SCORE = 2;

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createSignals(items) {
  return new Map(items.map((item, order) => [item.id, {
    id: item.id,
    order,
    score: 0,
    recentScore: 0,
    dreamScore: 0,
    journeyScore: 0,
    journeyPaletteScore: 0,
  }]));
}

function addSignal(signals, id, source, amount) {
  const signal = signals.get(id);
  if (!signal) return;
  signal.score += amount;
  signal[source] += amount;
}

function rankedSignals(signals, order) {
  return order
    .map((item, index) => ({ signal: signals.get(item.id), index }))
    .filter((item) => item.signal?.score > 0)
    .sort((first, second) => second.signal.score - first.signal.score || first.signal.order - second.signal.order)
    .map((item) => item.signal);
}

function dominant(signals) {
  return signals[0]?.score >= DOMINANT_SCORE ? { id: signals[0].id, score: signals[0].score } : null;
}

// I wrote this:
// This builds a simple preference profile from the user's recent vibes,
// saved Dreams, Journeys and the colours they have collected.
export function buildPreferenceProfile({
  recentVibeIds = [],
  dreamDestinationIds = [],
  journeys = [],
  destinations = destinationsData,
  vibes = vibesData,
  colors = colorsData,
} = {}) {
  const catalog = normalizeDestinations(destinations);
  const canonicalVibes = normalizeVibes(vibes);
  const canonicalColors = Array.isArray(colors)
    ? colors.filter((color) => color && typeof color.id === 'string' && color.id.trim())
    : [];
  const destinationsById = new Map(catalog.map((destination) => [destination.id, destination]));
  const vibeSignals = createSignals(canonicalVibes);
  const colorSignals = createSignals(canonicalColors);
  const recent = normalizeRecentVibeIds(recentVibeIds, canonicalVibes);
  const dreams = normalizeFavouriteIds(dreamDestinationIds).filter((id) => destinationsById.has(id));
  const safeJourneys = Array.isArray(journeys) ? journeys.filter((journey) => journey && typeof journey === 'object') : [];
  const journeyDestinationIds = [];
  const journeyPaletteColorIds = [];

  recent.forEach((id, index) => addSignal(vibeSignals, id, 'recentScore', (8 - index) * RECENT_WEIGHT));
  dreams.forEach((id) => {
    const destination = destinationsById.get(id);
    destination.vibeIds.forEach((vibeId) => addSignal(vibeSignals, vibeId, 'dreamScore', DREAM_WEIGHT));
    destination.colorIds.forEach((colorId) => addSignal(colorSignals, colorId, 'dreamScore', DREAM_WEIGHT));
  });
  safeJourneys.forEach((journey) => {
    const destination = destinationsById.get(cleanId(journey.destinationId));
    if (destination) {
      journeyDestinationIds.push(destination.id);
      destination.vibeIds.forEach((vibeId) => addSignal(vibeSignals, vibeId, 'journeyScore', JOURNEY_WEIGHT));
      destination.colorIds.forEach((colorId) => addSignal(colorSignals, colorId, 'journeyScore', JOURNEY_WEIGHT));
    }
    (Array.isArray(journey.palette) ? journey.palette : []).forEach((hex) => {
      const colorId = classifyHexColor(hex, canonicalColors);
      if (!colorId) return;
      journeyPaletteColorIds.push(colorId);
      addSignal(colorSignals, colorId, 'journeyPaletteScore', JOURNEY_PALETTE_WEIGHT);
    });
  });

  const vibeAffinities = rankedSignals(vibeSignals, canonicalVibes);
  const colorAffinities = rankedSignals(colorSignals, canonicalColors);
  return {
    recentVibeIds: recent,
    dreamDestinationIds: dreams,
    journeyDestinationIds,
    journeyPaletteColorIds,
    vibeAffinities,
    colorAffinities,
    dominantVibe: dominant(vibeAffinities),
    dominantColor: dominant(colorAffinities),
    hasEvidence: vibeAffinities.length > 0 || colorAffinities.length > 0,
  };
}

export const PREFERENCE_WEIGHTS = {
  recentNewest: 8,
  recentOlderStep: 1,
  dreamDestination: DREAM_WEIGHT,
  journeyDestination: JOURNEY_WEIGHT,
  journeyPaletteColor: JOURNEY_PALETTE_WEIGHT,
};
