import colors from '../data/colors';
import destinations from '../data/destinations';
import vibes from '../data/vibes';
import { buildPreferenceProfile, PREFERENCE_WEIGHTS } from '../utils/preferenceProfile';

describe('preference profile', () => {
  test('returns an empty profile without manufacturing evidence', () => {
    expect(buildPreferenceProfile({ destinations, vibes, colors })).toMatchObject({ hasEvidence: false, dominantVibe: null, dominantColor: null, vibeAffinities: [], colorAffinities: [] });
  });

  test('weights newest repeated recent vibes above older interactions', () => {
    const profile = buildPreferenceProfile({ recentVibeIds: ['calm', 'warm', 'calm'], destinations, vibes, colors });
    expect(profile.vibeAffinities[0]).toMatchObject({ id: 'calm', recentScore: 14 });
    expect(profile.vibeAffinities[1]).toMatchObject({ id: 'warm', recentScore: 7 });
    expect(PREFERENCE_WEIGHTS.recentNewest).toBe(8);
  });

  test('combines Dream, linked Journey, and Journey palette evidence without inferring free text', () => {
    const journeys = [
      { destinationId: 'kyoto-japan', palette: ['#245B78'] },
      { destination: '京都', palette: ['#B78100'] },
    ];
    const profile = buildPreferenceProfile({ dreamDestinationIds: ['milos-greece'], journeys, destinations, vibes, colors });
    expect(profile.vibeAffinities.find((item) => item.id === 'calm')).toMatchObject({ dreamScore: 3, journeyScore: 2 });
    expect(profile.journeyDestinationIds).toEqual(['kyoto-japan']);
    expect(profile.journeyPaletteColorIds).toEqual(['ocean-blue', 'citrus']);
  });

  test('uses canonical ordering for ties and never mutates inputs', () => {
    const input = { dreamDestinationIds: ['marrakech-morocco'], journeys: [{ palette: ['#9D4428'] }], destinations, vibes, colors };
    const copy = JSON.parse(JSON.stringify(input));
    const profile = buildPreferenceProfile(input);
    expect(profile.dominantVibe.id).toBe('warm');
    expect(profile.dominantColor.id).toBe('terracotta');
    expect(input).toEqual(copy);
  });
});
