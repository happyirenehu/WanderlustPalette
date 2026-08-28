import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import DestinationImage from '../components/DestinationImage.js';
import VibeCard from '../components/VibeCard.js';
import colorsData from '../data/colors.js';
import destinationsData from '../data/destinations.js';
import vibesData from '../data/vibes.js';
import { fetchCountryFacts } from '../utils/countryApi.js';
import { loadCountryFacts, saveCountryFacts } from '../utils/countryInfoStorage.js';
import { applyBudgetPreference, BUDGET_LEVELS, getBudgetDisplay } from '../utils/budget.js';
import { getRelatedDestinations, getVibeById, normalizeDestinations, normalizeVibes, recommendDestinations, recommendDestinationsByColor, resolveDestinationIds } from '../utils/discovery.js';
import getDreamPaletteInsights from '../utils/destinationInsights.js';
import { isFavouriteId } from '../utils/dreamPalette.js';

const FALLBACK_COLOR = '#E8EEF2';

export default function SignatureScreen({ mode, favouriteIds, onDestinationChange, onRecommendationReady, onSelectTheme, onToggleFavourite }) {
  const vibes = useMemo(() => normalizeVibes(vibesData), []);
  const destinations = useMemo(() => normalizeDestinations(destinationsData), []);
  const [discoveryMode, setDiscoveryMode] = useState('vibe');
  const [selectedVibeId, setSelectedVibeId] = useState(null);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [budgetPreference, setBudgetPreference] = useState('any');
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [countryFacts, setCountryFacts] = useState(null);
  const resultsY = useRef(null);
  const pendingResultsScroll = useRef(false);
  const selectedVibe = getVibeById(selectedVibeId, vibes);
  const selectedColor = colorsData.find((item) => item.id === selectedColorId) || null;
  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) || null;
  const dreamDestinations = resolveDestinationIds(favouriteIds, destinations);
  const insights = getDreamPaletteInsights(favouriteIds, destinations, vibes, colorsData);
  const baseRecommendations = discoveryMode === 'color'
    ? recommendDestinationsByColor(selectedColorId, destinations, colorsData)
    : recommendDestinations(selectedVibeId, destinations, vibes);
  const recommendations = applyBudgetPreference(baseRecommendations, budgetPreference);

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
    <View accessibilityLabel={`${label} colour palette`} style={styles.paletteRow}>
      {(palette.length ? palette : [FALLBACK_COLOR]).map((color) => (
        <Pressable accessibilityLabel={`Use ${color} as app theme`} accessibilityRole="button" key={color} onPress={(event) => { event.stopPropagation(); onSelectTheme(color); }} style={[styles.swatch, { backgroundColor: color }]} />
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
      <Pressable accessibilityHint="Opens curated destination details" accessibilityLabel={`${destination.name}, ${destination.country}${saved ? ', saved to Dream Palette' : ''}`} accessibilityRole="button" key={destination.id} onPress={() => setSelectedDestinationId(destination.id)} style={({ pressed }) => [styles.destinationCard, compact && styles.compactCard, pressed && styles.pressedCard]}>
        <DestinationImage destination={destination} />
        <View style={styles.destinationBody}>
          <View style={styles.destinationHeading}>
            <View style={styles.destinationCopy}><Text style={styles.eyebrow}>{destination.colorFamily || 'Curated colour story'}</Text><Text style={[styles.destinationName, compact && styles.compactName]}>{destination.name}</Text><Text style={styles.destinationCountry}>{destination.country}</Text></View>
            {saved ? <Text style={styles.savedBadge}>SAVED</Text> : null}
          </View>
          {!compact ? <><Text style={styles.destinationDescription}>{destination.description}</Text>{renderPalette(destination.palette, destination.name)}</> : null}
        </View>
      </Pressable>
    );
  };

  if (selectedDestinationId) {
    if (!selectedDestination) return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Destination unavailable</Text><Pressable onPress={() => setSelectedDestinationId(null)} style={styles.darkButton}><Text style={styles.darkButtonText}>Back</Text></Pressable></View>;
    const destinationVibes = selectedDestination.vibeIds.map((id) => getVibeById(id, vibes)).filter(Boolean);
    const destinationColors = colorsData.filter((color) => selectedDestination.colorIds.includes(color.id));
    const related = getRelatedDestinations(selectedDestination.id, destinations);
    const saved = isFavouriteId(favouriteIds, selectedDestination.id);
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => setSelectedDestinationId(null)} style={styles.backButton}><Text style={styles.backButtonText}>← {mode === 'dream' ? 'Dream Palette' : 'Discover'}</Text></Pressable>
        <View style={styles.detailCard}>
          <DestinationImage destination={selectedDestination} detail />
          <View style={styles.detailBody}>
            <Text style={styles.detailKicker}>CURATED DESTINATION</Text><Text style={styles.detailTitle}>{selectedDestination.name}</Text><Text style={styles.detailCountry}>{selectedDestination.country}</Text>
            <Text style={styles.vibeLine}>{destinationVibes.map((vibe) => vibe.name).join(' · ')}</Text><Text style={styles.detailDescription}>{selectedDestination.description}</Text>
            <Text style={styles.detailSectionTitle}>Colour story</Text><Text style={styles.detailDescription}>{destinationColors.map((color) => color.name).join(' · ') || selectedDestination.colorFamily}</Text>
            <Text style={styles.detailSectionTitle}>Why it matches</Text><Text style={styles.detailDescription}>{selectedDestination.whyItMatches}</Text>
            <Text style={styles.detailSectionTitle}>Destination palette</Text>{renderPalette(selectedDestination.palette, selectedDestination.name)}
            <View accessibilityLabel={`Travel snapshot. ${selectedDestination.travelRegion}. Travel budget ${getBudgetDisplay(selectedDestination.budget)}${countryFacts?.capitalCity ? `. Capital ${countryFacts.capitalCity}` : ''}${countryFacts?.incomeLevel ? `. Income level ${countryFacts.incomeLevel}, World Bank classification` : ''}`} style={styles.snapshot}>
              <Text style={styles.eyebrow}>TRAVEL SNAPSHOT</Text>
              <Text style={styles.snapshotRegion}>{selectedDestination.travelRegion}</Text>
              <Text style={styles.factLabel}>Travel Budget</Text><Text style={styles.factValue}>{getBudgetDisplay(selectedDestination.budget)}</Text>
              {countryFacts?.capitalCity ? <><Text style={styles.factLabel}>Capital</Text><Text style={styles.factValue}>{countryFacts.capitalCity}</Text></> : null}
              {countryFacts?.incomeLevel ? <><Text style={styles.factLabel}>Income Level</Text><Text style={styles.factValue}>{countryFacts.incomeLevel}</Text><Text style={styles.sourceNote}>World Bank classification</Text></> : null}
            </View>
            <Pressable accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${selectedDestination.name} ${saved ? 'from' : 'to'} Dream Palette`} accessibilityRole="button" onPress={() => onToggleFavourite(selectedDestination.id)} style={[styles.saveButton, saved && styles.removeButton]}><Text style={[styles.saveButtonText, saved && styles.removeButtonText]}>{saved ? 'Remove from Dream Palette' : 'Save to Dream Palette'}</Text></Pressable>
            {selectedDestination.imageCredit ? <Pressable accessibilityRole="link" onPress={() => selectedDestination.imageAttributionUrl && Linking.openURL(selectedDestination.imageAttributionUrl)}><Text style={styles.credit}>{selectedDestination.imageCredit}</Text></Pressable> : null}
          </View>
        </View>
        {related.length ? <View style={styles.relatedSection}><Text style={styles.resultsTitle}>Keep exploring</Text>{related.map((item) => renderDestinationCard(item, true))}</View> : null}
      </>
    );
  }

  if (mode === 'dream') return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>PLACES TO REMEMBER</Text><Text style={styles.pageTitle}>Dream Palette</Text><Text style={styles.pageSubtitle}>A personal collection of destinations saved by colour and feeling.</Text></View>
      {insights.total ? <View accessibilityLabel="Dream Palette insights" style={styles.insightsCard}><Text style={styles.eyebrow}>YOUR DREAM TRAVEL STYLE</Text><Text style={styles.insightCount}>{insights.total} {insights.total === 1 ? 'saved place' : 'saved places'}</Text><Text style={styles.insightLabel}>YOUR STRONGEST VIBE</Text><Text style={styles.insightValue}>{insights.dominantVibe?.name}</Text><Text style={styles.insightLabel}>YOUR COLOUR STORY</Text><Text style={styles.insightValue}>{insights.dominantColor?.name}</Text><Text style={styles.insightLabel}>TYPICAL BUDGET</Text><Text style={styles.insightValue}>{insights.dominantBudget ? `${insights.dominantBudget.symbol} · ${insights.dominantBudget.label}` : 'Still unfolding'}</Text><Text style={styles.insightLabel}>BUDGET MIX</Text>{insights.budgetDistribution.filter((item) => item.count > 0).map((item) => <View key={item.id} style={styles.budgetMixRow}><Text style={styles.budgetMixLabel}>{item.symbol} {item.label}</Text><Text style={styles.budgetMixCount}>{item.count}</Text></View>)}<Text style={styles.insightNote}>Based on your saved destinations and curated travel-cost categories.</Text></View> : null}
      {dreamDestinations.length ? dreamDestinations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Your Dream Palette is empty</Text><Text style={styles.emptyCopy}>Explore a vibe or colour and save places that feel like your next chapter.</Text></View>}
    </>
  );

  const selectedIdentity = discoveryMode === 'color' ? selectedColor : selectedVibe;
  return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>FEEL → COLOUR → PLACE</Text><Text style={styles.pageTitle}>{discoveryMode === 'vibe' ? 'How do you want to feel?' : 'Where will colour take you?'}</Text><Text style={styles.pageSubtitle}>Choose a feeling or colour story to reveal locally curated destinations.</Text></View>
      <View accessibilityLabel="Discovery method" accessibilityRole="tablist" style={styles.modeSwitch}>{[['vibe', 'By Vibe'], ['color', 'By Colour']].map(([id, label]) => { const selected = discoveryMode === id; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={id} onPress={() => setDiscoveryMode(id)} style={[styles.modeButton, selected && styles.modeButtonSelected]}><Text style={[styles.modeText, selected && styles.modeTextSelected]}>{label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      {discoveryMode === 'vibe' ? (
        <View accessibilityLabel="Travel vibe choices" style={styles.vibeCardGrid}>
          {vibes.map((vibe) => <VibeCard key={vibe.id} onPress={() => selectVibe(vibe.id)} selected={vibe.id === selectedVibeId} vibe={vibe} />)}
        </View>
      ) : (
        <View accessibilityLabel="Travel colour choices" style={styles.colorChoiceGrid}>
          {colorsData.map((color) => {
            const selected = color.id === selectedColorId;
            return (
              <Pressable accessibilityLabel={`${color.name} colour story. ${color.description}${selected ? ' Selected.' : ''}`} accessibilityRole="button" accessibilityState={{ selected }} key={color.id} onPress={() => setSelectedColorId(color.id)} style={[styles.colorChoice, selected && styles.colorChoiceSelected]}>
                <View accessibilityLabel={`${color.name} colour`} style={[styles.colorDot, { backgroundColor: color.palette[0] }]} />
                <Text style={styles.colorName}>{color.name}</Text><Text style={styles.colorAction}>{selected ? 'Selected ✓' : 'Choose'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View accessibilityLabel="Travel budget preference" style={styles.budgetSection}>
        <Text style={styles.budgetTitle}>TRAVEL BUDGET · OPTIONAL</Text>
        <View style={styles.budgetControls}>{[{ id: 'any', symbol: '', label: 'Any' }, ...BUDGET_LEVELS].map((item) => { const selected = budgetPreference === item.id; return <Pressable accessibilityLabel={`${item.label} budget preference${selected ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected }} key={item.id} onPress={() => setBudgetPreference(item.id)} style={[styles.budgetButton, selected && styles.budgetButtonSelected]}><Text style={[styles.budgetButtonText, selected && styles.budgetButtonTextSelected]}>{item.symbol ? `${item.symbol} ` : ''}{item.label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      </View>
      {!selectedIdentity ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Begin with {discoveryMode === 'vibe' ? 'a feeling' : 'a colour'}</Text><Text style={styles.emptyCopy}>Six curated {discoveryMode === 'vibe' ? 'vibes' : 'colour stories'} are ready when you are.</Text></View> : <><View style={[styles.identityCard, { backgroundColor: selectedIdentity.palette?.[2] || '#F4F0E8' }]}><Text style={styles.eyebrow}>{discoveryMode === 'vibe' ? selectedIdentity.colorFamily : 'CURATED COLOUR STORY'}</Text><Text style={styles.identityTitle}>{selectedIdentity.name}</Text><Text style={styles.identityDescription}>{selectedIdentity.description}</Text>{renderPalette(selectedIdentity.palette || [], selectedIdentity.name)}</View><View onLayout={handleResultsLayout}><Text style={styles.resultsTitle}>{discoveryMode === 'vibe' ? `${selectedIdentity.name} destinations` : 'Places in this colour story'}</Text>{recommendations.length ? recommendations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{baseRecommendations.length ? 'No places at this budget yet' : 'No matching places yet'}</Text>{baseRecommendations.length ? <Text style={styles.emptyCopy}>Choose Any or another budget level to see more destinations.</Text> : null}</View>}</View></>}
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
