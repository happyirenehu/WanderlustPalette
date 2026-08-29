import colors from '../data/colors';
import destinations from '../data/destinations';
import vibes from '../data/vibes';
import en from '../locales/en';
import zhHant from '../locales/zh-Hant';
import {
  formatCapitalName,
  formatCountryName,
  formatDestinationName,
  formatExpenseCategory,
  formatIncomeLevel,
  formatTravelRegion,
  getTranslationLeafKeys,
  normalizeLocale,
  translate,
  translateKnownMessage,
} from '../utils/i18n';

describe('localization lookup and fallback', () => {
  test('uses English by default and Traditional Chinese when selected', () => {
    expect(translate('en', 'dream.title')).toBe('Dream Palette');
    expect(translate('zh-Hant', 'dream.title')).toBe('夢想色盤');
    expect(translate(undefined, 'dream.title')).toBe('Dream Palette');
  });

  test('normalizes unsupported locale values safely', () => {
    expect(normalizeLocale('zh-Hant')).toBe('zh-Hant');
    expect(normalizeLocale('fr')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });

  test('falls back to English, an explicit value, or the key without crashing', () => {
    const original = zhHant.dream.title;
    delete zhHant.dream.title;
    expect(translate('zh-Hant', 'dream.title')).toBe('Dream Palette');
    zhHant.dream.title = original;
    expect(translate('zh-Hant', 'missing.editorial', {}, 'Fallback copy')).toBe('Fallback copy');
    expect(translate('zh-Hant', 'missing.key')).toBe('missing.key');
    expect(translate('zh-Hant', null)).toBe('');
  });

  test('interpolates current simple parameters deterministically', () => {
    expect(translate('en', 'dream.savedPlaceOther', { count: 3 })).toBe('3 saved places');
    expect(translate('zh-Hant', 'dream.savedPlaceOther', { count: 3 })).toBe('已收藏 3 個地方');
    expect(translate('en', 'dream.becameMemory')).toBe('A dream became a memory');
    expect(translate('zh-Hant', 'dream.becameMemory')).toBe('夢想成為了回憶');
    expect(translate('en', 'personalization.title')).toBe('Inspired by You');
    expect(translate('zh-Hant', 'passport.title')).toBe('我的色彩護照');
  });

  test('has complete Traditional Chinese coverage for the supported English surface', () => {
    expect(getTranslationLeafKeys(zhHant).sort()).toEqual(getTranslationLeafKeys(en).sort());
  });
});

describe('localized catalogue presentation', () => {
  test('formats destination and country proper nouns by locale', () => {
    expect(formatDestinationName('en', 'tuscany-italy', 'Tuscany')).toBe('Tuscany');
    expect(formatDestinationName('zh-Hant', 'tuscany-italy', 'Tuscany')).toBe('Tuscany / 托斯卡尼');
    expect(formatCountryName('en', 'IT', 'Italy')).toBe('Italy');
    expect(formatCountryName('zh-Hant', 'IT', 'Italy')).toBe('Italy / 義大利');
  });

  test('falls back to the English proper noun when no curated mapping exists', () => {
    expect(formatDestinationName('zh-Hant', 'unknown', 'Reykjavík')).toBe('Reykjavík');
    expect(formatCountryName('zh-Hant', 'IS', 'Iceland')).toBe('Iceland');
    expect(formatCapitalName('zh-Hant', 'IS', 'Reykjavík')).toBe('Reykjavík');
  });

  test('localizes required vibes, colours, budgets, snapshot, regions, and income levels', () => {
    expect(translate('zh-Hant', 'vibes.calm.name')).toBe('寧靜');
    expect(translate('zh-Hant', 'colors.ocean-blue.name')).toBe('海洋藍');
    expect(translate('zh-Hant', 'colors.citrus.name')).toBe('金色暖陽');
    expect(translate('zh-Hant', 'budget.moderate')).toBe('中等');
    expect(translate('zh-Hant', 'snapshot.title')).toBe('旅行快照');
    expect(formatTravelRegion('zh-Hant', 'Southern Europe')).toBe('南歐');
    expect(formatIncomeLevel('zh-Hant', 'High income')).toBe('高收入經濟體');
  });

  test('keeps stable catalogue IDs unchanged, including Golden using citrus', () => {
    expect(vibes.map((item) => item.id)).toEqual(['calm', 'dreamy', 'warm', 'wild', 'romantic', 'energetic']);
    expect(colors.find((item) => item.name === 'Golden').id).toBe('citrus');
    expect(destinations.map((item) => item.id)).toContain('queenstown-new-zealand');
  });

  test('localizes only known canonical expense categories and known UI errors', () => {
    expect(formatExpenseCategory('zh-Hant', 'Food')).toBe('餐飲');
    expect(formatExpenseCategory('zh-Hant', 'Museum tickets')).toBe('Museum tickets');
    expect(translateKnownMessage('zh-Hant', 'Destination is required.')).toBe('請填寫目的地。');
    expect(translateKnownMessage('zh-Hant', 'Unrecognized message')).toBe('Unrecognized message');
  });
});
