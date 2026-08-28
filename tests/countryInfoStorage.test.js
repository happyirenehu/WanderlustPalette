jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import { COUNTRY_FACTS_MAX_AGE_MS, COUNTRY_FACTS_STORAGE_KEY, loadCountryFacts, parseCountryFactsCache, saveCountryFacts } from '../utils/countryInfoStorage';

const facts = { countryCode: 'JP', countryName: 'Japan', capitalCity: 'Tokyo', region: 'East Asia & Pacific' };
const now = 2000000000000;

function storageWith(value = null) {
  return { getItem: jest.fn().mockResolvedValue(value), setItem: jest.fn().mockResolvedValue(undefined) };
}

describe('country facts cache', () => {
  test('handles empty and corrupt cache', () => {
    expect(parseCountryFactsCache(null)).toEqual({});
    expect(parseCountryFactsCache('{bad')).toEqual({});
  });
  test('loads fresh and stale per-country records', async () => {
    const freshValue = JSON.stringify({ JP: { facts, fetchedAt: now - 100 } });
    await expect(loadCountryFacts('jp', storageWith(freshValue), now)).resolves.toMatchObject({ fresh: true, record: { facts } });
    const staleValue = JSON.stringify({ JP: { facts, fetchedAt: now - COUNTRY_FACTS_MAX_AGE_MS - 1 } });
    await expect(loadCountryFacts('JP', storageWith(staleValue), now)).resolves.toMatchObject({ fresh: false, record: { facts } });
    await expect(loadCountryFacts('NO', storageWith(freshValue), now)).resolves.toEqual({ record: null, fresh: false });
  });
  test('ignores invalid fetchedAt and malformed records', () => {
    expect(parseCountryFactsCache(JSON.stringify({ JP: { facts, fetchedAt: 'today' }, XX: {} }))).toEqual({});
  });
  test('survives storage read rejection', async () => {
    const storage = { getItem: jest.fn().mockRejectedValue(new Error('no')) };
    await expect(loadCountryFacts('JP', storage, now)).resolves.toEqual({ record: null, fresh: false });
  });
  test('writes without removing other countries', async () => {
    const norway = { countryCode: 'NO', countryName: 'Norway', capitalCity: 'Oslo', region: 'Europe' };
    const storage = storageWith(JSON.stringify({ NO: { facts: norway, fetchedAt: now - 1 } }));
    await expect(saveCountryFacts(facts, storage, now)).resolves.toBe(true);
    const saved = JSON.parse(storage.setItem.mock.calls[0][1]);
    expect(storage.setItem).toHaveBeenCalledWith(COUNTRY_FACTS_STORAGE_KEY, expect.any(String));
    expect(Object.keys(saved)).toEqual(['NO', 'JP']);
  });
  test('survives write rejection and rejects invalid facts', async () => {
    const storage = { getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockRejectedValue(new Error('full')) };
    await expect(saveCountryFacts(facts, storage, now)).resolves.toBe(false);
    await expect(saveCountryFacts({}, storage, now)).resolves.toBe(false);
  });
});
