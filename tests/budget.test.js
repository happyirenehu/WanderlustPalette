import colors from '../data/colors';
import destinations from '../data/destinations';
import vibes from '../data/vibes';
import { applyBudgetPreference, getBudgetDisplay, normalizeBudget } from '../utils/budget';
import { recommendDestinations, recommendDestinationsByColor } from '../utils/discovery';

describe('curated travel budget model', () => {
  test.each([
    ['budget', 'budget'], [' moderate ', 'moderate'], ['PREMIUM', 'premium'],
    ['unknown', ''], [null, ''], [undefined, ''], [{}, ''],
  ])('normalizes %p safely', (value, expected) => {
    expect(normalizeBudget(value)).toBe(expected);
  });

  test('provides clear displays without implying exact prices', () => {
    expect(getBudgetDisplay('budget')).toBe('$ · Budget-friendly');
    expect(getBudgetDisplay('moderate')).toBe('$$ · Moderate');
    expect(getBudgetDisplay('premium')).toBe('$$$ · Premium');
    expect(getBudgetDisplay('luxury')).toBe('');
  });

  test('ANY preserves existing vibe recommendation ordering and identity', () => {
    const base = recommendDestinations('calm', destinations, vibes);
    expect(applyBudgetPreference(base, 'any')).toBe(base);
    expect(applyBudgetPreference(base, 'any').map((item) => item.id)).toEqual(base.map((item) => item.id));
  });

  test('filters vibe recommendations deterministically by budget', () => {
    const base = recommendDestinations('calm', destinations, vibes);
    expect(applyBudgetPreference(base, 'moderate').map((item) => item.id)).toEqual(['milos-greece', 'lake-bled-slovenia', 'azores-portugal', 'kyoto-japan']);
    expect(applyBudgetPreference(base, 'moderate')).toEqual(applyBudgetPreference(base, 'moderate'));
  });

  test('filters colour recommendations and safely returns no matches', () => {
    const base = recommendDestinationsByColor('ocean-blue', destinations, colors);
    expect(applyBudgetPreference(base, 'premium').map((item) => item.id)).toEqual(['santorini-greece', 'lofoten-norway', 'queenstown-new-zealand']);
    expect(applyBudgetPreference(recommendDestinations('calm', destinations, vibes), 'budget').map((item) => item.id)).toEqual(['luang-prabang-laos']);
  });

  test('handles malformed catalogues, missing budgets, and invalid preferences safely', () => {
    const base = recommendDestinations('calm', [null, { id: 'one', name: 'One', country: 'A', vibeIds: ['calm'] }], vibes);
    expect(applyBudgetPreference(base, 'premium')).toEqual([]);
    expect(applyBudgetPreference(base, 'unknown')).toBe(base);
    expect(applyBudgetPreference(null, 'budget')).toEqual([]);
  });
});
