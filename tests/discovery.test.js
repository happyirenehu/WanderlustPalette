import destinations from '../data/destinations';
import vibes from '../data/vibes';
import {
  getVibeById,
  normalizeDestination,
  normalizeDestinations,
  normalizeVibe,
  recommendDestinations,
  resolveDestinationIds,
} from '../utils/discovery';

describe('vibe and destination data safety', () => {
  test('provides the six curated vibes with palettes', () => {
    expect(vibes.map((vibe) => vibe.id)).toEqual(['calm', 'dreamy', 'warm', 'wild', 'romantic', 'energetic']);
    expect(vibes.every((vibe) => vibe.palette.length >= 4)).toBe(true);
  });

  test('normalizes a vibe with a missing palette', () => {
    expect(normalizeVibe({ id: 'quiet', name: 'Quiet' })).toEqual({
      id: 'quiet', name: 'Quiet', description: '', colorFamily: '', palette: [],
    });
  });

  test('rejects malformed destinations and permits missing optional copy', () => {
    expect(normalizeDestination(null)).toBeNull();
    expect(normalizeDestination({ id: 'bad', name: 'Bad', country: 'Nowhere' })).toBeNull();
    expect(normalizeDestination({
      id: 'valid', name: 'Valid', country: 'Somewhere', vibeIds: ['calm'],
    })).toMatchObject({ description: '', whyItMatches: '', palette: [] });
  });

  test('prevents duplicate catalogue destinations', () => {
    const duplicate = { id: 'one', name: 'One', country: 'A', vibeIds: ['calm'] };
    expect(normalizeDestinations([duplicate, { ...duplicate, name: 'Duplicate' }])).toHaveLength(1);
  });
});

describe('deterministic destination recommendations', () => {
  test('returns the expected destinations for a valid vibe in catalogue order', () => {
    expect(recommendDestinations('calm', destinations, vibes).map((item) => item.id)).toEqual([
      'santorini-greece', 'milos-greece', 'lake-bled-slovenia', 'azores-portugal', 'kyoto-japan',
    ]);
  });

  test('returns the same order across repeated calls', () => {
    const first = recommendDestinations('wild', destinations, vibes).map((item) => item.id);
    const second = recommendDestinations('wild', destinations, vibes).map((item) => item.id);
    expect(second).toEqual(first);
  });

  test('returns an empty list for an unknown vibe or empty catalogue', () => {
    expect(recommendDestinations('unknown', destinations, vibes)).toEqual([]);
    expect(recommendDestinations('calm', [], vibes)).toEqual([]);
  });

  test('supports a valid vibe with no matching destinations', () => {
    const customVibes = [...vibes, { id: 'still', name: 'Still', palette: [] }];
    expect(recommendDestinations('still', destinations, customVibes)).toEqual([]);
  });

  test('supports destinations associated with multiple vibes', () => {
    const santorini = normalizeDestinations(destinations).find((item) => item.id === 'santorini-greece');
    expect(recommendDestinations('calm', destinations, vibes)).toContainEqual(santorini);
    expect(recommendDestinations('romantic', destinations, vibes)).toContainEqual(santorini);
  });

  test('filters malformed and duplicate catalogue records during recommendation', () => {
    const valid = { id: 'one', name: 'One', country: 'A', vibeIds: ['calm'] };
    expect(recommendDestinations('calm', [null, valid, valid, { id: 'bad' }], vibes)).toEqual([
      normalizeDestination(valid),
    ]);
  });

  test('resolves saved IDs in saved order and drops stale IDs', () => {
    expect(resolveDestinationIds(['kyoto-japan', 'stale', 'kyoto-japan', 'milos-greece'], destinations)
      .map((item) => item.id)).toEqual(['kyoto-japan', 'milos-greece']);
  });

  test('finds a known vibe and safely rejects an unknown one', () => {
    expect(getVibeById('warm', vibes).name).toBe('Warm');
    expect(getVibeById('missing', vibes)).toBeNull();
  });
});
