import en from '../locales/en';
import zhHant from '../locales/zh-Hant';

export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'zh-Hant'];
export const TRANSLATIONS = { en, 'zh-Hant': zhHant };

const MESSAGE_KEYS = {
  'Destination is required.': 'validation.destinationRequired',
  'Country is required.': 'validation.countryRequired',
  'Date is required.': 'validation.dateRequired',
  'This journey is no longer available.': 'validation.unavailableJourney',
  'Expense category is required.': 'validation.expenseCategoryRequired',
  'Enter a valid non-negative amount with up to two decimal places.': 'validation.expenseAmountInvalid',
  'This expense is no longer available.': 'validation.unavailableExpense',
  'Journeys could not be loaded from this device.': 'errors.journeysLoad',
  'Journeys could not be saved on this device.': 'errors.journeysSave',
  'Dream Palette could not be loaded on this device.': 'errors.dreamLoad',
  'Dream Palette could not be saved on this device.': 'errors.dreamSave',
  'The theme changed for this session but could not be saved.': 'errors.themeSave',
  'This photo format could not be saved safely.': 'errors.unsafePhoto',
  'The photo could not be saved on this device.': 'errors.photoSave',
};

const EXPENSE_CATEGORY_KEYS = {
  Accommodation: 'accommodation',
  Transportation: 'transportation',
  Food: 'food',
  Activities: 'activities',
};

function getValue(dictionary, key) {
  if (!dictionary || typeof key !== 'string' || !key.trim()) return undefined;
  return key.split('.').reduce((value, part) => (
    value && typeof value === 'object' ? value[part] : undefined
  ), dictionary);
}

function interpolate(template, params) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ));
}

export function normalizeLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function translate(locale, key, params = {}, fallback = '') {
  const normalizedLocale = normalizeLocale(locale);
  const localized = getValue(TRANSLATIONS[normalizedLocale], key);
  const english = getValue(en, key);
  const template = typeof localized === 'string'
    ? localized
    : typeof english === 'string'
      ? english
      : typeof fallback === 'string' && fallback
        ? fallback
        : typeof key === 'string'
          ? key
          : '';
  return interpolate(template, params && typeof params === 'object' ? params : {});
}

export function formatDestinationName(locale, destinationId, englishName) {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === DEFAULT_LOCALE) return englishName;
  const localized = getValue(TRANSLATIONS[normalizedLocale], `destinations.${destinationId}.name`);
  return typeof localized === 'string' && localized && localized !== englishName
    ? `${englishName} / ${localized}`
    : englishName;
}

export function formatCountryName(locale, countryCode, englishName) {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === DEFAULT_LOCALE) return englishName;
  const localized = getValue(TRANSLATIONS[normalizedLocale], `countries.${countryCode}`);
  return typeof localized === 'string' && localized && localized !== englishName
    ? `${englishName} / ${localized}`
    : englishName;
}

export function formatCapitalName(locale, countryCode, englishName) {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === DEFAULT_LOCALE) return englishName;
  const localized = getValue(TRANSLATIONS[normalizedLocale], `capitals.${countryCode}`);
  return typeof localized === 'string' && localized && localized !== englishName
    ? `${englishName} / ${localized}`
    : englishName;
}

export function formatTravelRegion(locale, value) {
  return translate(locale, `travelRegions.${value}`, {}, value);
}

export function formatIncomeLevel(locale, value) {
  return translate(locale, `incomeLevels.${value}`, {}, value);
}

export function formatExpenseCategory(locale, value) {
  const category = typeof value === 'string' ? value.trim() : '';
  const key = EXPENSE_CATEGORY_KEYS[category];
  return key ? translate(locale, `expenseCategories.${key}`, {}, category) : category;
}

export function translateKnownMessage(locale, message) {
  if (typeof message !== 'string' || !message) return '';
  const key = MESSAGE_KEYS[message];
  return key ? translate(locale, key, {}, message) : message;
}

export function getTranslationLeafKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [path] : getTranslationLeafKeys(child, path);
  });
}
