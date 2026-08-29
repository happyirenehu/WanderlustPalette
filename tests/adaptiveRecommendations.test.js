import destinations from '../data/destinations';
import { getAdaptiveRecommendations } from '../utils/adaptiveRecommendations';
import { buildPreferenceProfile } from '../utils/preferenceProfile';

describe('adaptive recommendations', () => {
  test('is deterministic, changes ranking for stronger evidence, and has no duplicates', () => {
    const calm = buildPreferenceProfile({ recentVibeIds: ['calm', 'calm'] });
    const warm = buildPreferenceProfile({ recentVibeIds: ['warm', 'warm'] });
    const calmResult = getAdaptiveRecommendations(destinations, calm, { limit: 3 });
    const warmResult = getAdaptiveRecommendations(destinations, warm, { limit: 3 });
    expect(calmResult.recommendations.map((item) => item.destination.id)).toEqual(['santorini-greece', 'milos-greece', 'lake-bled-slovenia']);
    expect(warmResult.recommendations[0].destination.id).toBe('marrakech-morocco');
    expect(new Set(calmResult.recommendations.map((item) => item.destination.id)).size).toBe(3);
  });

  test('honours exclusions and returns deterministic defaults for an empty profile', () => {
    const result = getAdaptiveRecommendations(destinations, { hasEvidence: false }, { currentDestinationId: 'santorini-greece', limit: 2 });
    expect(result).toMatchObject({ personalized: false });
    expect(result.recommendations.map((item) => item.destination.id)).toEqual(['milos-greece', 'provence-france']);
  });

  test('only emits structured reasons for contributing signals', () => {
    const profile = buildPreferenceProfile({ recentVibeIds: ['calm'], dreamDestinationIds: ['milos-greece'] });
    const result = getAdaptiveRecommendations(destinations, profile, { limit: 1 });
    expect(result.recommendations[0].reasons).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'recentVibe', vibeId: 'calm' })]));
    expect(result.recommendations[0].reasons).toHaveLength(2);
  });
});
