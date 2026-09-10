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
    expect(translate('en', 'passport.subtitle')).toBe('Your colours. Your story.');
    expect(translate('zh-Hant', 'passport.subtitle')).toBe('你的色彩，你的故事。');
    expect(translate('en', 'nav.dreams')).toBe('Dreams');
    expect(translate('zh-Hant', 'nav.dreams')).toBe('夢想');
    expect(translate('en', 'passport.explanation')).toBe('A living colour portrait shaped by your travel dreams and journey memories.');
    expect(translate('zh-Hant', 'passport.explanation')).toBe('由你的旅行夢想與旅程回憶，逐漸形成的個人旅行色彩輪廓。');
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
    expect(formatCountryName('zh-Hant', 'PH', 'Philippines')).toBe('Philippines');
    expect(formatCapitalName('zh-Hant', 'PH', 'Manila')).toBe('Manila');
  });

  test('localizes required vibes, colours, budgets, snapshot, regions, and income levels', () => {
    expect(translate('zh-Hant', 'vibes.calm.name')).toBe('寧靜');
    expect(translate('zh-Hant', 'colors.ocean-blue.name')).toBe('海洋藍');
    expect(translate('zh-Hant', 'colors.citrus.name')).toBe('金色暖陽');
    expect(translate('zh-Hant', 'budget.moderate')).toBe('中等');
    expect(translate('zh-Hant', 'snapshot.title')).toBe('旅行快照');
    expect(translate('en', 'snapshot.budgetGuidance')).toContain('Editorial guidance');
    expect(translate('zh-Hant', 'snapshot.budgetGuidance')).toContain('編輯建議');
    expect(formatTravelRegion('zh-Hant', 'Southern Europe')).toBe('南歐');
    expect(formatIncomeLevel('zh-Hant', 'High income')).toBe('高收入經濟體');
  });

  test('keeps stable catalogue IDs unchanged, including Golden using citrus', () => {
    expect(vibes.map((item) => item.id)).toEqual(['calm', 'dreamy', 'warm', 'wild', 'romantic', 'energetic']);
    expect(colors.find((item) => item.name === 'Golden').id).toBe('citrus');
    expect(destinations.map((item) => item.id)).toContain('queenstown-new-zealand');
  });

  test('localizes every expanded destination, country, and curated travel region', () => {
    expect(formatDestinationName('zh-Hant', 'oaxaca-mexico', 'Oaxaca')).toBe('Oaxaca / 瓦哈卡');
    expect(formatDestinationName('zh-Hant', 'hoi-an-vietnam', 'Hoi An')).toBe('Hoi An / 會安');
    expect(formatDestinationName('zh-Hant', 'cape-town-south-africa', 'Cape Town')).toBe('Cape Town / 開普敦');
    expect(formatDestinationName('zh-Hant', 'luang-prabang-laos', 'Luang Prabang')).toBe('Luang Prabang / 琅勃拉邦');
    expect(formatCountryName('zh-Hant', 'MX', 'Mexico')).toBe('Mexico / 墨西哥');
    expect(formatCountryName('zh-Hant', 'VN', 'Vietnam')).toBe('Vietnam / 越南');
    expect(formatCountryName('zh-Hant', 'ZA', 'South Africa')).toBe('South Africa / 南非');
    expect(formatCountryName('zh-Hant', 'LA', 'Laos')).toBe('Laos / 寮國');
    expect(formatTravelRegion('zh-Hant', 'North America')).toBe('北美洲');
    expect(formatTravelRegion('zh-Hant', 'Southeast Asia')).toBe('東南亞');
    expect(formatTravelRegion('zh-Hant', 'Southern Africa')).toBe('南部非洲');
  });

  test('localizes only known canonical expense categories and known UI errors', () => {
    expect(formatExpenseCategory('zh-Hant', 'Food')).toBe('餐飲');
    expect(formatExpenseCategory('zh-Hant', 'Museum tickets')).toBe('Museum tickets');
    expect(translateKnownMessage('zh-Hant', 'Destination is required.')).toBe('請填寫目的地。');
    expect(translateKnownMessage('zh-Hant', 'Unrecognized message')).toBe('Unrecognized message');
  });
});
