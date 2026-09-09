jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import destinations from '../data/destinations';
import colors from '../data/colors';
import vibes from '../data/vibes';
import { getAdaptiveRecommendations } from '../utils/adaptiveRecommendations';
import { buildColourPassport } from '../utils/colourPassport';
import getDreamPaletteInsights from '../utils/destinationInsights';
import { resolveDestinationIds } from '../utils/discovery';
import { addFavouriteId, removeFavouriteId } from '../utils/dreamPalette';
import { translate } from '../utils/i18n';
import {
  getPassportNarrative,
  getRecommendationReasonPresentation,
} from '../utils/personalizationPresentation';
import { buildPreferenceProfile } from '../utils/preferenceProfile';
import { addRecentVibeId, normalizeRecentVibeIds } from '../utils/recentVibeSignals';
import { RECENT_VIBES_STORAGE_KEY, saveRecentVibeIds } from '../utils/recentVibes';

describe('v0.10 production personalization integration', () => {
  test('one intentional selection records one signal while repeated derivation records nothing', () => {
    const history = addRecentVibeId([], 'calm');
    const firstProfile = buildPreferenceProfile({ recentVibeIds: history });
    const rerenderedProfile = buildPreferenceProfile({ recentVibeIds: history });
    expect(history).toEqual(['calm']);
    expect(rerenderedProfile).toEqual(firstProfile);
  });

  test('pre-hydration interactions remain newer than loaded history', () => {
    const pendingInteractions = addRecentVibeId(addRecentVibeId([], 'calm'), 'warm');
    const hydrated = normalizeRecentVibeIds([...pendingInteractions, ...['dreamy', 'calm']]);
    expect(hydrated).toEqual(['warm', 'calm', 'dreamy', 'calm']);
  });

  test('recent vibe interaction changes adaptive ranking immediately', () => {
    const neutral = getAdaptiveRecommendations(destinations, buildPreferenceProfile(), { limit: 1 });
    const warm = getAdaptiveRecommendations(destinations, buildPreferenceProfile({ recentVibeIds: ['warm'] }), { limit: 1 });
    expect(neutral).toMatchObject({ personalized: false });
    expect(warm).toMatchObject({ personalized: true });
    expect(warm.recommendations[0].destination.id).toBe('marrakech-morocco');
  });

  test('bundled display Journeys are excluded until Journey storage contains user data', () => {
    const bundledJourneys = [{ destinationId: 'kyoto-japan', palette: ['#244A3A'] }];
    const freshInstallProfile = buildPreferenceProfile({ journeys: [] });
    const persistedProfile = buildPreferenceProfile({ journeys: bundledJourneys });
    expect(freshInstallProfile.hasEvidence).toBe(false);
    expect(persistedProfile.hasEvidence).toBe(true);
  });

  test('Dream save and removal update only the derived profile', () => {
    const saved = addFavouriteId([], 'milos-greece');
    const withDream = buildPreferenceProfile({ dreamDestinationIds: saved });
    const withoutDream = buildPreferenceProfile({ dreamDestinationIds: removeFavouriteId(saved, 'milos-greece') });
    const withDreamInsights = getDreamPaletteInsights(saved, destinations, vibes, colors);
    const withoutDreamInsights = getDreamPaletteInsights([], destinations, vibes, colors);
    const withDreamPassport = buildColourPassport({ profile: withDream });
    const withoutDreamPassport = buildColourPassport({ profile: withoutDream });
    expect(withDream.dreamDestinationIds).toEqual(['milos-greece']);
    expect(withDreamInsights.total).toBe(1);
    expect(withDreamPassport.dream.dominantColor).toMatchObject({ id: 'ocean-blue' });
    expect(withoutDream.hasEvidence).toBe(false);
    expect(withoutDreamInsights.total).toBe(0);
    expect(withoutDreamPassport.dream.dominantColor).toBeNull();
  });

  test('Journey changes update recommendations and supported passport narrative', () => {
    const journeys = [{ destinationId: 'kyoto-japan', palette: ['#244A3A'] }];
    const profile = buildPreferenceProfile({ dreamDestinationIds: ['santorini-greece'], journeys });
    const passport = buildColourPassport({ profile, journeys });
    expect(getAdaptiveRecommendations(destinations, profile, { limit: 1 }).personalized).toBe(true);
    expect(getPassportNarrative(passport)).toEqual({ key: 'passport.contrast', dreamColorId: 'ocean-blue', memoryColorId: 'forest-green' });
    expect(getPassportNarrative(buildColourPassport({ journeys: [{ palette: ['#244A3A'] }] }))).toMatchObject({ key: 'passport.memoryOnly' });
  });

  test('structured evidence localizes without changing recommendation identity', () => {
    const profile = buildPreferenceProfile({ recentVibeIds: ['calm'] });
    const first = getAdaptiveRecommendations(destinations, profile, { limit: 1 }).recommendations[0];
    const presentation = getRecommendationReasonPresentation(first.reasons[0]);
    expect(translate('en', presentation.key, { name: translate('en', `vibes.${presentation.subjectId}.name`) })).toContain('Calm');
    expect(translate('zh-Hant', presentation.key, { name: translate('zh-Hant', `vibes.${presentation.subjectId}.name`) })).toContain('寧靜');
    expect(resolveDestinationIds([first.destination.id], destinations)[0].id).toBe(first.destination.id);
  });

  test('only recent vibe history crosses the new persistence boundary', async () => {
    const storage = { setItem: jest.fn().mockResolvedValue() };
    await saveRecentVibeIds(['calm'], storage);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(RECENT_VIBES_STORAGE_KEY, '["calm"]');
  });
});
