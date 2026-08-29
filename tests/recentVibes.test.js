jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import vibes from '../data/vibes';
import {
  addRecentVibeId,
  loadRecentVibeIds,
  MAX_RECENT_VIBES,
  normalizeRecentVibeIds,
  parseStoredRecentVibeIds,
  RECENT_VIBES_STORAGE_KEY,
  saveRecentVibeIds,
} from '../utils/recentVibes';

describe('recent vibe signals', () => {
  test('keeps stable IDs, repeats, recency order, and at most eight entries', () => {
    const ids = ['calm', 'warm', 'calm', 'wild', 'dreamy', 'romantic', 'energetic', 'calm', 'unknown'];
    expect(normalizeRecentVibeIds(ids, vibes)).toEqual(ids.slice(0, MAX_RECENT_VIBES));
    expect(addRecentVibeId(['warm', 'calm'], 'calm', vibes)).toEqual(['calm', 'warm', 'calm']);
  });

  test('ignores invalid IDs and malformed storage without changing valid input', () => {
    const source = ['calm', 'not-a-vibe'];
    expect(addRecentVibeId(source, 'unknown', vibes)).toEqual(['calm']);
    expect(source).toEqual(['calm', 'not-a-vibe']);
    expect(parseStoredRecentVibeIds('{bad json', vibes)).toEqual([]);
    expect(parseStoredRecentVibeIds('["calm","京都"]', vibes)).toEqual(['calm']);
  });

  test('uses the existing AsyncStorage boundary with language-neutral IDs', async () => {
    const storage = { getItem: jest.fn().mockResolvedValue('["warm","calm"]'), setItem: jest.fn().mockResolvedValue() };
    await expect(loadRecentVibeIds(storage, vibes)).resolves.toEqual({ ids: ['warm', 'calm'], error: null });
    await saveRecentVibeIds(['calm', 'bad'], storage, vibes);
    expect(storage.setItem).toHaveBeenCalledWith(RECENT_VIBES_STORAGE_KEY, '["calm"]');
  });
});
