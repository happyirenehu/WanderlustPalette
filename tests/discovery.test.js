import destinations from '../data/destinations';
import vibes from '../data/vibes';
import colors from '../data/colors';
import {
  getRelatedDestinations,
  getVibeById,
  normalizeDestination,
  normalizeDestinations,
  normalizeVibe,
  recommendDestinations,
  recommendDestinationsByColor,
  resolveDestinationIds,
} from '../utils/discovery';

describe('vibe and destination data safety', () => {
  test('provides the six curated vibes with palettes', () => {
    expect(vibes.map((vibe) => vibe.id)).toEqual(['calm', 'dreamy', 'warm', 'wild', 'romantic', 'energetic']);
    expect(vibes.every((vibe) => vibe.palette.length >= 4)).toBe(true);
  });

  test('keeps six canonical colours and distinguishes Terracotta from Golden while retaining the citrus ID', () => {
    expect(colors).toHaveLength(6);
    const terracotta = colors.find((color) => color.id === 'terracotta');
    const golden = colors.find((color) => color.id === 'citrus');
    expect(golden.name).toBe('Golden');
    expect(golden.palette).not.toEqual(terracotta.palette);
  });

  test('provides curated travel region and budget metadata for all destinations', () => {
    expect(destinations.every((item) => item.travelRegion)).toBe(true);
    expect(destinations.every((item) => ['budget', 'moderate', 'premium'].includes(item.budget))).toBe(true);
  });

  test('normalizes a vibe with a missing palette', () => {
    expect(normalizeVibe({ id: 'quiet', name: 'Quiet' })).toEqual({
      id: 'quiet', name: 'Quiet', colorId: '', description: '', colorFamily: '', palette: [],
      imageUri: '', imageAlt: '', imageCredit: '', imageAttributionUrl: '',
    });
  });

  test('provides optimized, attributable vibe imagery with fallback-safe metadata', () => {
    expect(vibes.every((vibe) => vibe.imageUri.startsWith('https://images.unsplash.com/'))).toBe(true);
    expect(vibes.every((vibe) => vibe.imageAlt && vibe.imageCredit && vibe.imageAttributionUrl)).toBe(true);
    expect(normalizeVibe({ id: 'offline', name: 'Offline', imageUri: null })).toMatchObject({
      imageUri: '', imageAlt: '', imageCredit: '', imageAttributionUrl: '',
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

describe('colour-led and related discovery', () => {
  test('recommends a valid colour in catalogue order and supports multiple colours', () => {
    const ocean = recommendDestinationsByColor('ocean-blue', destinations, colors);
    expect(ocean.map((item) => item.id)).toEqual(['santorini-greece', 'milos-greece', 'lake-bled-slovenia', 'madeira-portugal', 'azores-portugal', 'lofoten-norway', 'queenstown-new-zealand']);
    expect(recommendDestinationsByColor('forest-green', destinations, colors).map((item) => item.id)).toContain('lake-bled-slovenia');
  });

  test('rejects unknown or malformed colours and empty catalogues', () => {
    expect(recommendDestinationsByColor('unknown', destinations, colors)).toEqual([]);
    expect(recommendDestinationsByColor(null, destinations, colors)).toEqual([]);
    expect(recommendDestinationsByColor('ocean-blue', [], colors)).toEqual([]);
  });

  test('deduplicates colour results and remains deterministic', () => {
    const item = { id: 'one', name: 'One', country: 'A', vibeIds: ['calm'], colorIds: ['ocean-blue'] };
    expect(recommendDestinationsByColor('ocean-blue', [item, item, null], colors)).toHaveLength(1);
    expect(recommendDestinationsByColor('ocean-blue', destinations, colors)).toEqual(recommendDestinationsByColor('ocean-blue', destinations, colors));
  });

  test('scores related destinations, excludes current, breaks ties by catalogue order, and limits to three', () => {
    const related = getRelatedDestinations('santorini-greece', destinations);
    expect(related).toHaveLength(3);
    expect(related.map((item) => item.id)).not.toContain('santorini-greece');
    expect(related[0].id).toBe('kyoto-japan');
  });

  test('handles unknown, malformed, duplicate, and empty related catalogues', () => {
    expect(getRelatedDestinations('unknown', destinations)).toEqual([]);
    expect(getRelatedDestinations('one', [null, { id: 'one', name: 'One', country: 'A', vibeIds: ['x'], colorIds: [] }])).toEqual([]);
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
