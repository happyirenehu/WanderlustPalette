import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeJourneys } from './journeys';

export const JOURNEYS_STORAGE_KEY = '@wanderlust_palette/journeys';

export function parseStoredJourneys(value, fallbackJourneys = []) {
  if (value === null) return normalizeJourneys(fallbackJourneys);

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeJourneys(parsed) : normalizeJourneys(fallbackJourneys);
  } catch (error) {
    return normalizeJourneys(fallbackJourneys);
  }
}

export async function loadJourneys(fallbackJourneys = [], storage = AsyncStorage) {
  try {
    const storedValue = await storage.getItem(JOURNEYS_STORAGE_KEY);
    return {
      journeys: parseStoredJourneys(storedValue, fallbackJourneys),
      hasStoredJourneys: storedValue !== null,
      error: null,
    };
  } catch (error) {
    return {
      journeys: normalizeJourneys(fallbackJourneys),
      hasStoredJourneys: false,
      error: 'Saved journeys could not be loaded. Showing the bundled journeys instead.',
    };
  }
}

export async function saveJourneys(journeys, storage = AsyncStorage) {
  try {
    await storage.setItem(JOURNEYS_STORAGE_KEY, JSON.stringify(normalizeJourneys(journeys)));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: 'Journeys could not be saved on this device.' };
  }
}
