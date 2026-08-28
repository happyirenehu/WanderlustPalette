import {
  addJourney,
  createLocalJourneyId,
  deleteJourney,
  normalizeJourney,
  normalizeJourneys,
  updateJourney,
  validateJourneyInput,
} from '../utils/journeys';

const BASE_JOURNEY = {
  id: 'kyoto-japan',
  destination: 'Kyoto',
  country: 'Japan',
  date: '2025-04-12',
  notes: 'Temple gardens',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('journey validation and normalization', () => {
  test('rejects empty and whitespace-only required input', () => {
    const result = validateJourneyInput({ destination: ' ', country: '', date: '\t', notes: '' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({
      destination: 'Destination is required.',
      country: 'Country is required.',
      date: 'Date is required.',
    });
  });

  test('trims fields and permits missing optional notes', () => {
    const result = validateJourneyInput({
      destination: '  Taipei ',
      country: ' Taiwan  ',
      date: ' 2026-03-04 ',
    });

    expect(result).toEqual({
      isValid: true,
      values: { destination: 'Taipei', country: 'Taiwan', date: '2026-03-04', notes: '' },
      errors: {},
    });
  });

  test('normalizes legacy sample fields without losing existing display data', () => {
    const journey = normalizeJourney({
      id: 'lofoten-norway',
      location: 'Lofoten, Norway',
      date: '2024-09-03',
      description: 'Northern light evenings',
      imageUri: 'https://example.com/lofoten.jpg',
      palette: ['#123456'],
      totalCost: 1200,
      expenses: [{ category: 'Food', amount: 100 }],
    });

    expect(journey).toMatchObject({
      destination: 'Lofoten',
      country: 'Norway',
      notes: 'Northern light evenings',
      imageUri: 'https://example.com/lofoten.jpg',
      palette: ['#123456'],
      totalCost: 1200,
    });
  });

  test('drops malformed or incomplete records and duplicate IDs', () => {
    expect(normalizeJourneys([
      BASE_JOURNEY,
      { ...BASE_JOURNEY, destination: 'Duplicate' },
      null,
      { id: 'missing-country', destination: 'Nowhere', date: '2026-01-01' },
    ])).toHaveLength(1);
  });

  test('keeps legacy and remote journeys valid while normalizing personal-photo metadata safely', () => {
    expect(normalizeJourney(BASE_JOURNEY)).toMatchObject({ imageSource: '', imageUri: '' });
    expect(normalizeJourney({
      ...BASE_JOURNEY,
      imageSource: 'personal',
      imageUri: 'file:///documents/wanderlust-palette/journey-photos/trip.jpg',
    })).toMatchObject({ imageSource: 'personal' });
    expect(normalizeJourney({
      ...BASE_JOURNEY,
      imageSource: 'personal',
      imageUri: 'https://example.com/not-owned.jpg',
    })).toMatchObject({ imageSource: '' });
    expect(normalizeJourney({
      ...BASE_JOURNEY,
      imageSource: 'unexpected',
      imageUri: 'file:///external/photo.jpg',
    })).toMatchObject({ imageSource: '' });
  });

  test('creates deterministic local IDs when time and randomness are supplied', () => {
    expect(createLocalJourneyId(1000, 0)).toBe('journey-rs-0');
    expect(createLocalJourneyId(1000, 0)).toBe('journey-rs-0');
  });
});

describe('journey CRUD transformations', () => {
  test('adds a trimmed journey with timestamps and a unique ID', () => {
    const result = addJourney([BASE_JOURNEY], {
      destination: '  Oslo ',
      country: ' Norway ',
      date: ' 2026-06-01 ',
      notes: '  Fjord trip ',
    }, { id: 'oslo-norway', timestamp: '2026-01-02T00:00:00.000Z' });

    expect(result.journeys).toHaveLength(2);
    expect(result.journey).toMatchObject({
      id: 'oslo-norway',
      destination: 'Oslo',
      country: 'Norway',
      notes: 'Fjord trip',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  test('avoids a duplicate requested ID', () => {
    const result = addJourney([BASE_JOURNEY], {
      destination: 'Nara', country: 'Japan', date: '2026-05-01', notes: '',
    }, { id: BASE_JOURNEY.id, timestamp: '2026-01-02T00:00:00.000Z' });

    expect(result.journey.id).toBe('kyoto-japan-2');
  });

  test('edits an existing journey without losing preserved fields', () => {
    const withPalette = { ...BASE_JOURNEY, palette: ['#ABCDEF'], imageUri: 'https://example.com/image.jpg' };
    const result = updateJourney([withPalette], BASE_JOURNEY.id, {
      destination: 'Kyoto City', country: 'Japan', date: '2025-04-13', notes: '',
    }, '2026-02-01T00:00:00.000Z');

    expect(result.found).toBe(true);
    expect(result.journey).toMatchObject({
      destination: 'Kyoto City',
      imageUri: 'https://example.com/image.jpg',
      palette: ['#ABCDEF'],
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  test('preserves or explicitly replaces personal-photo fields during edit', () => {
    const withPhoto = {
      ...BASE_JOURNEY,
      imageSource: 'personal',
      imageUri: 'file:///documents/wanderlust-palette/journey-photos/old.jpg',
    };
    const preserved = updateJourney([withPhoto], BASE_JOURNEY.id, {
      destination: 'Kyoto', country: 'Japan', date: '2025-04-13', notes: 'Updated',
    });
    expect(preserved.journey).toMatchObject({
      imageSource: 'personal', imageUri: withPhoto.imageUri,
    });

    const replaced = updateJourney([withPhoto], BASE_JOURNEY.id, {
      destination: 'Kyoto', country: 'Japan', date: '2025-04-13', notes: 'Updated',
      imageSource: 'personal',
      imageUri: 'file:///documents/wanderlust-palette/journey-photos/new.jpg',
    });
    expect(replaced.journey).toMatchObject({
      imageSource: 'personal', imageUri: 'file:///documents/wanderlust-palette/journey-photos/new.jpg',
    });
  });

  test('leaves data consistent for nonexistent edit and delete targets', () => {
    const editResult = updateJourney([BASE_JOURNEY], 'missing', BASE_JOURNEY);
    const deleteResult = deleteJourney(editResult.journeys, 'missing');

    expect(editResult.found).toBe(false);
    expect(deleteResult.deleted).toBe(false);
    expect(deleteResult.journeys).toEqual(normalizeJourneys([BASE_JOURNEY]));
  });

  test('can delete the final journey and produce an empty collection', () => {
    expect(deleteJourney([BASE_JOURNEY], BASE_JOURNEY.id)).toEqual({ journeys: [], deleted: true });
  });

  test('remains consistent across repeated add, edit, and delete operations', () => {
    const added = addJourney([], {
      destination: 'Seoul', country: 'South Korea', date: '2026-09-01', notes: '',
    }, { id: 'seoul', timestamp: '2026-01-01T00:00:00.000Z' });
    const edited = updateJourney(added.journeys, 'seoul', {
      destination: 'Seoul', country: 'South Korea', date: '2026-09-02', notes: 'Autumn trip',
    }, '2026-01-02T00:00:00.000Z');
    const deleted = deleteJourney(edited.journeys, 'seoul');

    expect(added.journeys).toHaveLength(1);
    expect(edited.journey.notes).toBe('Autumn trip');
    expect(deleted).toEqual({ journeys: [], deleted: true });
  });
});
