const COUNTRY_API_ROOT = 'https://api.worldbank.org/v2/country';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeCountryResponse(value) {
  const record = Array.isArray(value) && Array.isArray(value[1]) ? value[1][0] : null;
  if (!record || typeof record !== 'object') return null;
  const countryCode = cleanText(record.iso2Code).toUpperCase();
  const countryName = cleanText(record.name);
  const capitalCity = cleanText(record.capitalCity);
  const region = cleanText(record.region?.value);
  const incomeLevel = cleanText(record.incomeLevel?.value);
  if (!countryCode || !countryName || (!capitalCity && !region && !incomeLevel)) return null;
  return { countryCode, countryName, capitalCity, region, incomeLevel };
}

export async function fetchCountryFacts(countryCode, options = {}) {
  const code = cleanText(countryCode).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const fetchImpl = options.fetchImpl || fetch;
  const controller = options.controller || new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${COUNTRY_API_ROOT}/${code}?format=json`, { signal: controller.signal });
    if (!response.ok) return null;
    const facts = normalizeCountryResponse(await response.json());
    return facts?.countryCode === code ? facts : null;
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
