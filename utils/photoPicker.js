const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif']);

export function normalizePhotoPickerResult(result) {
  if (!result || typeof result !== 'object') return { status: 'invalid', asset: null };
  if (result.canceled === true) return { status: 'cancelled', asset: null };
  if (!Array.isArray(result.assets) || result.assets.length === 0) {
    return { status: 'invalid', asset: null };
  }

  const asset = result.assets[0];
  if (!asset || typeof asset !== 'object' || typeof asset.uri !== 'string' || !asset.uri.trim()) {
    return { status: 'invalid', asset: null };
  }
  if (asset.type && asset.type !== 'image') return { status: 'invalid', asset: null };

  return {
    status: 'selected',
    asset: {
      fileName: typeof asset.fileName === 'string' ? asset.fileName : '',
      height: Number.isFinite(asset.height) ? asset.height : null,
      mimeType: typeof asset.mimeType === 'string' ? asset.mimeType.toLowerCase() : '',
      uri: asset.uri.trim(),
      width: Number.isFinite(asset.width) ? asset.width : null,
    },
  };
}

export function getSupportedPhotoExtension(asset = {}) {
  const mimeExtensions = {
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
  };
  const mimeType = typeof asset.mimeType === 'string' ? asset.mimeType.toLowerCase() : '';
  if (mimeType) return mimeExtensions[mimeType] || '';

  const candidates = [asset.fileName, asset.uri];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const cleanCandidate = candidate.split(/[?#]/)[0];
    const match = cleanCandidate.match(/\.([a-z0-9]+)$/i);
    const extension = match?.[1]?.toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(extension)) return extension === 'jpeg' ? 'jpg' : extension;
  }
  return '';
}

export default normalizePhotoPickerResult;
