import { normalizeHex } from './colourIdentity';
import { buildPreferenceProfile } from './preferenceProfile';

function topSignal(signals, source) {
  const signal = (Array.isArray(signals) ? signals : [])
    .filter((item) => item[source] > 0)
    .sort((first, second) => second[source] - first[source] || first.order - second.order)[0];
  return signal ? { id: signal.id, score: signal[source] } : null;
}

function representativePalette(journeys) {
  const counts = new Map();
  const order = new Map();
  (Array.isArray(journeys) ? journeys : []).forEach((journey) => {
    (Array.isArray(journey?.palette) ? journey.palette : []).forEach((value) => {
      const hex = normalizeHex(value);
      if (!hex) return;
      if (!counts.has(hex)) order.set(hex, order.size);
      counts.set(hex, (counts.get(hex) || 0) + 1);
    });
  });
  return [...order.keys()]
    .sort((first, second) => counts.get(second) - counts.get(first) || order.get(first) - order.get(second))
    .slice(0, 5);
}

export function buildColourPassport(input = {}) {
  const profile = input.profile || buildPreferenceProfile(input);
  const dreamColor = topSignal(profile.colorAffinities, 'dreamScore');
  const memoryColor = topSignal(profile.colorAffinities, 'journeyPaletteScore');
  const palette = representativePalette(input.journeys);
  const contrast = dreamColor && memoryColor && dreamColor.id !== memoryColor.id
    ? { dreamColorId: dreamColor.id, memoryColorId: memoryColor.id }
    : null;
  return {
    isEmpty: !profile.hasEvidence && palette.length === 0,
    dream: { dominantColor: dreamColor, evidenceCount: dreamColor ? dreamColor.score / 3 : 0 },
    memory: { dominantColor: memoryColor, evidenceCount: memoryColor ? memoryColor.score : 0 },
    dominantVibe: profile.dominantVibe,
    representativePalette: palette,
    contrast,
  };
}
