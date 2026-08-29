import { extractPhotoColors, PHOTO_COLOR_BUCKET_COUNT } from '../utils/photoColorExtractor';

const rgba = (pixels) => new Uint8Array(pixels.flat());

describe('production photo color extraction', () => {
  test('returns deterministic frequency-ranked quantized RGB colors', () => {
    const input = rgba([
      [255, 0, 0, 255], [255, 0, 0, 255], [255, 0, 0, 255],
      [0, 255, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255],
    ]);

    expect(extractPhotoColors(input, 3, 2).colors.map((color) => color.hex))
      .toEqual(['#FF0000', '#00FF00', '#0000FF']);
  });

  test('uses 4-bit quantization and ignores transparent pixels', () => {
    const input = rgba([
      [31, 47, 63, 255], [31, 47, 63, 255],
      [255, 0, 0, 0], [0, 255, 0, 255], [0, 0, 255, 255],
    ]);
    const result = extractPhotoColors(input, 5, 1);

    expect(result.validPixelCount).toBe(4);
    expect(result.colors[0]).toEqual({ rgb: [17, 34, 51], hex: '#112233' });
  });

  test('handles ties and similar colors deterministically without mutating input', () => {
    const input = rgba([
      [255, 0, 0, 255], [224, 0, 0, 255],
      [0, 255, 0, 255], [0, 0, 255, 255],
    ]);
    const before = new Uint8Array(input);
    const result = extractPhotoColors(input, 4, 1);

    expect(result.colors.map((color) => color.hex)).toEqual(['#0000FF', '#00FF00', '#EE0000']);
    expect(input).toEqual(before);
    expect(PHOTO_COLOR_BUCKET_COUNT).toBe(4096);
  });

  test('fails safely for invalid, empty, transparent, or insufficiently distinct input', () => {
    expect(extractPhotoColors([], 1, 1).ok).toBe(false);
    expect(extractPhotoColors(new Uint8Array(), 0, 0).ok).toBe(false);
    expect(extractPhotoColors(new Uint8Array([1, 2, 3, 0]), 1, 1).ok).toBe(false);
    expect(extractPhotoColors(new Uint8Array([255, 0, 0, 255]), 1, 1).ok).toBe(false);
  });
});
