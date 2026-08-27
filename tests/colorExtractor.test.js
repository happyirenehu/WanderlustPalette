import { extractPalette } from '../utils/colorExtractor';

const FALLBACK_PALETTE = ['#1A1A1A', '#4A5568', '#718096', '#CBD5E0', '#F7FAFC'];

describe('extractPalette', () => {
  test('returns the fallback palette for empty input', () => {
    expect(extractPalette([])).toEqual(FALLBACK_PALETTE);
  });

  test('ignores invalid RGB entries', () => {
    const input = [
      [255, 0, 0],
      null,
      [0, 255],
      [256, 0, 0],
      [-1, 0, 0],
      [0, Number.NaN, 0],
    ];

    expect(extractPalette(input)).toEqual([
      '#FF0000',
      '#1A1A1A',
      '#4A5568',
      '#718096',
      '#CBD5E0',
    ]);
  });

  test('ranks the most frequent colours first', () => {
    const input = [
      [255, 0, 0],
      [0, 0, 255],
      [255, 0, 0],
      [0, 255, 0],
      [255, 0, 0],
      [0, 0, 255],
    ];

    expect(extractPalette(input).slice(0, 3)).toEqual([
      '#FF0000',
      '#0000FF',
      '#00FF00',
    ]);
  });

  test('converts RGB values to uppercase hex', () => {
    expect(extractPalette([[10, 171, 205]])[0]).toBe('#0AABCD');
  });

  test('pads fewer than five valid colours with fallback colours', () => {
    expect(extractPalette([[255, 255, 255], [0, 0, 0]])).toEqual([
      '#000000',
      '#FFFFFF',
      '#1A1A1A',
      '#4A5568',
      '#718096',
    ]);
  });

  test('returns the fallback palette when every entry is invalid', () => {
    expect(extractPalette([null, 'red', [], [300, 20, 20]])).toEqual(FALLBACK_PALETTE);
  });

  test('produces deterministic output for colours with equal frequency', () => {
    const firstInput = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
    const secondInput = [[0, 0, 255], [255, 0, 0], [0, 255, 0]];
    const expected = ['#0000FF', '#00FF00', '#FF0000', '#1A1A1A', '#4A5568'];

    expect(extractPalette(firstInput)).toEqual(expected);
    expect(extractPalette(secondInput)).toEqual(expected);
  });
});
