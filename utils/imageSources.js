const UNSPLASH_HOST = 'images.unsplash.com';

export function getDisplayImageUri(imageUri, width = 1200, quality = 80) {
  if (typeof imageUri !== 'string' || !imageUri.trim()) return '';
  const value = imageUri.trim();

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== UNSPLASH_HOST) return value;
    url.searchParams.set('fit', 'max');
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality));
    return url.toString();
  } catch (error) {
    return value;
  }
}

export default getDisplayImageUri;
