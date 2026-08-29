jest.mock('@react-native-async-storage/async-storage', () => (
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
));

import {
  JOURNEYS_STORAGE_KEY,
  loadJourneys,
  parseStoredJourneys,
  saveJourneys,
} from '../utils/journeyStorage';

const FALLBACK = [{
  id: 'fallback',
  destination: 'Kyoto',
  country: 'Japan',
  date: '2025-04-12',
  notes: '',
}];

describe('journey storage parsing', () => {
  test('uses fallback journeys when storage returns null', () => {
    expect(parseStoredJourneys(null, FALLBACK)[0]).toMatchObject({ id: 'fallback', destination: 'Kyoto' });
  });

  test('uses fallback journeys for malformed JSON or a non-array value', () => {
    expect(parseStoredJourneys('{bad json', FALLBACK)[0].id).toBe('fallback');
    expect(parseStoredJourneys('{"id":"wrong-shape"}', FALLBACK)[0].id).toBe('fallback');
  });

  test('normalizes valid stored journeys', () => {
    const stored = JSON.stringify([{
      id: 'stored', location: 'Osaka, Japan', date: '2026-04-01', description: 'Food trip',
    }]);

    expect(parseStoredJourneys(stored, FALLBACK)[0]).toMatchObject({
      id: 'stored', destination: 'Osaka', country: 'Japan', notes: 'Food trip',
    });
  });
});

describe('journey storage operations', () => {
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  };

  beforeEach(() => {
    mockStorage.getItem.mockReset();
    mockStorage.setItem.mockReset();
  });

  test('loads and parses persisted journeys', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(FALLBACK));

    const result = await loadJourneys([], mockStorage);

    expect(mockStorage.getItem).toHaveBeenCalledWith(JOURNEYS_STORAGE_KEY);
    expect(result.error).toBeNull();
    expect(result.journeys[0].id).toBe('fallback');
  });

  test('falls back safely when reading storage fails', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('read failed'));

    const result = await loadJourneys(FALLBACK, mockStorage);

    expect(result.journeys[0].id).toBe('fallback');
    expect(result.error).toMatch(/could not be loaded/i);
  });

  test('serializes normalized journeys when writing', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);

    const result = await saveJourneys(FALLBACK, mockStorage);

    expect(result).toEqual({ ok: true, error: null });
    expect(mockStorage.setItem).toHaveBeenCalledWith(JOURNEYS_STORAGE_KEY, expect.any(String));
    expect(JSON.parse(mockStorage.setItem.mock.calls[0][1])[0]).toMatchObject({ id: 'fallback', notes: '' });
  });

  test('persists a photo palette through save and reload without extraction metadata', async () => {
    const journey = {
      ...FALLBACK[0],
      palette: ['#AA2200', '#22AA00', '#0022AA'],
    };
    let storedValue = null;
    mockStorage.setItem.mockImplementation(async (_key, value) => { storedValue = value; });
    mockStorage.getItem.mockImplementation(async () => storedValue);

    await expect(saveJourneys([journey], mockStorage)).resolves.toEqual({ ok: true, error: null });
    const loaded = await loadJourneys([], mockStorage);

    expect(loaded.journeys[0].palette).toEqual(journey.palette);
    expect(loaded.journeys[0]).not.toHaveProperty('extractedPalette');
    expect(loaded.journeys[0]).not.toHaveProperty('paletteSource');
  });

  test('reports write failures without throwing', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('write failed'));

    await expect(saveJourneys(FALLBACK, mockStorage)).resolves.toEqual({
      ok: false,
      error: 'Journeys could not be saved on this device.',
    });
  });
});
