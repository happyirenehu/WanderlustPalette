import { normalizeDestinations } from './discovery';

const REASON_SOURCES = [
  ['recentScore', 'recentVibe'],
  ['dreamScore', 'dreamVibe'],
  ['journeyScore', 'journeyVibe'],
  ['dreamScore', 'dreamColor'],
  ['journeyScore', 'journeyColor'],
  ['journeyPaletteScore', 'journeyPaletteColor'],
];

function signalMap(affinities) {
  return new Map((Array.isArray(affinities) ? affinities : [])
    .filter((signal) => signal && typeof signal.id === 'string' && Number.isFinite(signal.score) && signal.score > 0)
    .map((signal) => [signal.id, signal]));
}

function reasonsFor(destination, vibes, colors) {
  const reasons = [];
  destination.vibeIds.forEach((id) => {
    const signal = vibes.get(id);
    if (!signal) return;
    REASON_SOURCES.slice(0, 3).forEach(([source, type]) => {
      if (signal[source] > 0) reasons.push({ type, vibeId: id, contribution: signal[source] * 2 });
    });
  });
  destination.colorIds.forEach((id) => {
    const signal = colors.get(id);
    if (!signal) return;
    REASON_SOURCES.slice(3).forEach(([source, type]) => {
      if (signal[source] > 0) reasons.push({ type, colorId: id, contribution: signal[source] });
    });
  });
  return reasons
    .sort((a, b) => b.contribution - a.contribution || a.type.localeCompare(b.type))
    .slice(0, 2)
    .map(({ contribution, ...reason }) => reason);
}

export function getAdaptiveRecommendations(catalogue, profile, options = {}) {
  const destinations = normalizeDestinations(catalogue);
  const excluded = new Set([
    ...(Array.isArray(options.excludeDestinationIds) ? options.excludeDestinationIds : []),
    options.currentDestinationId,
  ].filter((id) => typeof id === 'string' && id));
  const limit = Number.isInteger(options.limit) && options.limit >= 0 ? options.limit : destinations.length;
  const vibeSignals = signalMap(profile?.vibeAffinities);
  const colorSignals = signalMap(profile?.colorAffinities);
  const available = destinations.filter((destination) => !excluded.has(destination.id));
  const personalized = Boolean(profile?.hasEvidence && (vibeSignals.size || colorSignals.size));

  const ranked = available.map((destination, index) => {
    const score = destination.vibeIds.reduce((total, id) => total + ((vibeSignals.get(id)?.score || 0) * 2), 0)
      + destination.colorIds.reduce((total, id) => total + (colorSignals.get(id)?.score || 0), 0);
    return {
      destination,
      score: personalized ? score : 0,
      reasons: personalized ? reasonsFor(destination, vibeSignals, colorSignals) : [],
      index,
    };
  });
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    personalized,
    recommendations: ranked.slice(0, limit).map(({ index, ...recommendation }) => recommendation),
  };
}
