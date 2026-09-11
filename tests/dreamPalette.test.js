import {
  addFavouriteId,
  isFavouriteId,
  normalizeFavouriteIds,
  removeFavouriteId,
} from '../utils/dreamPalette';
import destinations from '../data/destinations';
import { resolveDestinationIds } from '../utils/discovery';

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

  test('supports a Discover quick action with the same Dream Palette source of truth', () => {
    const destinationId = 'kyoto-japan';
    const addedFromDiscover = addFavouriteId([], destinationId);
    const removedFromDiscover = removeFavouriteId(addedFromDiscover, destinationId);

    expect(isFavouriteId(addedFromDiscover, destinationId)).toBe(true);
    expect(isFavouriteId(removedFromDiscover, destinationId)).toBe(false);
  });

  test('removes a Dream Palette card through the same saved destination IDs', () => {
    const destinationId = 'kyoto-japan';
    const savedIds = addFavouriteId([], destinationId);
    const removedIds = removeFavouriteId(savedIds, destinationId);

    expect(resolveDestinationIds(savedIds, destinations).map((destination) => destination.id)).toEqual([destinationId]);
    expect(resolveDestinationIds(removedIds, destinations)).toEqual([]);
  });
});
