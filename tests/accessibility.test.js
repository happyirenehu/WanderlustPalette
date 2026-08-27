import getContrastColor from '../utils/accessibility';

describe('getContrastColor', () => {
  test.each([
    ['#FFFFFF', '#000000'],
    ['#F2E8CF', '#000000'],
  ])('returns black text for the light background %s', (background, expected) => {
    expect(getContrastColor(background)).toBe(expected);
  });

  test.each([
    ['#000000', '#FFFFFF'],
    ['#1A1A1A', '#FFFFFF'],
  ])('returns white text for the dark background %s', (background, expected) => {
    expect(getContrastColor(background)).toBe(expected);
  });

  test('expands 3-digit hex input before calculating contrast', () => {
    expect(getContrastColor('#FFF')).toBe('#000000');
    expect(getContrastColor('#123')).toBe('#FFFFFF');
  });

  test('uses white at the threshold and black immediately above it', () => {
    expect(getContrastColor('#808080')).toBe('#FFFFFF');
    expect(getContrastColor('#818181')).toBe('#000000');
  });
});
