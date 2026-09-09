import getHybridNavigationVisibility from '../utils/hybridNavigation.js';

describe('hybrid navigation visibility', () => {
  const measuredNav = {
    topNavigationBoundary: 126,
    topNavigationHeight: 50,
  };

  test('stays hidden while the measured top navigation is available', () => {
    expect(getHybridNavigationVisibility({
      ...measuredNav,
      isVisible: false,
      scrollY: 125,
    })).toBe(false);
  });

  test('becomes available only after the measured top navigation leaves', () => {
    expect(getHybridNavigationVisibility({
      ...measuredNav,
      isVisible: false,
      scrollY: 126,
    })).toBe(true);
  });

  test('uses measured nav height as deterministic hysteresis', () => {
    expect(getHybridNavigationVisibility({
      ...measuredNav,
      isVisible: true,
      scrollY: 120,
    })).toBe(true);
    expect(getHybridNavigationVisibility({
      ...measuredNav,
      isVisible: true,
      scrollY: 116,
    })).toBe(false);
  });

  test.each([
    ['missing boundary', null, 50],
    ['zero height', 126, 0],
    ['invalid height', 126, Number.NaN],
  ])('fails closed for %s', (_label, topNavigationBoundary, topNavigationHeight) => {
    expect(getHybridNavigationVisibility({
      isVisible: true,
      scrollY: 200,
      topNavigationBoundary,
      topNavigationHeight,
    })).toBe(false);
  });
});
