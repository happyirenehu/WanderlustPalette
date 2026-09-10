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

const EXPANDED_DESTINATION_IDS = [
  'oaxaca-mexico',
  'hoi-an-vietnam',
  'cape-town-south-africa',
  'luang-prabang-laos',
  'reykjavik-iceland',
  'petra-jordan',
  'ubud-indonesia',
  'cartagena-colombia',
  'jaipur-india',
  'banff-canada',
  'valparaiso-chile',
  'istanbul-turkiye',
  'zanzibar-tanzania',
  'havana-cuba',
  'namib-naukluft-namibia',
  'jiuzhaigou-china',
];

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

  test('keeps the original records and adds twelve complete, unique stable destination records', () => {
    expect(destinations).toHaveLength(28);
    expect(new Set(destinations.map((item) => item.id)).size).toBe(28);
    expect(destinations.slice(0, 16).map((item) => item.id)).toEqual([
      'santorini-greece', 'milos-greece', 'provence-france', 'lake-bled-slovenia',
      'marrakech-morocco', 'seville-spain', 'tuscany-italy', 'madeira-portugal',
      'azores-portugal', 'lofoten-norway', 'kyoto-japan', 'queenstown-new-zealand',
      'oaxaca-mexico', 'hoi-an-vietnam', 'cape-town-south-africa', 'luang-prabang-laos',
    ]);
    expect(destinations.slice(16).map((item) => item.id)).toEqual(EXPANDED_DESTINATION_IDS.slice(4));

    const validVibeIds = new Set(vibes.map((item) => item.id));
    const validColorIds = new Set(colors.map((item) => item.id));
    const expected = {
      'oaxaca-mexico': { countryCode: 'MX', travelRegion: 'North America', budget: 'budget', vibeIds: ['warm', 'energetic'], colorIds: ['terracotta', 'citrus'] },
      'hoi-an-vietnam': { countryCode: 'VN', travelRegion: 'Southeast Asia', budget: 'budget', vibeIds: ['warm', 'dreamy'], colorIds: ['citrus', 'dusty-rose'] },
      'cape-town-south-africa': { countryCode: 'ZA', travelRegion: 'Southern Africa', budget: 'moderate', vibeIds: ['wild', 'energetic'], colorIds: ['ocean-blue', 'forest-green'] },
      'luang-prabang-laos': { countryCode: 'LA', travelRegion: 'Southeast Asia', budget: 'budget', vibeIds: ['calm', 'dreamy'], colorIds: ['citrus', 'forest-green'] },
    };

    destinations.forEach((destination) => {
      const { id } = destination;
      expect(destination).toMatchObject({ id, ...expected[id] });
      expect(destination.countryCode).toMatch(/^[A-Z]{2}$/);
      expect(destination.vibeIds.every((vibeId) => validVibeIds.has(vibeId))).toBe(true);
      expect(destination.colorIds.every((colorId) => validColorIds.has(colorId))).toBe(true);
      expect(destination.palette.length).toBeGreaterThanOrEqual(4);
      if (EXPANDED_DESTINATION_IDS.includes(id)) expect(destination.palette).toHaveLength(5);
      expect(destination.palette.every((color) => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
      expect(destination.imageUri).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(destination.imageAlt).toBeTruthy();
      expect(destination.imageCredit).toContain('Unsplash');
      expect(destination.imageAttributionUrl).toMatch(/^https:\/\/unsplash\.com/);
    });
    expect(colors.find((color) => color.name === 'Golden').id).toBe('citrus');
  });

  test('covers every curated vibe, colour family, and budget level with multiple destinations', () => {
    vibes.forEach((vibe) => {
      expect(recommendDestinations(vibe.id, destinations, vibes).length).toBeGreaterThanOrEqual(4);
    });
    colors.forEach((color) => {
      expect(recommendDestinationsByColor(color.id, destinations, colors).length).toBeGreaterThanOrEqual(4);
    });
    ['budget', 'moderate', 'premium'].forEach((budget) => {
      expect(destinations.filter((destination) => destination.budget === budget).length).toBeGreaterThanOrEqual(4);
    });
  });

  test('keeps every hero image unique and records the five selected photo sources exactly', () => {
    expect(destinations.every((destination) => destination.imageUri && destination.imageAlt && destination.imageAttributionUrl)).toBe(true);
    expect(new Set(destinations.map((destination) => destination.imageUri)).size).toBe(destinations.length);

    const selectedPhotos = {
      'tuscany-italy': {
        imageUri: 'https://images.unsplash.com/photo-1516108317508-6788f6a160e4',
        imageCredit: 'Photo by Giuseppe Mondì via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/village-under-clear-sky-fJWYwHWYQpY',
      },
      'oaxaca-mexico': {
        imageUri: 'https://images.unsplash.com/photo-1686448921760-342483ed478f',
        imageCredit: 'Photo by Anastasiia Malai via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/a-white-car-parked-on-the-side-of-a-street-CNJ20oUKGjE',
      },
      'hoi-an-vietnam': {
        imageUri: 'https://images.unsplash.com/photo-1676019556644-25abbce12a58',
        imageCredit: 'Photo by Nguyen Minh via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/a-group-of-people-walking-down-a-street-under-paper-lanterns-RFtsukCpnPQ',
      },
      'seville-spain': {
        imageUri: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826',
        imageCredit: 'Photo by Henrique Ferreira via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/seville-cathedral-and-giralda-in-seville-62QRdDoe44M',
      },
      'marrakech-morocco': {
        imageUri: 'https://images.unsplash.com/photo-1615482475488-8f1ff9addba5',
        imageCredit: 'Photo by JR Harris via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/beige-concrete-building-near-palm-trees-under-blue-sky-during-daytime-1Nr4XZzt6ds',
      },
      'luang-prabang-laos': {
        imageUri: 'https://images.unsplash.com/photo-1771783572346-9a4d8a4d967b',
        imageCredit: 'Photo by Kevin Charit via Unsplash',
        imageAttributionUrl: 'https://unsplash.com/photos/village-nestled-by-a-wide-river-with-mountains-beyond-QQ_CJiTod30',
      },
    };

    Object.entries(selectedPhotos).forEach(([id, expected]) => {
      expect(destinations.find((destination) => destination.id === id)).toMatchObject(expected);
    });

    const marrakech = destinations.find((destination) => destination.id === 'marrakech-morocco');
    const marrakechSource = `${marrakech.imageUri} ${marrakech.imageAttributionUrl}`;
    expect(marrakechSource).not.toMatch(/BeMc6A68Mpg|OZXMG7bQ-Kc|YSabBvW1aR4/);
    expect(destinations.find((destination) => destination.id === 'luang-prabang-laos').imageAttributionUrl).not.toContain('2ZyqiH_JPWA');
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
    expect(ocean.map((item) => item.id)).toEqual(['santorini-greece', 'milos-greece', 'lake-bled-slovenia', 'madeira-portugal', 'azores-portugal', 'lofoten-norway', 'queenstown-new-zealand', 'cape-town-south-africa', 'reykjavik-iceland', 'banff-canada', 'zanzibar-tanzania', 'jiuzhaigou-china']);
    expect(recommendDestinationsByColor('forest-green', destinations, colors).map((item) => item.id)).toContain('lake-bled-slovenia');
  });

  test('expansion destinations participate in deterministic vibe and colour recommendations', () => {
    expect(recommendDestinations('warm', destinations, vibes).map((item) => item.id)).toEqual([
      'marrakech-morocco', 'seville-spain', 'tuscany-italy', 'oaxaca-mexico', 'hoi-an-vietnam',
      'petra-jordan', 'jaipur-india', 'istanbul-turkiye', 'havana-cuba',
    ]);
    expect(recommendDestinations('energetic', destinations, vibes).map((item) => item.id)).toContain('cape-town-south-africa');
    expect(recommendDestinationsByColor('citrus', destinations, colors).map((item) => item.id)).toEqual([
      'marrakech-morocco', 'seville-spain', 'queenstown-new-zealand', 'oaxaca-mexico', 'hoi-an-vietnam', 'luang-prabang-laos',
      'petra-jordan', 'jaipur-india', 'valparaiso-chile', 'istanbul-turkiye', 'zanzibar-tanzania',
    ]);
    expect(recommendDestinationsByColor('lavender', destinations, colors).map((item) => item.id)).not.toContain('luang-prabang-laos');
  });

  test('keeps Hoi An warm and dreamy while separating Warm from Terracotta discovery', () => {
    const hoiAn = destinations.find((item) => item.id === 'hoi-an-vietnam');
    const warm = recommendDestinations('warm', destinations, vibes).map((item) => item.id);
    const terracotta = recommendDestinationsByColor('terracotta', destinations, colors).map((item) => item.id);
    const golden = recommendDestinationsByColor('citrus', destinations, colors).map((item) => item.id);
    const dustyRose = recommendDestinationsByColor('dusty-rose', destinations, colors).map((item) => item.id);

    expect(hoiAn.vibeIds).toEqual(['warm', 'dreamy']);
    expect(hoiAn.colorIds).toEqual(['citrus', 'dusty-rose']);
    expect(hoiAn.colorIds).not.toContain('terracotta');
    expect(warm).toHaveLength(9);
    expect(warm).not.toEqual(terracotta);
    expect(terracotta).toEqual(['marrakech-morocco', 'seville-spain', 'tuscany-italy', 'oaxaca-mexico', 'petra-jordan', 'cartagena-colombia', 'jaipur-india', 'havana-cuba', 'namib-naukluft-namibia']);
    expect(golden).toHaveLength(11);
    expect(golden).toContain('hoi-an-vietnam');
    expect(dustyRose).toContain('hoi-an-vietnam');
  });

  test('keeps Luang Prabang calm and dreamy with its final Golden and Forest Green identity', () => {
    const luangPrabang = destinations.find((item) => item.id === 'luang-prabang-laos');
    expect(luangPrabang.vibeIds).toEqual(['calm', 'dreamy']);
    expect(luangPrabang.colorIds).toEqual(['citrus', 'forest-green']);
    expect(luangPrabang.colorIds).not.toContain('lavender');
    expect(luangPrabang.palette).toEqual(['#C49A68', '#A87568', '#3F5138', '#8A8069', '#263329']);
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

  test('Related stays safe and bounded for every expansion destination', () => {
    EXPANDED_DESTINATION_IDS.forEach((id) => {
      const related = getRelatedDestinations(id, destinations);
      expect(related.map((item) => item.id)).not.toContain(id);
      expect(new Set(related.map((item) => item.id)).size).toBe(related.length);
      expect(related.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('deterministic destination recommendations', () => {
  test('returns the expected destinations for a valid vibe in catalogue order', () => {
    expect(recommendDestinations('calm', destinations, vibes).map((item) => item.id)).toEqual([
      'santorini-greece', 'milos-greece', 'lake-bled-slovenia', 'azores-portugal', 'kyoto-japan', 'luang-prabang-laos',
      'ubud-indonesia', 'banff-canada', 'zanzibar-tanzania', 'jiuzhaigou-china',
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
