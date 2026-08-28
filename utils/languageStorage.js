import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LOCALE, normalizeLocale } from './i18n';

export const LANGUAGE_STORAGE_KEY = '@wanderlust_palette/language';

export async function loadLanguage(storage = AsyncStorage) {
  try {
    const value = await storage.getItem(LANGUAGE_STORAGE_KEY);
    return { locale: normalizeLocale(value), error: null };
  } catch (error) {
    return { locale: DEFAULT_LOCALE, error: null };
  }
}

export async function saveLanguage(locale, storage = AsyncStorage) {
  try {
    await storage.setItem(LANGUAGE_STORAGE_KEY, normalizeLocale(locale));
    return { ok: true };
  } catch (error) {
    return { ok: false };
  }
}
