jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { document: { uri: 'file:///documents/' } },
}));

import {
  cleanupOwnedJourneyPhoto,
  copyPersonalJourneyPhoto,
  createOwnedPhotoFilename,
  isOwnedJourneyPhotoUri,
  isSupportedPickerSourceUri,
} from '../utils/journeyPhotoStorage';

const OWNED_DIRECTORY_URI = 'file:///documents/wanderlust-palette/journey-photos/';

describe('personal journey photo paths and ownership', () => {
  test('recognizes only files inside the exact app-owned directory', () => {
    expect(isOwnedJourneyPhotoUri(`${OWNED_DIRECTORY_URI}journey-1.jpg`, OWNED_DIRECTORY_URI)).toBe(true);
    expect(isOwnedJourneyPhotoUri('file:///documents/other/photo.jpg', OWNED_DIRECTORY_URI)).toBe(false);
    expect(isOwnedJourneyPhotoUri('file:///documents/wanderlust-palette/journey-photos-backup/photo.jpg', OWNED_DIRECTORY_URI)).toBe(false);
    expect(isOwnedJourneyPhotoUri('https://images.unsplash.com/photo.jpg', OWNED_DIRECTORY_URI)).toBe(false);
    expect(isOwnedJourneyPhotoUri('content://photos/1', OWNED_DIRECTORY_URI)).toBe(false);
    expect(isOwnedJourneyPhotoUri('ph://photos/1', OWNED_DIRECTORY_URI)).toBe(false);
    expect(isOwnedJourneyPhotoUri('not a uri', OWNED_DIRECTORY_URI)).toBe(false);
  });

  test('does not infer durable source support from arbitrary URI schemes', () => {
    expect(isSupportedPickerSourceUri('file:///tmp/photo.jpg')).toBe(true);
    expect(isSupportedPickerSourceUri('content://photos/1')).toBe(false);
    expect(isSupportedPickerSourceUri('ph://photos/1')).toBe(false);
    expect(isSupportedPickerSourceUri('https://example.com/photo.jpg')).toBe(false);
  });

  test('creates a safe collision-resistant filename without using an original path', () => {
    expect(createOwnedPhotoFilename('../My Trip', { fileName: '../../secret.PNG' }, 1000, 0.5))
      .toBe('my-trip-rs-0zik0zk.png');
    expect(createOwnedPhotoFilename('trip', { mimeType: 'image/gif' }, 1000, 0.5)).toBe('');
  });
});

describe('personal journey photo filesystem operations', () => {
  function dependencies(overrides = {}) {
    const directory = { create: jest.fn(), uri: OWNED_DIRECTORY_URI };
    const source = { copy: jest.fn() };
    const destination = { uri: `${OWNED_DIRECTORY_URI}trip-rs-0000000.jpg` };
    return {
      directory,
      now: () => 1000,
      random: () => 0,
      createFile: jest.fn(() => source),
      createDestination: jest.fn(() => destination),
      source,
      destination,
      ...overrides,
    };
  }

  test('prepares the durable directory and copies a supported picker file', async () => {
    const deps = dependencies();
    const result = await copyPersonalJourneyPhoto(
      { mimeType: 'image/jpeg', uri: 'file:///tmp/photo.jpg' }, 'trip', deps,
    );

    expect(deps.directory.create).toHaveBeenCalledWith({ idempotent: true, intermediates: true });
    expect(deps.source.copy).toHaveBeenCalledWith(deps.destination);
    expect(result).toEqual({ ok: true, imageSource: 'personal', imageUri: deps.destination.uri });
  });

  test('reports copy failure without returning a durable URI', async () => {
    const deps = dependencies();
    deps.source.copy.mockImplementation(() => { throw new Error('copy failed'); });

    await expect(copyPersonalJourneyPhoto(
      { mimeType: 'image/png', uri: 'file:///tmp/photo.png' }, 'trip', deps,
    )).resolves.toEqual({ ok: false, error: 'The photo could not be saved on this device.' });
  });

  test('rejects unsupported sources before creating a file', async () => {
    const deps = dependencies();
    const result = await copyPersonalJourneyPhoto(
      { mimeType: 'image/jpeg', uri: 'content://photos/1' }, 'trip', deps,
    );

    expect(result.ok).toBe(false);
    expect(deps.directory.create).not.toHaveBeenCalled();
  });

  test('deletes only explicitly owned files inside the owned directory', async () => {
    const file = { delete: jest.fn(), exists: true };
    const deps = dependencies({ createFile: jest.fn(() => file) });

    await expect(cleanupOwnedJourneyPhoto({
      imageSource: 'personal', imageUri: `${OWNED_DIRECTORY_URI}old.jpg`,
    }, deps)).resolves.toBe(true);
    expect(file.delete).toHaveBeenCalledTimes(1);

    file.delete.mockClear();
    await expect(cleanupOwnedJourneyPhoto({
      imageSource: 'personal', imageUri: 'file:///external/photo.jpg',
    }, deps)).resolves.toBe(false);
    await expect(cleanupOwnedJourneyPhoto({
      imageSource: '', imageUri: `${OWNED_DIRECTORY_URI}unknown.jpg`,
    }, deps)).resolves.toBe(false);
    expect(file.delete).not.toHaveBeenCalled();
  });
});
