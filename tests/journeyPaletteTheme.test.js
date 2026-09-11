import getJourneyPaletteTheme from '../utils/journeyPaletteTheme';

describe('Journey palette atmosphere', () => {
  test('derives a soft light atmosphere with dark readable foreground', () => {
    expect(getJourneyPaletteTheme(['#DCEEFF', '#E6B86A'])).toEqual({
      backgroundColor: '#EFF1EF',
      borderColor: '#F8E9D0',
      foregroundColor: '#000000',
      gradientColors: ['#F4F0E8', '#F2F0EA', '#F1E5CF', '#EDE7D9', '#E7EFF5'],
      primaryColor: '#DCEEFF',
      primaryForegroundColor: '#000000',
      secondaryColor: '#E6B86A',
      tertiaryColor: '#E6B86A',
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

  test('selects a distinct valid tertiary colour safely', () => {
    expect(getJourneyPaletteTheme(['#112233', '#112233', 'bad', '#AABBCC', '#DDEEFF']).tertiaryColor)
      .toBe('#DDEEFF');
  });

  test('returns deterministic foreground contrast', () => {
    const palette = ['#334455', '#AA7744'];
    expect(getJourneyPaletteTheme(palette).foregroundColor)
      .toBe(getJourneyPaletteTheme(palette).foregroundColor);
  });

  test('derives a deterministic light-to-deep watercolour gradient', () => {
    const palette = ['#101828', '#684C78'];
    const theme = getJourneyPaletteTheme(palette);

    expect(theme.gradientColors).toEqual(['#F4F0E8', '#E2DFD9', '#D8CFD2', '#B0ABAF', '#74777C']);
    expect(theme.gradientColors).toEqual(getJourneyPaletteTheme(palette).gradientColors);
  });
});
