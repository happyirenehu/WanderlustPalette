function cleanId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeFavouriteIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(cleanId).filter(Boolean))];
}

export function addFavouriteId(ids, destinationId) {
  const normalizedIds = normalizeFavouriteIds(ids);
  const id = cleanId(destinationId);
  if (!id || normalizedIds.includes(id)) return normalizedIds;
  return [...normalizedIds, id];
}

export function removeFavouriteId(ids, destinationId) {
  const id = cleanId(destinationId);
  return normalizeFavouriteIds(ids).filter((item) => item !== id);
}

export function isFavouriteId(ids, destinationId) {
  const id = cleanId(destinationId);
  return Boolean(id) && normalizeFavouriteIds(ids).includes(id);
}
