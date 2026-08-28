import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_LOCALE,
  formatCapitalName,
  formatCountryName,
  formatDestinationName,
  formatExpenseCategory,
  formatIncomeLevel,
  formatTravelRegion,
  normalizeLocale,
  translate,
  translateKnownMessage,
} from '../utils/i18n';
import { loadLanguage, saveLanguage } from '../utils/languageStorage';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [languageError, setLanguageError] = useState('');

  useEffect(() => {
    let active = true;
    loadLanguage().then((result) => {
      if (active) setLocaleState(result.locale);
    });
    return () => { active = false; };
  }, []);

  const setLocale = useCallback(async (nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);
    setLanguageError('');
    const result = await saveLanguage(normalized);
    if (!result.ok) setLanguageError('language.saveError');
  }, []);

  const value = useMemo(() => ({
    locale,
    setLocale,
    languageError,
    clearLanguageError: () => setLanguageError(''),
    t: (key, params, fallback) => translate(locale, key, params, fallback),
    formatDestination: (id, englishName) => formatDestinationName(locale, id, englishName),
    formatCountry: (code, englishName) => formatCountryName(locale, code, englishName),
    formatCapital: (code, englishName) => formatCapitalName(locale, code, englishName),
    formatRegion: (region) => formatTravelRegion(locale, region),
    formatIncome: (income) => formatIncomeLevel(locale, income),
    formatExpenseCategory: (category) => formatExpenseCategory(locale, category),
    localizeMessage: (message) => translateKnownMessage(locale, message),
  }), [languageError, locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider');
  return value;
}

export default LanguageContext;
