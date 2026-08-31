import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DestinationImage from '../components/DestinationImage.js';
import VibeCard from '../components/VibeCard.js';
import { useLanguage } from '../context/LanguageContext.js';
import colorsData from '../data/colors.js';
import destinationsData from '../data/destinations.js';
import vibesData from '../data/vibes.js';
import { fetchCountryFacts } from '../utils/countryApi.js';
import { loadCountryFacts, saveCountryFacts } from '../utils/countryInfoStorage.js';
import { applyBudgetPreference, BUDGET_LEVELS } from '../utils/budget.js';
import { getRelatedDestinations, getVibeById, normalizeDestinations, normalizeVibes, recommendDestinations, recommendDestinationsByColor, resolveDestinationIds } from '../utils/discovery.js';
import getDreamPaletteInsights from '../utils/destinationInsights.js';
import { isFavouriteId } from '../utils/dreamPalette.js';
import { isDreamMemoryDestination } from '../utils/journeyDestination.js';
import { getAdaptiveRecommendations } from '../utils/adaptiveRecommendations.js';
import {
  getPassportNarrative,
  getRecommendationReasonPresentation,
} from '../utils/personalizationPresentation.js';

const FALLBACK_COLOR = '#E8EEF2';
const EDITORIAL_SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const WATERCOLOUR_SHAPES = [
  { height: 152, left: -22, top: 30, transform: [{ rotate: '-8deg' }], width: 198 },
  { height: 176, right: -18, top: 4, transform: [{ rotate: '11deg' }], width: 178 },
  { bottom: -34, height: 134, left: 68, transform: [{ rotate: '4deg' }], width: 206 },
  { bottom: 16, height: 92, left: 10, transform: [{ rotate: '-14deg' }], width: 128 },
  { height: 104, right: 26, top: 72, transform: [{ rotate: '16deg' }], width: 136 },
];
const EARLY_PASSPORT_WASHES = ['#B8AAA1', '#C8BDB0', '#A7B4B0'];

