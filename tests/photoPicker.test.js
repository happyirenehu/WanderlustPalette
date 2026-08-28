import { getSupportedPhotoExtension, normalizePhotoPickerResult } from '../utils/photoPicker';

describe('personal photo picker normalization', () => {
  test('treats cancellation as a non-error outcome', () => {
    expect(normalizePhotoPickerResult({ canceled: true, assets: null })).toEqual({
      status: 'cancelled', asset: null,
    });
  });

  test.each([
    undefined,
    {},
    { canceled: false },
    { canceled: false, assets: [] },
    { canceled: false, assets: [{}] },
    { canceled: false, assets: [{ uri: '  ' }] },
  ])('rejects a malformed or missing asset %#', (result) => {
    expect(normalizePhotoPickerResult(result)).toEqual({ status: 'invalid', asset: null });
  });

  test('normalizes one valid image asset without retaining unrelated picker data', () => {
    expect(normalizePhotoPickerResult({
      canceled: false,
      assets: [{
        fileName: 'IMG_1001.HEIC', height: 3024, mimeType: 'IMAGE/HEIC', type: 'image', uri: ' file:///tmp/photo.heic ', width: 4032,
      }],
    })).toEqual({
      status: 'selected',
      asset: {
        fileName: 'IMG_1001.HEIC', height: 3024, mimeType: 'image/heic', uri: 'file:///tmp/photo.heic', width: 4032,
      },
    });
  });

  test('rejects a video result', () => {
    expect(normalizePhotoPickerResult({
      canceled: false, assets: [{ type: 'video', uri: 'file:///tmp/video.mov' }],
    }).status).toBe('invalid');
  });
});

describe('personal photo extension selection', () => {
  test.each([
    [{ mimeType: 'image/jpeg' }, 'jpg'],
    [{ mimeType: 'image/png' }, 'png'],
    [{ mimeType: 'image/heic' }, 'heic'],
    [{ mimeType: 'image/heif' }, 'heif'],
    [{ fileName: 'holiday.JPEG' }, 'jpg'],
    [{ uri: 'file:///tmp/holiday.png?preview=1' }, 'png'],
  ])('preserves supported image formats', (asset, expected) => {
    expect(getSupportedPhotoExtension(asset)).toBe(expected);
  });

  test('rejects unsupported and conflicting declared formats', () => {
    expect(getSupportedPhotoExtension({ mimeType: 'image/gif', fileName: 'photo.jpg' })).toBe('');
    expect(getSupportedPhotoExtension({ fileName: '../../photo.exe' })).toBe('');
  });
});
