import getJourneyPaletteTheme from '../utils/journeyPaletteTheme';

describe('Journey palette atmosphere', () => {
  test('derives a soft light atmosphere with dark readable foreground', () => {
    expect(getJourneyPaletteTheme(['#DCEEFF', '#E6B86A'])).toEqual({
      backgroundColor: '#EFF1EF',
      borderColor: '#F8E9D0',
      foregroundColor: '#000000',
      primaryColor: '#DCEEFF',
      primaryForegroundColor: '#000000',
      secondaryColor: '#E6B86A',
    });
  });

  test('derives a dark atmosphere with light readable foreground', () => {
    expect(getJourneyPaletteTheme(['#101828', '#684C78'])).toMatchObject({
      backgroundColor: '#121A22',
      foregroundColor: '#FFFFFF',
      primaryForegroundColor: '#FFFFFF',
    });
  });

  test('uses one deterministic fallback for missing and malformed palettes', () => {
    const fallback = getJourneyPaletteTheme();
    expect(getJourneyPaletteTheme([])).toEqual(fallback);
    expect(getJourneyPaletteTheme(['not-a-colour', '#123', null])).toEqual(fallback);
    expect(fallback).toMatchObject({
      primaryColor: '#E8EEF2',
      secondaryColor: '#B8C4C1',
      foregroundColor: '#000000',
    });
  });

  test('does not mutate saved Journey palette data', () => {
    const palette = [' #DCEEFF ', '#E6B86A', 'bad'];
    const original = [...palette];
    getJourneyPaletteTheme(palette);
    expect(palette).toEqual(original);
  });

  test('selects the first distinct valid secondary colour safely', () => {
    expect(getJourneyPaletteTheme(['#112233', '#112233', 'bad', '#AABBCC']).secondaryColor)
      .toBe('#AABBCC');
    expect(getJourneyPaletteTheme(['#112233']).secondaryColor).toBe('#B8C4C1');
  });

  test('returns deterministic foreground contrast', () => {
    const palette = ['#334455', '#AA7744'];
    expect(getJourneyPaletteTheme(palette).foregroundColor)
      .toBe(getJourneyPaletteTheme(palette).foregroundColor);
  });
});
