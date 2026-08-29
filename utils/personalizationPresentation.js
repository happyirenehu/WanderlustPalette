const REASON_PRESENTATION = {
  recentVibe: { key: 'personalization.reasons.recentVibe', subject: 'vibe', idField: 'vibeId' },
  dreamVibe: { key: 'personalization.reasons.dreamVibe', subject: 'vibe', idField: 'vibeId' },
  journeyVibe: { key: 'personalization.reasons.journeyVibe', subject: 'vibe', idField: 'vibeId' },
  dreamColor: { key: 'personalization.reasons.dreamColor', subject: 'color', idField: 'colorId' },
  journeyColor: { key: 'personalization.reasons.journeyColor', subject: 'color', idField: 'colorId' },
  journeyPaletteColor: { key: 'personalization.reasons.journeyPaletteColor', subject: 'color', idField: 'colorId' },
};

export function getRecommendationReasonPresentation(reason) {
  const presentation = reason && REASON_PRESENTATION[reason.type];
  const subjectId = presentation && typeof reason[presentation.idField] === 'string'
    ? reason[presentation.idField].trim()
    : '';
  return presentation && subjectId
    ? { key: presentation.key, subject: presentation.subject, subjectId }
    : null;
}

export function getPassportNarrative(passport) {
  const dreamColorId = passport?.dream?.dominantColor?.id || '';
  const memoryColorId = passport?.memory?.dominantColor?.id || '';
  if (passport?.contrast?.dreamColorId && passport?.contrast?.memoryColorId) {
    return {
      key: 'passport.contrast',
      dreamColorId: passport.contrast.dreamColorId,
      memoryColorId: passport.contrast.memoryColorId,
    };
  }
  if (dreamColorId && memoryColorId && dreamColorId === memoryColorId) {
    return { key: 'passport.sharedColor', colorId: dreamColorId };
  }
  if (dreamColorId) return { key: 'passport.dreamOnly', colorId: dreamColorId };
  if (memoryColorId) return { key: 'passport.memoryOnly', colorId: memoryColorId };
  return null;
}
