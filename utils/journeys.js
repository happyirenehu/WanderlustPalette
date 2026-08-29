import { normalizeExpenses } from './expenses';
import { normalizeJourneyDestinationId } from './journeyDestination';

const EMPTY_TEXT = '';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : EMPTY_TEXT;
}

function normalizePalette(value) {
  return Array.isArray(value)
    ? value.filter((color) => typeof color === 'string' && color.trim()).map((color) => color.trim())
    : [];
}

function normalizeImageSource(value, imageUri) {
  return value === 'personal' && imageUri.startsWith('file://') ? 'personal' : '';
}

function splitLegacyLocation(location) {
  const [destination = EMPTY_TEXT, ...countryParts] = cleanText(location).split(',');
  return {
    destination: destination.trim(),
    country: countryParts.join(',').trim(),
  };
}

export function validateJourneyInput(input = {}) {
  const values = {
    destination: cleanText(input.destination),
    country: cleanText(input.country),
    date: cleanText(input.date),
    notes: cleanText(input.notes),
  };
  const errors = {};

  if (!values.destination) errors.destination = 'Destination is required.';
  if (!values.country) errors.country = 'Country is required.';
  if (!values.date) errors.date = 'Date is required.';

  return { isValid: Object.keys(errors).length === 0, values, errors };
}

export function normalizeJourney(value, fallbackId = EMPTY_TEXT) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const legacyLocation = splitLegacyLocation(value.location);
  const destination = cleanText(value.destination) || legacyLocation.destination;
  const country = cleanText(value.country) || legacyLocation.country;
  const date = cleanText(value.date);
  const id = cleanText(value.id) || cleanText(fallbackId);

  if (!id || !destination || !country || !date) return null;

  const createdAt = cleanText(value.createdAt) || `${date}T00:00:00.000Z`;
  const updatedAt = cleanText(value.updatedAt) || createdAt;
  const imageUri = cleanText(value.imageUri);
  const destinationId = normalizeJourneyDestinationId(value.destinationId);

  return {
    id,
    destination,
    country,
    ...(destinationId ? { destinationId } : {}),
    date,
    notes: cleanText(value.notes) || cleanText(value.description),
    imageUri,
    imageSource: normalizeImageSource(value.imageSource, imageUri),
    palette: normalizePalette(value.palette),
    totalCost: Number.isFinite(value.totalCost) ? value.totalCost : null,
    expenses: normalizeExpenses(value.expenses),
    createdAt,
    updatedAt,
  };
}

export function normalizeJourneys(value) {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set();

  return value.reduce((journeys, item, index) => {
    const journey = normalizeJourney(item, `journey-${index + 1}`);
    if (!journey || seenIds.has(journey.id)) return journeys;
    seenIds.add(journey.id);
    journeys.push(journey);
    return journeys;
  }, []);
}

export function createLocalJourneyId(now = Date.now(), random = Math.random()) {
  return `journey-${now.toString(36)}-${Math.floor(random * 0x100000).toString(36)}`;
}

export function addJourney(journeys, input, options = {}) {
  const currentJourneys = normalizeJourneys(journeys);
  const validation = validateJourneyInput(input);
  if (!validation.isValid) return { journeys: currentJourneys, journey: null, errors: validation.errors };

  const timestamp = options.timestamp || new Date().toISOString();
  let id = options.id || createLocalJourneyId();
  let suffix = 2;
  while (currentJourneys.some((journey) => journey.id === id)) {
    id = `${options.id || id}-${suffix}`;
    suffix += 1;
  }

  const journey = normalizeJourney({
    ...validation.values,
    id,
    imageSource: input.imageSource,
    imageUri: input.imageUri,
    destinationId: input.destinationId,
    expenses: input.expenses,
    palette: input.palette,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { journeys: [...currentJourneys, journey], journey, errors: {} };
}

export function updateJourney(journeys, id, input, timestamp = new Date().toISOString()) {
  const currentJourneys = normalizeJourneys(journeys);
  const targetIndex = currentJourneys.findIndex((journey) => journey.id === id);
  if (targetIndex < 0) return { journeys: currentJourneys, journey: null, errors: {}, found: false };

  const validation = validateJourneyInput(input);
  if (!validation.isValid) {
    return { journeys: currentJourneys, journey: null, errors: validation.errors, found: true };
  }

  const hasPhotoUpdate = Object.prototype.hasOwnProperty.call(input, 'imageUri');
  const hasPaletteUpdate = Object.prototype.hasOwnProperty.call(input, 'palette');
  const hasDestinationIdUpdate = Object.prototype.hasOwnProperty.call(input, 'destinationId');
  const hasExpensesUpdate = Object.prototype.hasOwnProperty.call(input, 'expenses');
  const journey = normalizeJourney({
    ...currentJourneys[targetIndex],
    ...validation.values,
    ...(hasPhotoUpdate ? { imageSource: input.imageSource, imageUri: input.imageUri } : {}),
    ...(hasPaletteUpdate ? { palette: input.palette } : {}),
    ...(hasDestinationIdUpdate ? { destinationId: input.destinationId } : {}),
    ...(hasExpensesUpdate ? { expenses: input.expenses } : {}),
    updatedAt: timestamp,
  });
  const nextJourneys = currentJourneys.slice();
  nextJourneys[targetIndex] = journey;

  return { journeys: nextJourneys, journey, errors: {}, found: true };
}

export function deleteJourney(journeys, id) {
  const currentJourneys = normalizeJourneys(journeys);
  const nextJourneys = currentJourneys.filter((journey) => journey.id !== id);
  return {
    journeys: nextJourneys,
    deleted: nextJourneys.length !== currentJourneys.length,
  };
}
