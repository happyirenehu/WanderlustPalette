import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECENT_VIBES_STORAGE_KEY = '@wanderlust_palette/recent_vibes';
import vibesData from '../data/vibes';
import {
  normalizeRecentVibeIds,
  parseStoredRecentVibeIds,
} from './recentVibeSignals';

export { addRecentVibeId, MAX_RECENT_VIBES, normalizeRecentVibeIds, parseStoredRecentVibeIds } from './recentVibeSignals';

export async function loadRecentVibeIds(storage = AsyncStorage, vibes = vibesData) {
  try {
    const value = await storage.getItem(RECENT_VIBES_STORAGE_KEY);
    return { ids: parseStoredRecentVibeIds(value, vibes), error: null };
  } catch {
    return { ids: [], error: 'Recent vibe signals could not be loaded on this device.' };
  }
}

export async function saveRecentVibeIds(ids, storage = AsyncStorage, vibes = vibesData) {
  try {
    await storage.setItem(RECENT_VIBES_STORAGE_KEY, JSON.stringify(normalizeRecentVibeIds(ids, vibes)));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Recent vibe signals could not be saved on this device.' };
  }
}
