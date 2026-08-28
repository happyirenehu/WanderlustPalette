export const BUDGET_LEVELS = [
  { id: 'budget', symbol: '$', label: 'Budget-friendly' },
  { id: 'moderate', symbol: '$$', label: 'Moderate' },
  { id: 'premium', symbol: '$$$', label: 'Premium' },
];

export function normalizeBudget(value) {
  const budget = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return BUDGET_LEVELS.some((item) => item.id === budget) ? budget : '';
}

export function getBudgetDisplay(value) {
  const id = normalizeBudget(value);
  const item = BUDGET_LEVELS.find((level) => level.id === id);
  return item ? `${item.symbol} · ${item.label}` : '';
}

// Travel budgets are curated relative discovery labels, never live prices or
// values inferred from World Bank income classifications.
export function applyBudgetPreference(recommendations, preference = 'any') {
  if (!Array.isArray(recommendations)) return [];
  if (preference === 'any') return recommendations;
  const budget = normalizeBudget(preference);
  if (!budget) return recommendations;
  return recommendations.filter((destination) => normalizeBudget(destination?.budget) === budget);
}
