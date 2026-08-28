import AsyncStorage from '@react-native-async-storage/async-storage';

export const COUNTRY_FACTS_STORAGE_KEY = '@wanderlust_palette/country_facts_v1';
export const COUNTRY_FACTS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function isFacts(value) {
  return value && typeof value === 'object'
    && typeof value.countryCode === 'string'
    && typeof value.countryName === 'string'
    && (typeof value.capitalCity === 'string' || typeof value.region === 'string');
}

export function parseCountryFactsCache(value) {
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce((result, [code, record]) => {
      if (record && isFacts(record.facts) && Number.isFinite(record.fetchedAt) && record.fetchedAt > 0) {
        result[code] = { facts: record.facts, fetchedAt: record.fetchedAt };
      }
      return result;
    }, {});
  } catch (error) {
    return {};
  }
}

export async function loadCountryFacts(countryCode, storage = AsyncStorage, now = Date.now()) {
  const code = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  try {
    const cache = parseCountryFactsCache(await storage.getItem(COUNTRY_FACTS_STORAGE_KEY));
    const record = cache[code] || null;
    return { record, fresh: Boolean(record && now - record.fetchedAt <= COUNTRY_FACTS_MAX_AGE_MS) };
  } catch (error) {
    return { record: null, fresh: false };
  }
}

export async function saveCountryFacts(facts, storage = AsyncStorage, now = Date.now()) {
  if (!isFacts(facts)) return false;
  try {
    const cache = parseCountryFactsCache(await storage.getItem(COUNTRY_FACTS_STORAGE_KEY));
    cache[facts.countryCode] = { facts, fetchedAt: now };
    await storage.setItem(COUNTRY_FACTS_STORAGE_KEY, JSON.stringify(cache));
    return true;
  } catch (error) {
    return false;
  }
}
