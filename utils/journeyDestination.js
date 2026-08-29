import destinationsData from '../data/destinations';
import { normalizeDestinations } from './discovery';
import { normalizeFavouriteIds } from './dreamPalette';

function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isJourneyIdentityField(field) {
  return field === 'destination' || field === 'country';
}

function destinationMap(catalogue) {
  return new Map(normalizeDestinations(catalogue).map((destination) => [destination.id, destination]));
}

export function normalizeJourneyDestinationId(value, catalogue = destinationsData) {
  const id = cleanId(value);
  return id && destinationMap(catalogue).has(id) ? id : '';
}

export function getDestinationJourneyPrefill(destinationId, catalogue = destinationsData) {
  const destination = destinationMap(catalogue).get(cleanId(destinationId));
  return destination
    ? {
      country: destination.country,
      countryCode: destination.countryCode,
      destination: destination.name,
      destinationId: destination.id,
    }
    : null;
}

export function deriveDreamMemoryDestinationIds(favouriteIds, journeys, catalogue = destinationsData) {
  const knownDestinations = destinationMap(catalogue);
  const journeyDestinationIds = new Set(
    (Array.isArray(journeys) ? journeys : [])
      .map((journey) => cleanId(journey?.destinationId))
      .filter((id) => knownDestinations.has(id)),
  );
  return normalizeFavouriteIds(favouriteIds)
    .filter((id) => knownDestinations.has(id) && journeyDestinationIds.has(id));
}

export function isDreamMemoryDestination(memoryDestinationIds, destinationId) {
  const id = cleanId(destinationId);
  return Boolean(id) && normalizeFavouriteIds(memoryDestinationIds).includes(id);
}