export default function SignatureScreen({
  colourPassport,
  mode,
  favouriteIds,
  memoryDestinationIds,
  onAddJourney,
  onDestinationStateChange,
  onRecommendationReady,
  onToggleFavourite,
  onVibeSelect,
  preferenceProfile,
}) {
  const insets = useSafeAreaInsets();
  const { formatCapital, formatCountry, formatDestination, formatIncome, formatRegion, locale, t } = useLanguage();
  const vibes = useMemo(() => normalizeVibes(vibesData).map((vibe) => ({
    ...vibe,
    colorFamily: t(`vibes.${vibe.id}.colorFamily`, {}, vibe.colorFamily),
    description: t(`vibes.${vibe.id}.description`, {}, vibe.description),
    imageAlt: t(`vibes.${vibe.id}.imageAlt`, {}, vibe.imageAlt),
    name: t(`vibes.${vibe.id}.name`, {}, vibe.name),
  })), [locale]);
  const colors = useMemo(() => colorsData.map((color) => ({
    ...color,
    description: t(`colors.${color.id}.description`, {}, color.description),
    name: t(`colors.${color.id}.name`, {}, color.name),
  })), [locale]);
  const destinations = useMemo(() => normalizeDestinations(destinationsData).map((destination) => ({
    ...destination,
    colorFamily: t(`destinations.${destination.id}.colorFamily`, {}, destination.colorFamily),
    country: formatCountry(destination.countryCode, destination.country),
    description: t(`destinations.${destination.id}.description`, {}, destination.description),
    imageAlt: t(`destinations.${destination.id}.imageAlt`, {}, destination.imageAlt),
    imageCredit: destination.imageCredit ? t('images.credit') : '',
    name: formatDestination(destination.id, destination.name),
    travelRegion: formatRegion(destination.travelRegion),
    whyItMatches: t(`destinations.${destination.id}.whyItMatches`, {}, destination.whyItMatches),
  })), [locale]);
  const [discoveryMode, setDiscoveryMode] = useState('vibe');
  const [selectedVibeId, setSelectedVibeId] = useState(null);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [budgetPreference, setBudgetPreference] = useState('any');
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [countryFacts, setCountryFacts] = useState(null);
  const resultsY = useRef(null);
  const inspiredY = useRef(null);
  const pendingResultsScroll = useRef(false);
  const previousDestinationId = useRef(null);
  const selectedVibe = getVibeById(selectedVibeId, vibes);
  const selectedColor = colors.find((item) => item.id === selectedColorId) || null;
  const selectedExplorationId = discoveryMode === 'color' ? selectedColorId : selectedVibeId;
  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) || null;
  const dreamDestinations = resolveDestinationIds(favouriteIds, destinations);
  const insights = getDreamPaletteInsights(favouriteIds, destinations, vibes, colors);
  const baseRecommendations = discoveryMode === 'color'
    ? recommendDestinationsByColor(selectedColorId, destinations, colors)
    : recommendDestinations(selectedVibeId, destinations, vibes);
  const recommendations = applyBudgetPreference(baseRecommendations, budgetPreference);
  const personalizedResult = useMemo(
    () => getAdaptiveRecommendations(destinationsData, preferenceProfile, { limit: 3 }),
    [preferenceProfile],
  );
  const localizedDestinationsById = new Map(destinations.map((destination) => [destination.id, destination]));
  const inspiredRecommendations = personalizedResult.recommendations
    .map((recommendation) => ({
      ...recommendation,
      destination: localizedDestinationsById.get(recommendation.destination.id),
    }))
    .filter((recommendation) => recommendation.destination);
  const budgetLabel = (id) => t(`budget.${id}`, {}, id);
  const budgetDisplay = (id) => {
    const level = BUDGET_LEVELS.find((item) => item.id === id);
    return level ? `${level.symbol} · ${budgetLabel(id)}` : '';
  };
  const vibeName = (id) => vibes.find((vibe) => vibe.id === id)?.name || id;
  const colorName = (id) => colors.find((color) => color.id === id)?.name || id;
  const colorHex = (id) => colors.find((color) => color.id === id)?.palette?.[0] || FALLBACK_COLOR;
  const reasonText = (reason) => {
    const presentation = getRecommendationReasonPresentation(reason);
    if (!presentation) return '';
    const name = presentation.subject === 'vibe'
      ? vibeName(presentation.subjectId)
      : colorName(presentation.subjectId);
    return t(presentation.key, { name });
  };
  const passportComposition = (() => {
    const representative = Array.isArray(colourPassport?.representativePalette)
      ? colourPassport.representativePalette
      : [];
    const supported = [
      colourPassport?.dream?.dominantColor?.id,
      colourPassport?.memory?.dominantColor?.id,
    ].filter(Boolean).map(colorHex);
    return [...new Set([...representative, ...supported])].slice(0, 5);
  })();
  const renderWatercolourArtwork = (palette) => (
    <View accessibilityLabel={t('passport.paletteA11y')} style={styles.watercolourArtwork}>
      {palette.map((hex, index) => (
        <View
          accessibilityLabel={t('passport.swatchA11y', { color: hex })}
          key={`${hex}-${index}`}
          style={[
            styles.watercolourWash,
            WATERCOLOUR_SHAPES[index % WATERCOLOUR_SHAPES.length],
            { backgroundColor: hex },
          ]}
        >
          <View style={[styles.watercolourBloom, { backgroundColor: hex }]} />
        </View>
      ))}
    </View>
  );

  useEffect(() => {
    pendingResultsScroll.current = false;
    resultsY.current = null;
    inspiredY.current = null;
    setSelectedDestinationId(null);
  }, [mode]);

  useLayoutEffect(() => {
    const wasOpen = Boolean(previousDestinationId.current);
    const isOpen = Boolean(selectedDestinationId);
    if (isOpen || wasOpen !== isOpen) onDestinationStateChange?.(isOpen);
    previousDestinationId.current = selectedDestinationId;
  }, [onDestinationStateChange, selectedDestinationId]);

  useEffect(() => {
    if (selectedDestinationId || !selectedExplorationId || !pendingResultsScroll.current || !Number.isFinite(resultsY.current)) return undefined;
    const frame = requestAnimationFrame(() => {
      if (!pendingResultsScroll.current) return;
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [onRecommendationReady, selectedDestinationId, selectedExplorationId]);

  useEffect(() => {
    const code = selectedDestination?.countryCode;
    if (!code) { setCountryFacts(null); return undefined; }
    let active = true;
    const controller = new AbortController();
    setCountryFacts(null);
    (async () => {
      const cached = await loadCountryFacts(code);
      if (!active) return;
      if (cached.record) setCountryFacts(cached.record.facts);
      if (cached.fresh && cached.record?.facts?.incomeLevel) return;
      const fetched = await fetchCountryFacts(code, { controller });
      if (!active) return;
      if (fetched) { setCountryFacts(fetched); saveCountryFacts(fetched); }
    })();
    return () => { active = false; controller.abort(); };
  }, [selectedDestination?.countryCode]);

  const renderPalette = (palette, label, signature = false) => (
    <View accessibilityLabel={t('discovery.paletteLabel', { name: label })} style={[styles.paletteRow, signature && styles.signaturePaletteRow]}>
      {(palette.length ? palette : [FALLBACK_COLOR]).map((color) => (
        <View accessibilityLabel={t('discovery.colorLabel', { name: color })} key={color} style={[styles.swatch, signature && styles.signatureSwatch, { backgroundColor: color }]} />
      ))}
    </View>
  );

  const selectVibe = (vibeId) => {
    pendingResultsScroll.current = true;
    if (vibeId === selectedVibeId && Number.isFinite(resultsY.current)) {
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    }
    setSelectedVibeId(vibeId);
    onVibeSelect?.(vibeId);
  };

  const selectColor = (colorId) => {
    pendingResultsScroll.current = true;
    if (colorId === selectedColorId && Number.isFinite(resultsY.current)) {
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    }
    setSelectedColorId(colorId);
  };

  const selectDiscoveryMode = (nextMode) => {
    pendingResultsScroll.current = false;
    resultsY.current = null;
    setDiscoveryMode(nextMode);
  };

  const handleResultsLayout = (event) => {
    const measuredY = event.nativeEvent.layout.y;
    if (!Number.isFinite(measuredY) || measuredY < 0) {
      resultsY.current = null;
      pendingResultsScroll.current = false;
      return;
    }
    resultsY.current = measuredY;
    if (!selectedDestinationId && pendingResultsScroll.current) {
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    }
  };

  const handleInspiredLayout = (event) => {
    inspiredY.current = event.nativeEvent.layout.y;
  };

  const scrollToInspired = () => {
    if (inspiredY.current !== null) onRecommendationReady?.(inspiredY.current);
  };

  const openDestination = (destinationId) => {
    pendingResultsScroll.current = false;
    resultsY.current = null;
    inspiredY.current = null;
    setSelectedDestinationId(destinationId);
  };

  const closeDestination = () => {
    pendingResultsScroll.current = false;
    resultsY.current = null;
    inspiredY.current = null;
    setSelectedDestinationId(null);
  };

  const renderDestinationCard = (destination, compact = false, personalizationReasons = []) => {
    const saved = isFavouriteId(favouriteIds, destination.id);
    const becameMemory = mode === 'dream' && isDreamMemoryDestination(memoryDestinationIds, destination.id);
    return (
      <Pressable accessibilityHint={t('discovery.destinationHint')} accessibilityLabel={`${destination.name}, ${destination.country}${saved ? `, ${t('discovery.savedToDream')}` : ''}${becameMemory ? `, ${t('dream.becameMemory')}` : ''}`} accessibilityRole="button" key={destination.id} onPress={() => openDestination(destination.id)} style={({ pressed }) => [styles.destinationCard, compact && styles.compactCard, pressed && styles.pressedCard]}>
        <DestinationImage destination={destination} />
        <View style={styles.destinationBody}>
          <View style={styles.destinationHeading}>
            <View style={styles.destinationCopy}><Text style={styles.eyebrow}>{destination.colorFamily || t('discovery.curatedColorStory')}</Text><Text style={[styles.destinationName, compact && styles.compactName]}>{destination.name}</Text><Text style={styles.destinationCountry}>{destination.country}</Text></View>
            <View style={styles.badgeColumn}>
              {saved ? <Text style={styles.savedBadge}>{t('common.saved')}</Text> : null}
              {becameMemory ? <Text style={styles.memoryBadge}>{t('dream.memory')}</Text> : null}
            </View>
          </View>
          {becameMemory ? <Text style={styles.memoryMessage}>{t('dream.becameMemory')}</Text> : null}
          {personalizationReasons.length ? (
            <View accessibilityLabel={t('personalization.whyTitle')} style={styles.reasonList}>
              <Text style={styles.reasonTitle}>{t('personalization.whyTitle')}</Text>
              {personalizationReasons.map((reason, index) => {
                const text = reasonText(reason);
                return text ? <Text key={`${reason.type}-${index}`} style={styles.reasonText}>{text}</Text> : null;
              })}
            </View>
          ) : null}
          {!compact ? <><Text style={styles.destinationDescription}>{destination.description}</Text>{renderPalette(destination.palette, destination.name)}</> : null}
        </View>
      </Pressable>
    );
  };

  if (selectedDestinationId) {
    if (!selectedDestination) return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('discovery.destinationUnavailable')}</Text><Pressable onPress={closeDestination} style={styles.darkButton}><Text style={styles.darkButtonText}>{t('common.back')}</Text></Pressable></View>;
    const destinationVibes = selectedDestination.vibeIds.map((id) => getVibeById(id, vibes)).filter(Boolean);
    const destinationColors = colors.filter((color) => selectedDestination.colorIds.includes(color.id));
    const related = getRelatedDestinations(selectedDestination.id, destinations);
    const saved = isFavouriteId(favouriteIds, selectedDestination.id);
    const becameMemory = mode === 'dream' && isDreamMemoryDestination(memoryDestinationIds, selectedDestination.id);
    const capitalDisplay = countryFacts?.capitalCity
      ? formatCapital(selectedDestination.countryCode, countryFacts.capitalCity)
      : '';
    const incomeDisplay = countryFacts?.incomeLevel ? formatIncome(countryFacts.incomeLevel) : '';
    return (
      <>
        <View style={styles.detailCard}>
          <DestinationImage destination={selectedDestination} detail />
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={closeDestination}
            style={[styles.heroBackButton, { top: insets.top + 10 }]}
          >
            <Text style={styles.heroBackButtonText}>← {mode === 'dream' ? t('nav.passport') : t('nav.discover')}</Text>
          </Pressable>
          <View style={styles.detailBody}>
            <Text style={styles.detailKicker}>{t('discovery.curatedDestination')}</Text><Text style={styles.detailTitle}>{selectedDestination.name}</Text><Text style={styles.detailCountry}>{selectedDestination.country}</Text>
            {becameMemory ? <Text style={styles.detailMemoryMessage}>{t('dream.becameMemory')}</Text> : null}
            <Text style={styles.vibeLine}>{destinationVibes.map((vibe) => vibe.name).join(' · ')}</Text><Text style={styles.detailDescription}>{selectedDestination.description}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.colorStoryTitle')}</Text><Text style={styles.detailDescription}>{destinationColors.map((color) => color.name).join(' · ') || selectedDestination.colorFamily}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.whyItMatches')}</Text><Text style={styles.detailDescription}>{selectedDestination.whyItMatches}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.destinationPalette')}</Text>{renderPalette(selectedDestination.palette, selectedDestination.name, true)}
            <View accessibilityLabel={t('snapshot.accessibility', {
              budget: budgetDisplay(selectedDestination.budget),
              capital: capitalDisplay ? t('snapshot.capitalA11y', { capital: capitalDisplay }) : '',
              income: incomeDisplay ? t('snapshot.incomeA11y', { income: incomeDisplay }) : '',
              region: selectedDestination.travelRegion,
            })} style={styles.snapshot}>
              <Text style={styles.eyebrow}>{t('snapshot.title')}</Text>
              <Text style={styles.factLabel}>{t('snapshot.region')}</Text>
              <Text style={styles.snapshotRegion}>{selectedDestination.travelRegion}</Text>
              <Text style={styles.factLabel}>{t('snapshot.budget')}</Text><Text style={styles.factValue}>{budgetDisplay(selectedDestination.budget)}</Text><Text style={styles.guidanceNote}>{t('snapshot.budgetGuidance')}</Text>
              {capitalDisplay ? <><Text style={styles.factLabel}>{t('snapshot.capital')}</Text><Text style={styles.factValue}>{capitalDisplay}</Text></> : null}
              {incomeDisplay ? <><Text style={styles.factLabel}>{t('snapshot.incomeLevel')}</Text><Text style={styles.factValue}>{incomeDisplay}</Text><Text style={styles.sourceNote}>{t('snapshot.source')}</Text></> : null}
            </View>
            <View style={styles.destinationActions}>
              <Pressable accessibilityLabel={t('discovery.saveDreamA11y', { action: saved ? t('common.remove') : t('common.save'), direction: saved ? t('discovery.removeDirection') : t('discovery.addDirection'), name: selectedDestination.name })} accessibilityRole="button" onPress={() => onToggleFavourite(selectedDestination.id)} style={[styles.saveButton, saved && styles.removeButton]}><Text style={[styles.saveButtonText, saved && styles.removeButtonText]}>{saved ? t('discovery.removeFromDream') : t('discovery.saveToDream')}</Text></Pressable>
              <Pressable accessibilityLabel={t('discovery.addJourneyA11y', { name: selectedDestination.name })} accessibilityRole="button" onPress={() => onAddJourney?.(selectedDestination.id)} style={styles.addJourneyButton}><Text style={styles.addJourneyButtonText}>{t('discovery.addToJourney')}</Text></Pressable>
            </View>
            {selectedDestination.imageCredit ? <Pressable accessibilityRole="link" onPress={() => selectedDestination.imageAttributionUrl && Linking.openURL(selectedDestination.imageAttributionUrl)}><Text style={styles.credit}>{selectedDestination.imageCredit}</Text></Pressable> : null}
          </View>
        </View>
        {related.length ? <View style={styles.relatedSection}><Text style={styles.resultsTitle}>{t('discovery.keepExploring')}</Text>{related.map((item) => renderDestinationCard(item, true))}</View> : null}
      </>
    );
  }

  if (mode === 'dream') return (
    <>
      <View accessibilityLabel={t('passport.title')} style={styles.passportCard}>
        <View style={styles.passportHeading}>
          <Text style={styles.passportEyebrow}>{t('passport.kicker')}</Text>
          <Text style={styles.passportTitle}>{t('passport.title')}</Text>
          <Text style={styles.passportSubtitle}>{t('passport.subtitle')}</Text>
        </View>
        {colourPassport?.isEmpty ? (
          <View style={styles.passportEarlyState}>
            {renderWatercolourArtwork(EARLY_PASSPORT_WASHES)}
            <Text style={styles.passportEmpty}>{t('passport.empty')}</Text>
          </View>
        ) : (
          <>
            {passportComposition.length ? renderWatercolourArtwork(passportComposition) : null}
            {(() => {
              const narrative = getPassportNarrative(colourPassport);
              if (!narrative) return null;
              const params = narrative.key === 'passport.contrast'
                ? { dream: colorName(narrative.dreamColorId), memory: colorName(narrative.memoryColorId) }
                : { color: colorName(narrative.colorId) };
              return <Text style={styles.passportNarrative}>{t(narrative.key, params)}</Text>;
            })()}
            <View style={styles.passportFacts}>
              {colourPassport?.dream?.dominantColor ? <View style={styles.passportFact}><View style={[styles.passportFactSwatch, { backgroundColor: colorHex(colourPassport.dream.dominantColor.id) }]} /><View style={styles.passportFactCopy}><Text style={styles.passportFactLabel}>{t('passport.dreamColor')}</Text><Text style={styles.passportFactValue}>{colorName(colourPassport.dream.dominantColor.id)}</Text></View></View> : null}
              {colourPassport?.memory?.dominantColor ? <View style={styles.passportFact}><View style={[styles.passportFactSwatch, { backgroundColor: colorHex(colourPassport.memory.dominantColor.id) }]} /><View style={styles.passportFactCopy}><Text style={styles.passportFactLabel}>{t('passport.memoryColor')}</Text><Text style={styles.passportFactValue}>{colorName(colourPassport.memory.dominantColor.id)}</Text></View></View> : null}
              {colourPassport?.dominantVibe ? <View style={styles.passportMood}><Text style={styles.passportFactLabel}>{t('passport.dominantVibe')}</Text><Text style={styles.passportMoodValue}>{vibeName(colourPassport.dominantVibe.id)}</Text></View> : null}
            </View>
          </>
        )}
      </View>
      <View style={styles.savedDreamsHeader}><Text style={styles.eyebrow}>{t('dream.kicker')}</Text><Text style={styles.savedDreamsTitle}>{t('dream.savedDreamsTitle')}</Text><Text style={styles.pageSubtitle}>{t('dream.subtitle')}</Text></View>
      {dreamDestinations.length ? dreamDestinations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('dream.emptyTitle')}</Text><Text style={styles.emptyCopy}>{t('dream.emptyCopy')}</Text></View>}
      {insights.total ? <View accessibilityLabel={t('dream.insightsA11y')} style={styles.insightsCard}><Text style={styles.eyebrow}>{t('dream.styleKicker')}</Text><Text style={styles.insightCount}>{t(insights.total === 1 ? 'dream.savedPlaceOne' : 'dream.savedPlaceOther', { count: insights.total })}</Text><Text style={styles.insightLabel}>{t('dream.strongestVibe')}</Text><Text style={styles.insightValue}>{insights.dominantVibe?.name}</Text><Text style={styles.insightLabel}>{t('dream.colorStory')}</Text><Text style={styles.insightValue}>{insights.dominantColor?.name}</Text><Text style={styles.insightLabel}>{t('dream.typicalBudget')}</Text><Text style={styles.insightValue}>{insights.dominantBudget ? `${insights.dominantBudget.symbol} · ${budgetLabel(insights.dominantBudget.id)}` : t('dream.stillUnfolding')}</Text><Text style={styles.insightLabel}>{t('dream.budgetMix')}</Text>{insights.budgetDistribution.filter((item) => item.count > 0).map((item) => <View key={item.id} style={styles.budgetMixRow}><Text style={styles.budgetMixLabel}>{item.symbol} {budgetLabel(item.id)}</Text><Text style={styles.budgetMixCount}>{item.count}</Text></View>)}<Text style={styles.insightNote}>{t('dream.insightNote')}</Text></View> : null}
    </>
  );

  const selectedIdentity = discoveryMode === 'color' ? selectedColor : selectedVibe;
  return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>{t('discovery.flow')}</Text><Text style={styles.pageTitle}>{discoveryMode === 'vibe' ? t('discovery.vibeTitle') : t('discovery.colorTitle')}</Text><Text style={styles.pageSubtitle}>{t('discovery.subtitle')}</Text><Pressable accessibilityRole="button" onPress={scrollToInspired} style={styles.inspiredJump}><Text style={styles.inspiredJumpText}>{t('personalization.jump')} ↓</Text></Pressable></View>
      <View accessibilityLabel={t('discovery.methodLabel')} accessibilityRole="tablist" style={styles.modeSwitch}>{[['vibe', t('discovery.byVibe')], ['color', t('discovery.byColor')]].map(([id, label]) => { const selected = discoveryMode === id; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={id} onPress={() => selectDiscoveryMode(id)} style={[styles.modeButton, selected && styles.modeButtonSelected]}><Text style={[styles.modeText, selected && styles.modeTextSelected]}>{label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      {discoveryMode === 'vibe' ? (
        <View accessibilityLabel={t('discovery.vibeChoices')} style={styles.vibeCardGrid}>
          {vibes.map((vibe) => <VibeCard key={vibe.id} onPress={() => selectVibe(vibe.id)} selected={vibe.id === selectedVibeId} vibe={vibe} />)}
        </View>
      ) : (
        <View accessibilityLabel={t('discovery.colorChoices')} style={styles.colorChoiceGrid}>
          {colors.map((color) => {
            const selected = color.id === selectedColorId;
            return (
              <Pressable accessibilityLabel={t('discovery.colorChoiceA11y', { description: color.description, name: color.name, selected: selected ? t('vibeCard.selectedSuffix') : '' })} accessibilityRole="button" accessibilityState={{ selected }} key={color.id} onPress={() => selectColor(color.id)} style={[styles.colorChoice, selected && styles.colorChoiceSelected]}>
                <View accessibilityLabel={t('discovery.colorLabel', { name: color.name })} style={[styles.colorDot, { backgroundColor: color.palette[0] }]} />
                <Text style={styles.colorName}>{color.name}</Text><Text style={styles.colorAction}>{selected ? t('common.selected') : t('common.choose')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View accessibilityLabel={t('budget.accessibility')} style={styles.budgetSection}>
        <Text style={styles.budgetTitle}>{t('budget.label')}</Text>
        <View style={styles.budgetControls}>{[{ id: 'any', symbol: '' }, ...BUDGET_LEVELS].map((item) => { const selected = budgetPreference === item.id; const label = budgetLabel(item.id); return <Pressable accessibilityLabel={t('budget.preferenceA11y', { label, selected: selected ? t('budget.selectedSuffix') : '' })} accessibilityRole="button" accessibilityState={{ selected }} key={item.id} onPress={() => setBudgetPreference(item.id)} style={[styles.budgetButton, selected && styles.budgetButtonSelected]}><Text style={[styles.budgetButtonText, selected && styles.budgetButtonTextSelected]}>{item.symbol ? `${item.symbol} ` : ''}{label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      </View>
      {!selectedIdentity ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t(discoveryMode === 'vibe' ? 'discovery.beginVibe' : 'discovery.beginColor')}</Text><Text style={styles.emptyCopy}>{t(discoveryMode === 'vibe' ? 'discovery.readyVibes' : 'discovery.readyColors')}</Text></View> : <><View style={[styles.identityCard, { backgroundColor: selectedIdentity.palette?.[2] || '#F4F0E8' }]}><Text style={styles.eyebrow}>{discoveryMode === 'vibe' ? selectedIdentity.colorFamily : t('discovery.curatedColorStory')}</Text><Text style={styles.identityTitle}>{selectedIdentity.name}</Text><Text style={styles.identityDescription}>{selectedIdentity.description}</Text>{renderPalette(selectedIdentity.palette || [], selectedIdentity.name)}</View><View onLayout={handleResultsLayout}><Text style={styles.resultsTitle}>{discoveryMode === 'vibe' ? t('discovery.vibeDestinations', { name: selectedIdentity.name }) : t('discovery.colorDestinations')}</Text>{recommendations.length ? recommendations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t(baseRecommendations.length ? 'discovery.noBudgetMatches' : 'discovery.noMatches')}</Text>{baseRecommendations.length ? <Text style={styles.emptyCopy}>{t('discovery.chooseAnotherBudget')}</Text> : null}</View>}</View></>}
      <View onLayout={handleInspiredLayout} style={styles.inspiredSection}>
        <Text style={styles.eyebrow}>{t('personalization.kicker')}</Text>
        <Text style={styles.inspiredTitle}>{t('personalization.title')}</Text>
        <Text style={styles.inspiredCopy}>{t(personalizedResult.personalized ? 'personalization.personalizedCopy' : 'personalization.neutralCopy')}</Text>
        {inspiredRecommendations.map((recommendation) => renderDestinationCard(
          recommendation.destination,
          true,
          personalizedResult.personalized ? recommendation.reasons : [],
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 26, paddingTop: 14 },
  eyebrow: { color: '#766F68', fontSize: 14, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  pageTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 41, fontWeight: '700', letterSpacing: -1, lineHeight: 46, marginTop: 9 },
  pageSubtitle: { color: '#5E625F', fontSize: 17, lineHeight: 26, marginTop: 10, maxWidth: 340 },
  modeSwitch: { alignSelf: 'flex-start', borderBottomColor: '#D7D0C7', borderBottomWidth: 1, flexDirection: 'row', marginBottom: 22 },
  modeButton: { alignItems: 'center', minHeight: 44, paddingHorizontal: 14, paddingVertical: 12 },
  modeButtonSelected: { borderBottomColor: '#1C2426', borderBottomWidth: 2 },
  modeText: { color: '#77736E', fontSize: 16, fontWeight: '600' },
  modeTextSelected: { color: '#1C2426' },
  vibeCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  colorChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 20 },
  colorChoice: { alignItems: 'center', backgroundColor: '#FFFCF7', borderColor: '#E2DBD1', borderRadius: 12, borderWidth: 1, flexBasis: '30%', flexGrow: 1, minHeight: 92, padding: 11 },
  colorChoiceSelected: { backgroundColor: '#F1ECE3', borderColor: '#1C2426', borderWidth: 2, padding: 10 },
  colorDot: { borderColor: '#FFFFFF', borderRadius: 18, borderWidth: 2, height: 36, width: 36 },
  colorName: { color: '#1C2426', fontSize: 14, fontWeight: '700', marginTop: 7, textAlign: 'center' },
  colorAction: { color: '#77736E', fontSize: 14, fontWeight: '700', letterSpacing: 0.3, marginTop: 3, textAlign: 'center', textTransform: 'uppercase' },
  budgetSection: { marginBottom: 26 },
  budgetTitle: { color: '#766F68', fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  budgetControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  budgetButton: { alignItems: 'center', backgroundColor: '#FFFCF7', borderColor: '#DED6CC', borderRadius: 20, borderWidth: 1, flexGrow: 1, minHeight: 40, paddingHorizontal: 10, paddingVertical: 9 },
  budgetButtonSelected: { backgroundColor: '#1C2426', borderColor: '#1C2426' },
  budgetButtonText: { color: '#66625E', fontSize: 14, fontWeight: '700' },
  budgetButtonTextSelected: { color: '#FFFFFF' },
  identityCard: { borderRadius: 16, marginBottom: 30, padding: 24 },
  identityTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginTop: 7 },
  identityDescription: { color: '#3E4747', fontSize: 16, lineHeight: 25, marginTop: 9 },
  resultsTitle: { color: '#1C2426', fontSize: 25, fontWeight: '700', letterSpacing: -0.3, marginBottom: 16 },
  destinationCard: { backgroundColor: '#FFFCF7', borderRadius: 16, elevation: 2, marginBottom: 24, overflow: 'hidden', shadowColor: '#2C2925', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.09, shadowRadius: 14 },
  compactCard: { marginBottom: 20 },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  destinationBody: { padding: 20 },
  destinationHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  destinationCopy: { flex: 1 },
  destinationName: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 31, fontWeight: '700', letterSpacing: -0.6, marginTop: 6 },
  compactName: { fontSize: 27 },
  destinationCountry: { color: '#77736E', fontSize: 16, fontWeight: '500', marginTop: 2 },
  destinationDescription: { color: '#535B59', fontSize: 16, lineHeight: 25, marginTop: 14 },
  badgeColumn: { alignItems: 'flex-end', gap: 6 },
  savedBadge: { backgroundColor: '#E8F1EC', borderRadius: 12, color: '#28533C', fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  memoryBadge: { backgroundColor: '#F0E7F2', borderRadius: 12, color: '#68427A', fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  memoryMessage: { borderLeftColor: '#8C6B96', borderLeftWidth: 2, color: '#68427A', fontSize: 15, fontStyle: 'italic', lineHeight: 22, marginTop: 14, paddingLeft: 10 },
  reasonList: { borderLeftColor: '#B18A65', borderLeftWidth: 2, marginTop: 16, paddingLeft: 12 },
  reasonTitle: { color: '#76624F', fontSize: 14, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  reasonText: { color: '#5D554E', fontSize: 16, fontStyle: 'italic', lineHeight: 24, marginTop: 5 },
  paletteRow: { flexDirection: 'row', gap: 5, marginTop: 18 },
  swatch: { flex: 1, height: 44 },
  signaturePaletteRow: { gap: 12, justifyContent: 'flex-start' },
  signatureSwatch: { borderColor: '#FFFCF7', borderRadius: 30, borderWidth: 3, flex: 0, height: 58, shadowColor: '#2C2925', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.12, shadowRadius: 5, width: 58 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFCF7', borderRadius: 16, padding: 32 },
  emptyTitle: { color: '#1C2426', fontSize: 23, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { color: '#77736E', fontSize: 16, lineHeight: 24, marginTop: 9, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', minHeight: 44, marginBottom: 12, paddingVertical: 12 },
  backButtonText: { color: '#1C2426', fontSize: 14, fontWeight: '700' },
  detailCard: { backgroundColor: '#FFFCF7', marginHorizontal: -20, marginTop: -18, overflow: 'hidden' },
  heroBackButton: { alignItems: 'center', backgroundColor: 'rgba(248, 241, 230, 0.94)', borderRadius: 24, elevation: 4, justifyContent: 'center', left: 18, minHeight: 44, paddingHorizontal: 15, position: 'absolute', shadowColor: '#1C2426', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.18, shadowRadius: 7, zIndex: 4 },
  heroBackButtonText: { color: '#1C2426', fontSize: 16, fontWeight: '800' },
  detailBody: { backgroundColor: '#F8F1E6', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -34, paddingBottom: 26, paddingHorizontal: 24, paddingTop: 36, zIndex: 2 },
  detailKicker: { color: '#766F68', fontSize: 14, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  detailTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 43, fontWeight: '700', letterSpacing: -1.1, lineHeight: 48, marginTop: 7 },
  detailCountry: { color: '#77736E', fontSize: 18, fontWeight: '500', marginTop: 3 },
  detailMemoryMessage: { borderLeftColor: '#8C6B96', borderLeftWidth: 3, color: '#68427A', fontSize: 15, fontStyle: 'italic', lineHeight: 22, marginTop: 20, paddingLeft: 13 },
  vibeLine: { color: '#8D4F5B', fontSize: 14, fontWeight: '700', letterSpacing: 1, marginTop: 22, textTransform: 'uppercase' },
  detailDescription: { color: '#4E5755', fontSize: 16, lineHeight: 25, marginTop: 10 },
  detailSectionTitle: { color: '#1C2426', fontSize: 19, fontWeight: '700', marginTop: 28 },
  snapshot: { borderTopColor: '#DCD4CA', borderTopWidth: 1, marginTop: 30, paddingTop: 22 },
  snapshotRegion: { color: '#1C2426', fontSize: 22, fontWeight: '700', marginBottom: 14, marginTop: 5 },
  factLabel: { color: '#817A72', fontSize: 14, fontWeight: '700', letterSpacing: 0.8, marginTop: 13, textTransform: 'uppercase' },
  factValue: { color: '#343C3C', fontSize: 16, fontWeight: '600', marginTop: 4 },
  sourceNote: { color: '#8A857F', fontSize: 14, marginTop: 4 },
  guidanceNote: { color: '#817A72', fontSize: 14, fontStyle: 'italic', lineHeight: 21, marginTop: 4 },
  destinationActions: { borderTopColor: '#DCD4CA', borderTopWidth: 1, marginTop: 30, paddingTop: 22 },
  saveButton: { alignItems: 'center', borderColor: '#1C2426', borderRadius: 12, borderWidth: 1, minHeight: 48, padding: 14 },
  saveButtonText: { color: '#1C2426', fontSize: 16, fontWeight: '700' },
  removeButton: { backgroundColor: '#FBEDED', borderColor: '#D92D20', borderWidth: 1 },
  removeButtonText: { color: '#A61B1B' },
  addJourneyButton: { alignItems: 'center', backgroundColor: '#1C2426', borderRadius: 12, marginTop: 10, minHeight: 48, padding: 14 },
  addJourneyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  credit: { color: '#817A72', fontSize: 14, marginTop: 16, textAlign: 'center', textDecorationLine: 'underline' },
  relatedSection: { marginTop: 34 },
  savedDreamsHeader: { marginBottom: 22, marginTop: 8 },
  savedDreamsTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 34, fontWeight: '700', letterSpacing: -0.6, marginTop: 7 },
  insightsCard: { borderBottomColor: '#DCD4CA', borderBottomWidth: 1, borderTopColor: '#DCD4CA', borderTopWidth: 1, marginBottom: 30, paddingVertical: 24 },
  insightCount: { color: '#1C2426', fontSize: 29, fontWeight: '700', letterSpacing: -0.4, marginTop: 8 },
  insightLabel: { color: '#817A72', fontSize: 14, fontWeight: '700', letterSpacing: 1, marginTop: 19, textTransform: 'uppercase' },
  insightValue: { color: '#8D4F5B', fontSize: 20, fontWeight: '600', marginTop: 4 },
  budgetMixRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  budgetMixLabel: { color: '#4E5755', fontSize: 14, fontWeight: '600' },
  budgetMixCount: { color: '#1C2426', fontSize: 14, fontWeight: '700' },
  insightNote: { color: '#817A72', fontSize: 14, lineHeight: 21, marginTop: 20 },
  darkButton: { backgroundColor: '#1C2426', borderRadius: 10, marginTop: 18, paddingHorizontal: 18, paddingVertical: 13 },
  darkButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  inspiredSection: { borderTopColor: '#B8AA99', borderTopWidth: 1, marginTop: 42, paddingTop: 30 },
  inspiredJump: { alignSelf: 'flex-start', borderBottomColor: '#8D4F5B', borderBottomWidth: 1, minHeight: 44, justifyContent: 'center', marginTop: 12 },
  inspiredJumpText: { color: '#8D4F5B', fontSize: 16, fontWeight: '700' },
  inspiredTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 35, fontWeight: '700', letterSpacing: -0.7, marginTop: 7 },
  inspiredCopy: { color: '#5E625F', fontSize: 17, lineHeight: 26, marginBottom: 22, marginTop: 9, maxWidth: 330 },
  passportCard: { backgroundColor: '#FBF5EA', borderColor: '#E1D5C6', borderRadius: 24, borderWidth: 1, elevation: 2, marginBottom: 34, overflow: 'hidden', padding: 22, shadowColor: '#493F36', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.09, shadowRadius: 15 },
  passportHeading: { marginBottom: 20 },
  passportEyebrow: { color: '#7D7066', fontSize: 14, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  passportTitle: { color: '#252B2B', fontFamily: EDITORIAL_SERIF, fontSize: 35, fontWeight: '700', letterSpacing: -0.7, marginTop: 7 },
  passportSubtitle: { color: '#7A7068', fontFamily: EDITORIAL_SERIF, fontSize: 17, fontStyle: 'italic', lineHeight: 24, marginTop: 5 },
  watercolourArtwork: { backgroundColor: '#F5ECDF', borderRadius: 24, height: 254, overflow: 'hidden', position: 'relative' },
  watercolourWash: { borderRadius: 999, opacity: 0.3, overflow: 'hidden', position: 'absolute' },
  watercolourBloom: { borderRadius: 999, flex: 1, margin: 18, opacity: 0.26 },
  passportNarrative: { color: '#3B4140', fontFamily: EDITORIAL_SERIF, fontSize: 22, fontStyle: 'italic', fontWeight: '500', lineHeight: 31, marginTop: 24 },
  passportFacts: { marginTop: 24 },
  passportFact: { alignItems: 'center', borderTopColor: '#DDD1C3', borderTopWidth: 1, flexDirection: 'row', gap: 13, paddingVertical: 14 },
  passportFactSwatch: { borderColor: '#FFFFFF', borderRadius: 24, borderWidth: 2, height: 46, width: 46 },
  passportFactCopy: { flex: 1 },
  passportFactLabel: { color: '#7D7066', fontSize: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  passportFactValue: { color: '#303636', fontFamily: EDITORIAL_SERIF, fontSize: 18, fontWeight: '600', marginTop: 4 },
  passportMood: { borderTopColor: '#DDD1C3', borderTopWidth: 1, paddingTop: 18 },
  passportMoodValue: { color: '#775A67', fontFamily: EDITORIAL_SERIF, fontSize: 30, fontStyle: 'italic', fontWeight: '500', marginTop: 5 },
  passportEarlyState: { paddingTop: 4 },
  passportEmpty: { color: '#615C57', fontFamily: EDITORIAL_SERIF, fontSize: 18, fontStyle: 'italic', lineHeight: 27, marginTop: 22 },
});
