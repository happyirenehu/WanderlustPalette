jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import { LANGUAGE_STORAGE_KEY, loadLanguage, saveLanguage } from '../utils/languageStorage';

describe('language preference storage', () => {
  const storage = { getItem: jest.fn(), setItem: jest.fn() };

  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
  });

  test.each([
    [null, 'en'],
    ['en', 'en'],
    ['zh-Hant', 'zh-Hant'],
    ['fr', 'en'],
    ['', 'en'],
  ])('normalizes stored value %p to %s', async (stored, expected) => {
    storage.getItem.mockResolvedValue(stored);
    await expect(loadLanguage(storage)).resolves.toEqual({ locale: expected, error: null });
    expect(storage.getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
  });

  test('falls back to English when reading fails', async () => {
    storage.getItem.mockRejectedValue(new Error('read failed'));
    await expect(loadLanguage(storage)).resolves.toEqual({ locale: 'en', error: null });
  });

  test('writes a normalized supported locale', async () => {
    storage.setItem.mockResolvedValue(undefined);
    await expect(saveLanguage('zh-Hant', storage)).resolves.toEqual({ ok: true });
    expect(storage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'zh-Hant');
  });

  test('normalizes an unsupported value before writing', async () => {
    storage.setItem.mockResolvedValue(undefined);
    await saveLanguage('ja', storage);
    expect(storage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'en');
  });

  test('reports write failure without throwing', async () => {
    storage.setItem.mockRejectedValue(new Error('write failed'));
    await expect(saveLanguage('en', storage)).resolves.toEqual({ ok: false });
  });
});
