import {
  addFavouriteId,
  isFavouriteId,
  normalizeFavouriteIds,
  removeFavouriteId,
} from '../utils/dreamPalette';

describe('Dream Palette transformations', () => {
  test('normalizes empty and malformed collections', () => {
    expect(normalizeFavouriteIds(null)).toEqual([]);
    expect(normalizeFavouriteIds([' kyoto ', '', null, 'kyoto'])).toEqual(['kyoto']);
  });

  test('saves a destination without allowing duplicates', () => {
    expect(addFavouriteId([], 'kyoto')).toEqual(['kyoto']);
    expect(addFavouriteId(['kyoto'], 'kyoto')).toEqual(['kyoto']);
  });

  test('ignores an invalid destination ID', () => {
    expect(addFavouriteId(['kyoto'], '  ')).toEqual(['kyoto']);
  });

  test('removes a saved destination', () => {
    expect(removeFavouriteId(['kyoto', 'milos'], 'kyoto')).toEqual(['milos']);
  });

  test('removing a nonexistent destination is a safe no-op', () => {
    expect(removeFavouriteId(['kyoto'], 'missing')).toEqual(['kyoto']);
  });

  test('reports saved state from normalized IDs', () => {
    expect(isFavouriteId([' kyoto ', 'kyoto'], 'kyoto')).toBe(true);
    expect(isFavouriteId(['kyoto'], 'milos')).toBe(false);
  });

  test('remains consistent across repeated save/remove operations', () => {
    const saved = addFavouriteId(addFavouriteId([], 'milos'), 'milos');
    const removed = removeFavouriteId(removeFavouriteId(saved, 'milos'), 'milos');
    expect(saved).toEqual(['milos']);
    expect(removed).toEqual([]);
  });
});
