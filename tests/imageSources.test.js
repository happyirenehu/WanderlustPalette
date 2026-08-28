import getDisplayImageUri from '../utils/imageSources';

describe('display image URL optimization', () => {
  test('preserves the v0.3.2 Unsplash size and quality transformation', () => {
    expect(getDisplayImageUri('https://images.unsplash.com/photo-example')).toBe('https://images.unsplash.com/photo-example?fit=max&w=1200&q=80');
  });
  test('replaces existing optimization parameters without duplication', () => {
    const result = getDisplayImageUri('https://images.unsplash.com/photo-example?auto=format&w=900&q=30');
    expect(result).toBe('https://images.unsplash.com/photo-example?auto=format&w=1200&q=80&fit=max');
  });
  test('does not alter non-Unsplash, empty, or malformed input', () => {
    expect(getDisplayImageUri('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(getDisplayImageUri('')).toBe('');
    expect(getDisplayImageUri(null)).toBe('');
    expect(getDisplayImageUri('not a url')).toBe('not a url');
  });
  test.each([
    'file:///documents/wanderlust-palette/journey-photos/trip.jpg',
    'content://photos/1',
    'ph://photos/1',
  ])('does not apply remote optimization to local URI %s', (uri) => {
    expect(getDisplayImageUri(uri)).toBe(uri);
  });
});
