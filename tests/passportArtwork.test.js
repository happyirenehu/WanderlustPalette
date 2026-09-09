import colors from '../data/colors';
import getPassportArtworkPalette, {
  PASSPORT_ARTWORK_NEUTRALS,
  PASSPORT_ARTWORK_SHAPE_COUNT,
} from '../utils/passportArtwork';

const passportWith = ({ dream = '', memory = '', representativePalette = [] } = {}) => ({
  dream: { dominantColor: dream ? { id: dream } : null },
  memory: { dominantColor: memory ? { id: memory } : null },
  representativePalette,
});

describe('Colour Passport watercolour palette', () => {
  test('prioritizes the displayed Terracotta Dream and Forest Green Memory identities', () => {
    const passport = passportWith({
      dream: 'terracotta',
      memory: 'forest-green',
      representativePalette: ['#756A9C', '#245B78', '#B78100', '#8D4F5B', '#6FA7BF'],
    });

    expect(getPassportArtworkPalette(passport, colors)).toEqual([
      '#9D4428',
      '#244A3A',
      '#756A9C',
      '#245B78',
      '#B78100',
    ]);
  });

  test('changing Passport evidence changes the artwork palette', () => {
    const warm = getPassportArtworkPalette(passportWith({ dream: 'terracotta' }), colors);
    const cool = getPassportArtworkPalette(passportWith({ dream: 'ocean-blue' }), colors);

    expect(warm[0]).toBe('#9D4428');
    expect(cool[0]).toBe('#245B78');
    expect(cool).not.toEqual(warm);
  });

  test('identical evidence produces identical deterministic output', () => {
    const passport = passportWith({ dream: 'lavender', representativePalette: ['#A99BC6'] });

    expect(getPassportArtworkPalette(passport, colors)).toEqual(getPassportArtworkPalette(passport, colors));
  });

  test('partial evidence uses the existing neutral washes to fill the five shapes', () => {
    const result = getPassportArtworkPalette(passportWith({ memory: 'forest-green' }), colors);

    expect(result).toHaveLength(PASSPORT_ARTWORK_SHAPE_COUNT);
    expect(result[0]).toBe('#244A3A');
    PASSPORT_ARTWORK_NEUTRALS.forEach((hex) => expect(result).toContain(hex));
  });

  test('empty or invalid evidence preserves the neutral fallback', () => {
    expect(getPassportArtworkPalette()).toEqual(PASSPORT_ARTWORK_NEUTRALS);
    expect(getPassportArtworkPalette(passportWith({ dream: 'unknown', representativePalette: ['invalid'] }), colors)).toEqual(PASSPORT_ARTWORK_NEUTRALS);
  });

  test('does not mutate Passport, colour catalogue, or neutral fallback inputs', () => {
    const passport = passportWith({ dream: 'terracotta', representativePalette: ['#abcdef'] });
    const passportCopy = JSON.parse(JSON.stringify(passport));
    const colorsCopy = JSON.parse(JSON.stringify(colors));
    const neutralCopy = [...PASSPORT_ARTWORK_NEUTRALS];

    getPassportArtworkPalette(passport, colors);

    expect(passport).toEqual(passportCopy);
    expect(colors).toEqual(colorsCopy);
    expect(PASSPORT_ARTWORK_NEUTRALS).toEqual(neutralCopy);
  });
});
