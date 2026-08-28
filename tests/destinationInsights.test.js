import colors from '../data/colors';
import destinations from '../data/destinations';
import vibes from '../data/vibes';
import getDreamPaletteInsights from '../utils/destinationInsights';

describe('Dream Palette insights', () => {
  test('returns a safe empty insight', () => {
    expect(getDreamPaletteInsights([], destinations, vibes, colors)).toMatchObject({ total: 0, dominantVibe: null, dominantColor: null, dominantBudget: null });
  });
  test('supports one destination', () => {
    expect(getDreamPaletteInsights(['santorini-greece'], destinations, vibes, colors)).toMatchObject({ total: 1, dominantVibe: { id: 'calm' }, dominantColor: { id: 'ocean-blue' } });
  });
  test('computes dominant vibe and colour', () => {
    expect(getDreamPaletteInsights(['santorini-greece', 'milos-greece', 'azores-portugal'], destinations, vibes, colors)).toMatchObject({ total: 3, dominantVibe: { id: 'calm', count: 3 }, dominantColor: { id: 'ocean-blue', count: 3 } });
  });
  test('uses canonical order for ties', () => {
    expect(getDreamPaletteInsights(['marrakech-morocco'], destinations, vibes, colors)).toMatchObject({ dominantVibe: { id: 'warm' }, dominantColor: { id: 'terracotta' } });
  });
  test('ignores duplicate, stale, malformed IDs and malformed catalogue records', () => {
    expect(getDreamPaletteInsights(['kyoto-japan', 'kyoto-japan', 'stale', null], [null, ...destinations], vibes, colors).total).toBe(1);
  });
  test('derives a one-place typical budget and canonical distribution', () => {
    const result = getDreamPaletteInsights(['santorini-greece'], destinations, vibes, colors);
    expect(result.dominantBudget).toMatchObject({ id: 'premium', count: 1 });
    expect(result.budgetDistribution.map(({ id, count }) => ({ id, count }))).toEqual([
      { id: 'budget', count: 0 }, { id: 'moderate', count: 0 }, { id: 'premium', count: 1 },
    ]);
  });
  test('counts a mixed budget distribution and uses canonical order for ties', () => {
    const result = getDreamPaletteInsights(['marrakech-morocco', 'santorini-greece'], destinations, vibes, colors);
    expect(result.dominantBudget.id).toBe('budget');
    expect(result.budgetDistribution.map((item) => item.count)).toEqual([1, 0, 1]);
  });
  test('ignores missing and invalid budget data', () => {
    const catalogue = [
      { id: 'missing', name: 'Missing', country: 'A', vibeIds: ['calm'] },
      { id: 'invalid', name: 'Invalid', country: 'B', vibeIds: ['calm'], budget: 'luxury' },
    ];
    const result = getDreamPaletteInsights(['missing', 'invalid', null], catalogue, vibes, colors);
    expect(result.total).toBe(2);
    expect(result.dominantBudget).toBeNull();
    expect(result.budgetDistribution.every((item) => item.count === 0)).toBe(true);
  });
});
