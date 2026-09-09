jest.mock('../context/LanguageContext.js', () => ({
  useLanguage: () => ({ t: (key) => key }),
}));

import { getDestinationDetailHeroHeight } from '../components/DestinationImage';

describe('Destination Detail hero sizing', () => {
  test.each([667, 844, 1024, 1366])('uses 70%% of a %ipx viewport', (viewportHeight) => {
    expect(getDestinationDetailHeroHeight(viewportHeight)).toBe(Math.round(viewportHeight * 0.7));
  });

  test('safely rejects invalid viewport heights', () => {
    expect(getDestinationDetailHeroHeight(0)).toBe(0);
    expect(getDestinationDetailHeroHeight(-1)).toBe(0);
    expect(getDestinationDetailHeroHeight(null)).toBe(0);
  });
});
