import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

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

const FALLBACK_COLOR = '#E8EEF2';

export default function SignatureScreen({ mode, favouriteIds, onDestinationChange, onRecommendationReady, onSelectTheme, onToggleFavourite }) {
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
  const pendingResultsScroll = useRef(false);
  const selectedVibe = getVibeById(selectedVibeId, vibes);
  const selectedColor = colors.find((item) => item.id === selectedColorId) || null;
  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) || null;
  const dreamDestinations = resolveDestinationIds(favouriteIds, destinations);
  const insights = getDreamPaletteInsights(favouriteIds, destinations, vibes, colors);
  const baseRecommendations = discoveryMode === 'color'
    ? recommendDestinationsByColor(selectedColorId, destinations, colors)
    : recommendDestinations(selectedVibeId, destinations, vibes);
  const recommendations = applyBudgetPreference(baseRecommendations, budgetPreference);
  const budgetLabel = (id) => t(`budget.${id}`, {}, id);
  const budgetDisplay = (id) => {
    const level = BUDGET_LEVELS.find((item) => item.id === id);
    return level ? `${level.symbol} · ${budgetLabel(id)}` : '';
  };

  useEffect(() => setSelectedDestinationId(null), [mode]);

  useEffect(() => {
    if (selectedDestinationId) onDestinationChange?.();
  }, [onDestinationChange, selectedDestinationId]);

  useEffect(() => {
    if (!selectedVibeId || !pendingResultsScroll.current || resultsY.current === null) return undefined;
    const frame = requestAnimationFrame(() => {
      if (!pendingResultsScroll.current) return;
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [onRecommendationReady, selectedVibeId]);

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

  const renderPalette = (palette, label) => (
    <View accessibilityLabel={t('discovery.paletteLabel', { name: label })} style={styles.paletteRow}>
      {(palette.length ? palette : [FALLBACK_COLOR]).map((color) => (
        <Pressable accessibilityLabel={t('discovery.useTheme', { color })} accessibilityRole="button" key={color} onPress={(event) => { event.stopPropagation(); onSelectTheme(color); }} style={[styles.swatch, { backgroundColor: color }]} />
      ))}
    </View>
  );

  const selectVibe = (vibeId) => {
    pendingResultsScroll.current = true;
    setSelectedVibeId(vibeId);
  };

  const handleResultsLayout = (event) => {
    resultsY.current = event.nativeEvent.layout.y;
    if (pendingResultsScroll.current) {
      pendingResultsScroll.current = false;
      onRecommendationReady?.(resultsY.current);
    }
  };

  const renderDestinationCard = (destination, compact = false) => {
    const saved = isFavouriteId(favouriteIds, destination.id);
    return (
      <Pressable accessibilityHint={t('discovery.destinationHint')} accessibilityLabel={`${destination.name}, ${destination.country}${saved ? `, ${t('discovery.savedToDream')}` : ''}`} accessibilityRole="button" key={destination.id} onPress={() => setSelectedDestinationId(destination.id)} style={({ pressed }) => [styles.destinationCard, compact && styles.compactCard, pressed && styles.pressedCard]}>
        <DestinationImage destination={destination} />
        <View style={styles.destinationBody}>
          <View style={styles.destinationHeading}>
            <View style={styles.destinationCopy}><Text style={styles.eyebrow}>{destination.colorFamily || t('discovery.curatedColorStory')}</Text><Text style={[styles.destinationName, compact && styles.compactName]}>{destination.name}</Text><Text style={styles.destinationCountry}>{destination.country}</Text></View>
            {saved ? <Text style={styles.savedBadge}>{t('common.saved')}</Text> : null}
          </View>
          {!compact ? <><Text style={styles.destinationDescription}>{destination.description}</Text>{renderPalette(destination.palette, destination.name)}</> : null}
        </View>
      </Pressable>
    );
  };

  if (selectedDestinationId) {
    if (!selectedDestination) return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('discovery.destinationUnavailable')}</Text><Pressable onPress={() => setSelectedDestinationId(null)} style={styles.darkButton}><Text style={styles.darkButtonText}>{t('common.back')}</Text></Pressable></View>;
    const destinationVibes = selectedDestination.vibeIds.map((id) => getVibeById(id, vibes)).filter(Boolean);
    const destinationColors = colors.filter((color) => selectedDestination.colorIds.includes(color.id));
    const related = getRelatedDestinations(selectedDestination.id, destinations);
    const saved = isFavouriteId(favouriteIds, selectedDestination.id);
    const capitalDisplay = countryFacts?.capitalCity
      ? formatCapital(selectedDestination.countryCode, countryFacts.capitalCity)
      : '';
    const incomeDisplay = countryFacts?.incomeLevel ? formatIncome(countryFacts.incomeLevel) : '';
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => setSelectedDestinationId(null)} style={styles.backButton}><Text style={styles.backButtonText}>← {mode === 'dream' ? t('dream.title') : t('nav.discover')}</Text></Pressable>
        <View style={styles.detailCard}>
          <DestinationImage destination={selectedDestination} detail />
          <View style={styles.detailBody}>
            <Text style={styles.detailKicker}>{t('discovery.curatedDestination')}</Text><Text style={styles.detailTitle}>{selectedDestination.name}</Text><Text style={styles.detailCountry}>{selectedDestination.country}</Text>
            <Text style={styles.vibeLine}>{destinationVibes.map((vibe) => vibe.name).join(' · ')}</Text><Text style={styles.detailDescription}>{selectedDestination.description}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.colorStoryTitle')}</Text><Text style={styles.detailDescription}>{destinationColors.map((color) => color.name).join(' · ') || selectedDestination.colorFamily}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.whyItMatches')}</Text><Text style={styles.detailDescription}>{selectedDestination.whyItMatches}</Text>
            <Text style={styles.detailSectionTitle}>{t('discovery.destinationPalette')}</Text>{renderPalette(selectedDestination.palette, selectedDestination.name)}
            <View accessibilityLabel={t('snapshot.accessibility', {
              budget: budgetDisplay(selectedDestination.budget),
              capital: capitalDisplay ? t('snapshot.capitalA11y', { capital: capitalDisplay }) : '',
              income: incomeDisplay ? t('snapshot.incomeA11y', { income: incomeDisplay }) : '',
              region: selectedDestination.travelRegion,
            })} style={styles.snapshot}>
              <Text style={styles.eyebrow}>{t('snapshot.title')}</Text>
              <Text style={styles.factLabel}>{t('snapshot.region')}</Text>
              <Text style={styles.snapshotRegion}>{selectedDestination.travelRegion}</Text>
              <Text style={styles.factLabel}>{t('snapshot.budget')}</Text><Text style={styles.factValue}>{budgetDisplay(selectedDestination.budget)}</Text>
              {capitalDisplay ? <><Text style={styles.factLabel}>{t('snapshot.capital')}</Text><Text style={styles.factValue}>{capitalDisplay}</Text></> : null}
              {incomeDisplay ? <><Text style={styles.factLabel}>{t('snapshot.incomeLevel')}</Text><Text style={styles.factValue}>{incomeDisplay}</Text><Text style={styles.sourceNote}>{t('snapshot.source')}</Text></> : null}
            </View>
            <Pressable accessibilityLabel={t('discovery.saveDreamA11y', { action: saved ? t('common.remove') : t('common.save'), direction: saved ? t('discovery.removeDirection') : t('discovery.addDirection'), name: selectedDestination.name })} accessibilityRole="button" onPress={() => onToggleFavourite(selectedDestination.id)} style={[styles.saveButton, saved && styles.removeButton]}><Text style={[styles.saveButtonText, saved && styles.removeButtonText]}>{saved ? t('discovery.removeFromDream') : t('discovery.saveToDream')}</Text></Pressable>
            {selectedDestination.imageCredit ? <Pressable accessibilityRole="link" onPress={() => selectedDestination.imageAttributionUrl && Linking.openURL(selectedDestination.imageAttributionUrl)}><Text style={styles.credit}>{selectedDestination.imageCredit}</Text></Pressable> : null}
          </View>
        </View>
        {related.length ? <View style={styles.relatedSection}><Text style={styles.resultsTitle}>{t('discovery.keepExploring')}</Text>{related.map((item) => renderDestinationCard(item, true))}</View> : null}
      </>
    );
  }

  if (mode === 'dream') return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>{t('dream.kicker')}</Text><Text style={styles.pageTitle}>{t('dream.title')}</Text><Text style={styles.pageSubtitle}>{t('dream.subtitle')}</Text></View>
      {insights.total ? <View accessibilityLabel={t('dream.insightsA11y')} style={styles.insightsCard}><Text style={styles.eyebrow}>{t('dream.styleKicker')}</Text><Text style={styles.insightCount}>{t(insights.total === 1 ? 'dream.savedPlaceOne' : 'dream.savedPlaceOther', { count: insights.total })}</Text><Text style={styles.insightLabel}>{t('dream.strongestVibe')}</Text><Text style={styles.insightValue}>{insights.dominantVibe?.name}</Text><Text style={styles.insightLabel}>{t('dream.colorStory')}</Text><Text style={styles.insightValue}>{insights.dominantColor?.name}</Text><Text style={styles.insightLabel}>{t('dream.typicalBudget')}</Text><Text style={styles.insightValue}>{insights.dominantBudget ? `${insights.dominantBudget.symbol} · ${budgetLabel(insights.dominantBudget.id)}` : t('dream.stillUnfolding')}</Text><Text style={styles.insightLabel}>{t('dream.budgetMix')}</Text>{insights.budgetDistribution.filter((item) => item.count > 0).map((item) => <View key={item.id} style={styles.budgetMixRow}><Text style={styles.budgetMixLabel}>{item.symbol} {budgetLabel(item.id)}</Text><Text style={styles.budgetMixCount}>{item.count}</Text></View>)}<Text style={styles.insightNote}>{t('dream.insightNote')}</Text></View> : null}
      {dreamDestinations.length ? dreamDestinations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('dream.emptyTitle')}</Text><Text style={styles.emptyCopy}>{t('dream.emptyCopy')}</Text></View>}
    </>
  );

  const selectedIdentity = discoveryMode === 'color' ? selectedColor : selectedVibe;
  return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>{t('discovery.flow')}</Text><Text style={styles.pageTitle}>{discoveryMode === 'vibe' ? t('discovery.vibeTitle') : t('discovery.colorTitle')}</Text><Text style={styles.pageSubtitle}>{t('discovery.subtitle')}</Text></View>
      <View accessibilityLabel={t('discovery.methodLabel')} accessibilityRole="tablist" style={styles.modeSwitch}>{[['vibe', t('discovery.byVibe')], ['color', t('discovery.byColor')]].map(([id, label]) => { const selected = discoveryMode === id; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={id} onPress={() => setDiscoveryMode(id)} style={[styles.modeButton, selected && styles.modeButtonSelected]}><Text style={[styles.modeText, selected && styles.modeTextSelected]}>{label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      {discoveryMode === 'vibe' ? (
        <View accessibilityLabel={t('discovery.vibeChoices')} style={styles.vibeCardGrid}>
          {vibes.map((vibe) => <VibeCard key={vibe.id} onPress={() => selectVibe(vibe.id)} selected={vibe.id === selectedVibeId} vibe={vibe} />)}
        </View>
      ) : (
        <View accessibilityLabel={t('discovery.colorChoices')} style={styles.colorChoiceGrid}>
          {colors.map((color) => {
            const selected = color.id === selectedColorId;
            return (
              <Pressable accessibilityLabel={t('discovery.colorChoiceA11y', { description: color.description, name: color.name, selected: selected ? t('vibeCard.selectedSuffix') : '' })} accessibilityRole="button" accessibilityState={{ selected }} key={color.id} onPress={() => setSelectedColorId(color.id)} style={[styles.colorChoice, selected && styles.colorChoiceSelected]}>
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
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 20, paddingTop: 8 }, eyebrow: { color: '#667085', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }, pageTitle: { color: '#17202A', fontSize: 36, fontWeight: '800', lineHeight: 42, marginTop: 8 }, pageSubtitle: { color: '#4B5563', fontSize: 15, lineHeight: 22, marginTop: 8 },
  modeSwitch: { backgroundColor: '#FFFFFF', borderRadius: 9, flexDirection: 'row', marginBottom: 18, padding: 4 }, modeButton: { alignItems: 'center', borderRadius: 7, flex: 1, padding: 11 }, modeButtonSelected: { backgroundColor: '#17202A' }, modeText: { color: '#667085', fontSize: 13, fontWeight: '800' }, modeTextSelected: { color: '#FFFFFF' },
  vibeCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  colorChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, colorChoice: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexBasis: '30%', flexGrow: 1, padding: 9 }, colorChoiceSelected: { borderColor: '#17202A', borderWidth: 2, padding: 8 }, colorDot: { borderColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, height: 30, width: 30 }, colorName: { color: '#17202A', fontSize: 12, fontWeight: '900', marginTop: 6, textAlign: 'center' }, colorAction: { color: '#667085', fontSize: 9, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  budgetSection: { marginBottom: 20 }, budgetTitle: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 }, budgetControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, budgetButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 7, borderWidth: 1, flexGrow: 1, paddingHorizontal: 8, paddingVertical: 8 }, budgetButtonSelected: { backgroundColor: '#17202A', borderColor: '#17202A' }, budgetButtonText: { color: '#667085', fontSize: 10, fontWeight: '800' }, budgetButtonTextSelected: { color: '#FFFFFF' },
  identityCard: { borderRadius: 10, marginBottom: 24, padding: 20 }, identityTitle: { color: '#17202A', fontSize: 30, fontWeight: '800', marginTop: 5 }, identityDescription: { color: '#344054', fontSize: 14, lineHeight: 21, marginTop: 7 }, resultsTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', marginBottom: 14 },
  destinationCard: { backgroundColor: '#FFFFFF', borderRadius: 10, elevation: 3, marginBottom: 20, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 10 }, compactCard: { marginBottom: 14 }, pressedCard: { opacity: 0.88 }, destinationBody: { padding: 18 }, destinationHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, destinationCopy: { flex: 1 }, destinationName: { color: '#17202A', fontSize: 28, fontWeight: '800', marginTop: 5 }, compactName: { fontSize: 22 }, destinationCountry: { color: '#667085', fontSize: 14, fontWeight: '600', marginTop: 1 }, destinationDescription: { color: '#4B5563', fontSize: 14, lineHeight: 21, marginTop: 12 }, savedBadge: { backgroundColor: '#E8F1EC', borderRadius: 5, color: '#28533C', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  paletteRow: { flexDirection: 'row', gap: 8, marginTop: 16 }, swatch: { borderColor: '#FFFFFF', borderRadius: 5, borderWidth: 2, flex: 1, height: 34 }, emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 28 }, emptyTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', textAlign: 'center' }, emptyCopy: { color: '#667085', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10 }, backButtonText: { color: '#17202A', fontSize: 14, fontWeight: '800' }, detailCard: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' }, detailBody: { padding: 22 }, detailKicker: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, detailTitle: { color: '#17202A', fontSize: 38, fontWeight: '900', marginTop: 5 }, detailCountry: { color: '#667085', fontSize: 17, fontWeight: '600', marginTop: 2 }, vibeLine: { color: '#8D4F5B', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 18, textTransform: 'uppercase' }, detailDescription: { color: '#4B5563', fontSize: 15, lineHeight: 23, marginTop: 9 }, detailSectionTitle: { color: '#17202A', fontSize: 17, fontWeight: '800', marginTop: 22 },
  snapshot: { backgroundColor: '#F4F7F8', borderRadius: 8, marginTop: 24, padding: 16 }, snapshotRegion: { color: '#17202A', fontSize: 21, fontWeight: '900', marginBottom: 14, marginTop: 5 }, factLabel: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 12, textTransform: 'uppercase' }, factValue: { color: '#17202A', fontSize: 15, fontWeight: '700', marginTop: 3 }, sourceNote: { color: '#667085', fontSize: 10, marginTop: 3 }, saveButton: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, marginTop: 26, padding: 14 }, saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, removeButton: { backgroundColor: '#FDECEC', borderColor: '#D92D20', borderWidth: 1 }, removeButtonText: { color: '#A61B1B' }, credit: { color: '#667085', fontSize: 11, marginTop: 14, textAlign: 'center', textDecorationLine: 'underline' }, relatedSection: { marginTop: 26 },
  insightsCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 20, padding: 22 }, insightCount: { color: '#17202A', fontSize: 28, fontWeight: '900', marginTop: 7 }, insightLabel: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 18 }, insightValue: { color: '#8D4F5B', fontSize: 20, fontWeight: '800', marginTop: 3 }, budgetMixRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, budgetMixLabel: { color: '#344054', fontSize: 13, fontWeight: '700' }, budgetMixCount: { color: '#17202A', fontSize: 13, fontWeight: '900' }, insightNote: { color: '#667085', fontSize: 12, marginTop: 18 }, darkButton: { backgroundColor: '#17202A', borderRadius: 8, marginTop: 18, paddingHorizontal: 18, paddingVertical: 12 }, darkButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
