import { fetchCountryFacts, normalizeCountryResponse } from '../utils/countryApi';

const payload = [
  { page: 1 },
  [{ iso2Code: 'JP', name: 'Japan', capitalCity: 'Tokyo', region: { value: 'East Asia & Pacific' } }],
];

describe('World Bank country API', () => {
  test('normalizes a valid response and partial useful fields', () => {
    expect(normalizeCountryResponse(payload)).toEqual({ countryCode: 'JP', countryName: 'Japan', capitalCity: 'Tokyo', region: 'East Asia & Pacific' });
    expect(normalizeCountryResponse([{}, [{ iso2Code: 'JP', name: 'Japan', capitalCity: '', region: { value: 'Asia' } }]])).toMatchObject({ capitalCity: '', region: 'Asia' });
  });
  test('rejects malformed structures and missing useful fields', () => {
    expect(normalizeCountryResponse(null)).toBeNull();
    expect(normalizeCountryResponse([{}, []])).toBeNull();
    expect(normalizeCountryResponse([{}, [{ iso2Code: 'JP', name: 'Japan', region: {} }]])).toBeNull();
  });
  test('fetches and normalizes successful responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });
    await expect(fetchCountryFacts('jp', { fetchImpl })).resolves.toMatchObject({ countryCode: 'JP', capitalCity: 'Tokyo' });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/JP?format=json'), expect.objectContaining({ signal: expect.anything() }));
  });
  test('returns null for non-2xx, rejected, malformed JSON, mismatched country, and invalid code', async () => {
    await expect(fetchCountryFacts('JP', { fetchImpl: async () => ({ ok: false }) })).resolves.toBeNull();
    await expect(fetchCountryFacts('JP', { fetchImpl: async () => { throw new Error('offline'); } })).resolves.toBeNull();
    await expect(fetchCountryFacts('JP', { fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('bad json'); } }) })).resolves.toBeNull();
    await expect(fetchCountryFacts('JP', { fetchImpl: async () => ({ ok: true, json: async () => [null, [{ ...payload[1][0], iso2Code: 'NO' }]] }) })).resolves.toBeNull();
    await expect(fetchCountryFacts('bad')).resolves.toBeNull();
  });
  test('aborts timed-out requests and returns null', async () => {
    jest.useFakeTimers();
    const controller = { signal: {}, abort: jest.fn() };
    const pending = fetchCountryFacts('JP', { controller, timeoutMs: 20, fetchImpl: () => new Promise((resolve, reject) => { controller.abort.mockImplementation(() => reject(new Error('aborted'))); }) });
    jest.advanceTimersByTime(20);
    await expect(pending).resolves.toBeNull();
    expect(controller.abort).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
