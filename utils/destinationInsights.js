import { normalizeDestinations } from './discovery';
import { BUDGET_LEVELS, normalizeBudget } from './budget';

function cleanIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string').map((id) => id.trim()).filter(Boolean))];
}

function mostFrequent(ids, canonicalItems) {
  const counts = ids.reduce((result, id) => {
    result.set(id, (result.get(id) || 0) + 1);
    return result;
  }, new Map());

  return (Array.isArray(canonicalItems) ? canonicalItems : []).reduce((winner, item) => {
    if (!item || typeof item.id !== 'string') return winner;
    const count = counts.get(item.id) || 0;
    if (!count || (winner && count <= winner.count)) return winner;
    return { id: item.id, name: item.name || item.id, count };
  }, null);
}

export function getDreamPaletteInsights(savedIds, catalogue, vibes, colors) {
  const byId = new Map(normalizeDestinations(catalogue).map((destination) => [destination.id, destination]));
  const saved = cleanIds(savedIds).map((id) => byId.get(id)).filter(Boolean);
  const budgetDistribution = BUDGET_LEVELS.map((level) => ({
    ...level,
    count: saved.filter((item) => normalizeBudget(item.budget) === level.id).length,
  }));
  const dominantBudget = budgetDistribution.reduce((winner, item) => (
    item.count > (winner?.count || 0) ? item : winner
  ), null);
  return {
    total: saved.length,
    dominantVibe: mostFrequent(saved.flatMap((item) => item.vibeIds), vibes),
    dominantColor: mostFrequent(saved.flatMap((item) => item.colorIds), colors),
    dominantBudget: dominantBudget?.count ? dominantBudget : null,
    budgetDistribution,
  };
}

export default getDreamPaletteInsights;
