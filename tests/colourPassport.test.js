import { buildColourPassport } from '../utils/colourPassport';

describe('My Colour Passport derivation', () => {
  test('returns an empty state without unsupported editorial facts', () => {
    expect(buildColourPassport()).toEqual({ isEmpty: true, dream: { dominantColor: null, evidenceCount: 0 }, memory: { dominantColor: null, evidenceCount: 0 }, dominantVibe: null, representativePalette: [], contrast: null });
  });

  test('derives supported Dream and memory contrast plus deterministic palette', () => {
    const journeys = [{ destinationId: 'kyoto-japan', palette: ['#244A3A', '#244A3A', '#BAD'] }];
    const passport = buildColourPassport({ dreamDestinationIds: ['santorini-greece'], journeys });
    expect(passport.dream.dominantColor).toMatchObject({ id: 'ocean-blue' });
    expect(passport.memory.dominantColor).toMatchObject({ id: 'forest-green' });
    expect(passport.contrast).toEqual({ dreamColorId: 'ocean-blue', memoryColorId: 'forest-green' });
    expect(passport.representativePalette).toEqual(['#244A3A']);
  });

  test('does not invent contrast from invalid palettes and preserves source inputs', () => {
    const input = { dreamDestinationIds: ['santorini-greece'], journeys: [{ palette: ['not-hex'] }] };
    const copy = JSON.parse(JSON.stringify(input));
    const passport = buildColourPassport(input);
    expect(passport.contrast).toBeNull();
    expect(passport.dominantVibe).toMatchObject({ id: 'calm' });
    expect(input).toEqual(copy);
  });
});
