import colors from '../data/colors';
import destinations from '../data/destinations';
import vibes from '../data/vibes';
import getDreamPaletteInsights from '../utils/destinationInsights';

describe('Dream Palette insights', () => {
  test('returns a safe empty insight', () => {
    expect(getDreamPaletteInsights([], destinations, vibes, colors)).toEqual({ total: 0, dominantVibe: null, dominantColor: null });
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
});
