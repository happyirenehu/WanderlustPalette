export const PHOTO_COLOR_BUCKET_COUNT = 4096;

const MAX_DIMENSION = 64;
const MAX_PIXELS = MAX_DIMENSION * MAX_DIMENSION;
const MIN_ALPHA = 32;
const MIN_DISTANCE_SQUARED = 1024;

function bucketIndex(red, green, blue) {
  // I wrote this part to reduce thousands of pixel colours into manageable
  // colour groups before choosing the dominant palette.
  return ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
}

function colorFromBucket(index) {
  const rgb = [((index >> 8) & 15) * 17, ((index >> 4) & 15) * 17, (index & 15) * 17];
  const hex = `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return { rgb, hex };
}

function squaredDistance(first, second) {
  return first.reduce((total, value, index) => total + ((value - second[index]) ** 2), 0);
}

function isDistinct(candidate, selected) {
  return selected.every((color) => squaredDistance(candidate.rgb, color.rgb) >= MIN_DISTANCE_SQUARED);
}

// I wrote this:
// This is the main Photo → Colour algorithm.
// It groups similar pixel colours together, counts the strongest ones,
// then keeps three dominant colours that are different enough from each other.
export function extractPhotoColors(rgba, width, height) {
  if (!(rgba instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height)) {
    return { ok: false, colors: [], error: 'Invalid RGBA input.' };
  }
  if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { ok: false, colors: [], error: 'Invalid analysis dimensions.' };
  }

  const pixelCount = width * height;
  if (!Number.isSafeInteger(pixelCount) || pixelCount > MAX_PIXELS || rgba.length !== pixelCount * 4) {
    return { ok: false, colors: [], error: 'RGBA buffer length does not match the analysis image.' };
  }

  const histogram = new Uint16Array(PHOTO_COLOR_BUCKET_COUNT);
  let validPixelCount = 0;
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (rgba[offset + 3] < MIN_ALPHA) continue;
    histogram[bucketIndex(rgba[offset], rgba[offset + 1], rgba[offset + 2])] += 1;
    validPixelCount += 1;
  }

  if (!validPixelCount) {
    return { ok: false, colors: [], error: 'No sufficiently opaque pixels.' };
  }

  const colors = [];
  for (let rank = 0; rank < 3; rank += 1) {
    let bestIndex = -1;
    let bestCount = 0;
    for (let index = 0; index < PHOTO_COLOR_BUCKET_COUNT; index += 1) {
      const count = histogram[index];
      if (!count) continue;
      const candidate = colorFromBucket(index);
      if (!isDistinct(candidate, colors)) continue;
      if (count > bestCount) {
        bestCount = count;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) break;
    colors.push(colorFromBucket(bestIndex));
  }

  return colors.length === 3
    ? { ok: true, colors, error: null, validPixelCount }
    : { ok: false, colors: [], error: 'Fewer than three distinct colours were found.' };
}
