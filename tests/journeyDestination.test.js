import destinations from '../data/destinations';
import { formatCountryName, formatDestinationName } from '../utils/i18n';
import {
  deriveDreamMemoryDestinationIds,
  getDestinationJourneyPrefill,
  isJourneyIdentityField,
  isDreamMemoryDestination,
  normalizeJourneyDestinationId,
} from '../utils/journeyDestination';
import { normalizeJourney } from '../utils/journeys';

const JOURNEY = {
  country: 'Japan',
  date: '2026-08-29',
  destination: 'Kyoto',
  id: 'journey-kyoto',
};

describe('Journey destination linkage', () => {
  test('known destination prefill uses canonical catalogue data and retains its stable ID', () => {
    expect(getDestinationJourneyPrefill('kyoto-japan')).toEqual({
      country: 'Japan',
      countryCode: 'JP',
      destination: 'Kyoto',
      destinationId: 'kyoto-japan',
    });
    expect(normalizeJourney({ ...JOURNEY, destinationId: 'kyoto-japan' }).destinationId)
      .toBe('kyoto-japan');
  });

  test('manual and legacy Journeys remain valid without destinationId', () => {
    const manual = normalizeJourney({ ...JOURNEY, destination: 'My family cabin' });
    expect(manual.destination).toBe('My family cabin');
    expect(manual).not.toHaveProperty('destinationId');
  });

  test('unknown and localized names are never accepted as stable IDs', () => {
    expect(normalizeJourneyDestinationId('京都')).toBe('');
    expect(normalizeJourneyDestinationId('Kyoto')).toBe('');
    expect(normalizeJourneyDestinationId('kyoto-japan')).toBe('kyoto-japan');
  });

  test('language switching changes display only and never changes the linked ID', () => {
    const id = 'kyoto-japan';
    const destination = destinations.find((item) => item.id === id);
    expect(formatDestinationName('en', id, destination.name)).toBe('Kyoto');
    expect(formatDestinationName('zh-Hant', id, destination.name)).toBe('Kyoto / 京都');
    expect(formatCountryName('zh-Hant', destination.countryCode, destination.country)).toBe('Japan / 日本');
    expect(normalizeJourney({ ...JOURNEY, destinationId: id }).destinationId).toBe(id);
  });

  test('a catalog-prefilled Journey keeps its stable ID until an identity field is edited', () => {
    const prefill = getDestinationJourneyPrefill('kyoto-japan');
    expect(prefill.destinationId).toBe('kyoto-japan');
    expect(isJourneyIdentityField('date')).toBe(false);
    expect(isJourneyIdentityField('notes')).toBe(false);
    expect(isJourneyIdentityField('destination')).toBe(true);
    expect(isJourneyIdentityField('country')).toBe(true);
  });

  test('new catalog destinations are valid Dream and Journey stable identities', () => {
    ['oaxaca-mexico', 'hoi-an-vietnam', 'cape-town-south-africa', 'luang-prabang-laos'].forEach((id) => {
      expect(normalizeJourneyDestinationId(id)).toBe(id);
      expect(getDestinationJourneyPrefill(id)?.destinationId).toBe(id);
    });
    expect(deriveDreamMemoryDestinationIds(
      ['oaxaca-mexico'],
      [{ ...JOURNEY, destinationId: 'oaxaca-mexico' }],
    )).toEqual(['oaxaca-mexico']);
  });
});

describe('Dream to Memory derivation', () => {
  test('derives memory state only from matching stable Dream and Journey IDs', () => {
    const memories = deriveDreamMemoryDestinationIds(
      ['kyoto-japan', 'milos-greece'],
      [{ ...JOURNEY, destinationId: 'kyoto-japan' }],
    );
    expect(memories).toEqual(['kyoto-japan']);
    expect(isDreamMemoryDestination(memories, 'kyoto-japan')).toBe(true);
    expect(isDreamMemoryDestination(memories, 'milos-greece')).toBe(false);
  });

  test('nonmatching or localized display names do not create a relationship', () => {
    expect(deriveDreamMemoryDestinationIds(['kyoto-japan'], [{ ...JOURNEY, destination: '京都' }]))
      .toEqual([]);
    expect(deriveDreamMemoryDestinationIds(['kyoto-japan'], [{ ...JOURNEY, destinationId: 'milos-greece' }]))
      .toEqual([]);
  });

  test('removing the Journey removes the derived relationship naturally', () => {
    expect(deriveDreamMemoryDestinationIds(['kyoto-japan'], [])).toEqual([]);
    expect(deriveDreamMemoryDestinationIds(['kyoto-japan'], null)).toEqual([]);
  });

  test('an identity edit clears the linked ID and cannot falsely mark a Dream as a Memory', () => {
    const original = normalizeJourney({ ...JOURNEY, destinationId: 'kyoto-japan' });
    const edited = normalizeJourney({
      ...original,
      destination: 'Paris',
      destinationId: isJourneyIdentityField('destination') ? '' : original.destinationId,
    });

    expect(edited).not.toHaveProperty('destinationId');
    expect(deriveDreamMemoryDestinationIds(['kyoto-japan'], [edited])).toEqual([]);
    expect(normalizeJourneyDestinationId('Paris')).toBe('');
    expect(normalizeJourneyDestinationId('京都')).toBe('');
  });
});
