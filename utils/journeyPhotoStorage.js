import { Directory, File, Paths } from 'expo-file-system';

import { getSupportedPhotoExtension } from './photoPicker';

export const PERSONAL_IMAGE_SOURCE = 'personal';
export const OWNED_PHOTO_DIRECTORY_PARTS = ['wanderlust-palette', 'journey-photos'];

function defaultDirectory() {
  return new Directory(Paths.document, ...OWNED_PHOTO_DIRECTORY_PARTS);
}

function normalizeDirectoryUri(uri) {
  return typeof uri === 'string' && uri ? `${uri.replace(/\/+$/, '')}/` : '';
}

export function isOwnedJourneyPhotoUri(uri, directoryUri = defaultDirectory().uri) {
  if (typeof uri !== 'string' || !uri.startsWith('file://')) return false;
  const ownedPrefix = normalizeDirectoryUri(directoryUri);
  return Boolean(ownedPrefix) && uri.startsWith(ownedPrefix) && uri.length > ownedPrefix.length;
}

export function createOwnedPhotoFilename(journeyId, asset, now = Date.now(), random = Math.random()) {
  const extension = getSupportedPhotoExtension(asset);
  if (!extension) return '';
  const safeId = typeof journeyId === 'string'
    ? journeyId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
    : '';
  const collisionPart = Math.floor(Math.max(0, Math.min(0.999999999, random)) * 0x100000000)
    .toString(36)
    .padStart(7, '0');
  return `${safeId || 'journey'}-${Math.max(0, Number(now) || 0).toString(36)}-${collisionPart}.${extension}`;
}

export function isSupportedPickerSourceUri(uri) {
  return typeof uri === 'string' && uri.startsWith('file://');
}

export async function copyPersonalJourneyPhoto(asset, journeyId, dependencies = {}) {
  const sourceUri = asset?.uri;
  const filename = createOwnedPhotoFilename(
    journeyId,
    asset,
    dependencies.now?.() ?? Date.now(),
    dependencies.random?.() ?? Math.random(),
  );
  if (!isSupportedPickerSourceUri(sourceUri) || !filename) {
    return { ok: false, error: 'This photo format could not be saved safely.' };
  }

  try {
    const directory = dependencies.directory || defaultDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const source = dependencies.createFile?.(sourceUri) || new File(sourceUri);
    const destination = dependencies.createDestination?.(directory, filename) || new File(directory, filename);
    source.copy(destination);
    return {
      ok: true,
      imageSource: PERSONAL_IMAGE_SOURCE,
      imageUri: destination.uri,
    };
  } catch (error) {
    return { ok: false, error: 'The photo could not be saved on this device.' };
  }
}

export async function cleanupOwnedJourneyPhoto(photo, dependencies = {}) {
  if (photo?.imageSource !== PERSONAL_IMAGE_SOURCE) return false;

  try {
    const directory = dependencies.directory || defaultDirectory();
    if (!isOwnedJourneyPhotoUri(photo.imageUri, directory.uri)) return false;
    const file = dependencies.createFile?.(photo.imageUri) || new File(photo.imageUri);
    if (file.exists) file.delete();
    return true;
  } catch (error) {
    return false;
  }
}
