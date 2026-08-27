import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeFavouriteIds } from './dreamPalette';

export const DREAM_PALETTE_STORAGE_KEY = '@wanderlust_palette/dream_palette';

export function parseStoredFavouriteIds(value) {
  if (value === null) return [];
  try {
    return normalizeFavouriteIds(JSON.parse(value));
  } catch (error) {
    return [];
  }
}

export async function loadFavouriteIds(storage = AsyncStorage) {
  try {
    const value = await storage.getItem(DREAM_PALETTE_STORAGE_KEY);
    return { ids: parseStoredFavouriteIds(value), error: null };
  } catch (error) {
    return { ids: [], error: 'Dream Palette could not be loaded on this device.' };
  }
}

export async function saveFavouriteIds(ids, storage = AsyncStorage) {
  try {
    await storage.setItem(DREAM_PALETTE_STORAGE_KEY, JSON.stringify(normalizeFavouriteIds(ids)));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: 'Dream Palette could not be saved on this device.' };
  }
}
