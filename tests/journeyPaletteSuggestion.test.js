import { addJourney, updateJourney } from '../utils/journeys';
import {
  resolvePhotoPalette,
  validateJourneyPalette,
} from '../utils/journeyPaletteSuggestion';

const FORM = { destination: 'Taipei', country: 'Taiwan', date: '2026-08-29', notes: '' };
const PHOTO_COLORS = ['#112233', '#445566', '#778899'];

describe('Journey photo palette integration rules', () => {
  test('applies a successful extracted palette to a new Journey', () => {
    const resolved = resolvePhotoPalette({ currentPalette: [], suggestedPalette: PHOTO_COLORS, isEditing: false });
    const result = addJourney([], { ...FORM, palette: resolved.palette }, { id: 'taipei' });

    expect(resolved.applied).toBe(true);
    expect(result.journey.palette).toEqual(PHOTO_COLORS);
  });

  test('extraction failure does not block Journey save or invalidate a manual palette', () => {
    const resolved = resolvePhotoPalette({
      currentPalette: ['#ABCDEF'], suggestedPalette: [], isEditing: false, hasManualEdits: true,
    });
    const result = addJourney([], { ...FORM, palette: resolved.palette }, { id: 'taipei' });

    expect(resolved.applied).toBe(false);
    expect(result.journey).not.toBeNull();
    expect(result.journey.palette).toEqual(['#ABCDEF']);
    expect(validateJourneyPalette(result.journey.palette).valid).toBe(true);
  });

  test('Edit Journey never silently overwrites its existing palette', () => {
    const original = addJourney([], { ...FORM, palette: ['#ABCDEF'] }, { id: 'taipei' }).journeys;
    const resolved = resolvePhotoPalette({
      currentPalette: original[0].palette, suggestedPalette: PHOTO_COLORS, isEditing: true,
    });
    const result = updateJourney(original, 'taipei', { ...FORM, palette: resolved.palette });

    expect(resolved.applied).toBe(false);
    expect(result.journey.palette).toEqual(['#ABCDEF']);
  });

  test('an explicit Edit acceptance replaces the palette', () => {
    const resolved = resolvePhotoPalette({
      currentPalette: ['#ABCDEF'], suggestedPalette: PHOTO_COLORS, isEditing: true, acceptSuggestion: true,
    });

    expect(resolved.applied).toBe(true);
    expect(resolved.palette).toEqual(PHOTO_COLORS);
  });

  test('a replacement-photo suggestion preserves manually edited colors until accepted', () => {
    const resolved = resolvePhotoPalette({
      currentPalette: ['#123456'], suggestedPalette: PHOTO_COLORS, isEditing: false, hasManualEdits: true,
    });

    expect(resolved.applied).toBe(false);
    expect(resolved.palette).toEqual(['#123456']);
  });
});
