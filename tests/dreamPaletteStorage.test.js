jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import {
  DREAM_PALETTE_STORAGE_KEY,
  loadFavouriteIds,
  parseStoredFavouriteIds,
  saveFavouriteIds,
} from '../utils/dreamPaletteStorage';

describe('Dream Palette storage parsing', () => {
  test('returns an empty collection for null and malformed stored data', () => {
    expect(parseStoredFavouriteIds(null)).toEqual([]);
    expect(parseStoredFavouriteIds('{bad json')).toEqual([]);
    expect(parseStoredFavouriteIds('{"id":"wrong-shape"}')).toEqual([]);
  });

  test('deduplicates and cleans stored destination IDs', () => {
    expect(parseStoredFavouriteIds('[" kyoto ","kyoto","milos",null]')).toEqual(['kyoto', 'milos']);
  });
});

describe('Dream Palette storage operations', () => {
  const storage = { getItem: jest.fn(), setItem: jest.fn() };

  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
  });

  test('loads an empty palette when AsyncStorage returns null', async () => {
    storage.getItem.mockResolvedValue(null);
    await expect(loadFavouriteIds(storage)).resolves.toEqual({ ids: [], error: null });
    expect(storage.getItem).toHaveBeenCalledWith(DREAM_PALETTE_STORAGE_KEY);
  });

  test('loads normalized favourite IDs', async () => {
    storage.getItem.mockResolvedValue('["kyoto","kyoto","milos"]');
    await expect(loadFavouriteIds(storage)).resolves.toEqual({ ids: ['kyoto', 'milos'], error: null });
  });

  test('reports read rejection without throwing', async () => {
    storage.getItem.mockRejectedValue(new Error('read failed'));
    const result = await loadFavouriteIds(storage);
    expect(result.ids).toEqual([]);
    expect(result.error).toMatch(/could not be loaded/i);
  });

  test('writes only normalized destination IDs', async () => {
    storage.setItem.mockResolvedValue(undefined);
    await expect(saveFavouriteIds(['kyoto', 'kyoto', ' milos '], storage))
      .resolves.toEqual({ ok: true, error: null });
    expect(storage.setItem).toHaveBeenCalledWith(
      DREAM_PALETTE_STORAGE_KEY,
      '["kyoto","milos"]',
    );
  });

  test('reports write rejection without throwing', async () => {
    storage.setItem.mockRejectedValue(new Error('write failed'));
    await expect(saveFavouriteIds(['kyoto'], storage)).resolves.toEqual({
      ok: false,
      error: 'Dream Palette could not be saved on this device.',
    });
  });
});
