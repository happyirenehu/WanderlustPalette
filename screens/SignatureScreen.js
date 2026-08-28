import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import DestinationImage from '../components/DestinationImage.js';
import colorsData from '../data/colors.js';
import destinationsData from '../data/destinations.js';
import vibesData from '../data/vibes.js';
import { fetchCountryFacts } from '../utils/countryApi.js';
import { loadCountryFacts, saveCountryFacts } from '../utils/countryInfoStorage.js';
import { getRelatedDestinations, getVibeById, normalizeDestinations, normalizeVibes, recommendDestinations, recommendDestinationsByColor, resolveDestinationIds } from '../utils/discovery.js';
import getDreamPaletteInsights from '../utils/destinationInsights.js';
import { isFavouriteId } from '../utils/dreamPalette.js';

const FALLBACK_COLOR = '#E8EEF2';

export default function SignatureScreen({ mode, favouriteIds, onSelectTheme, onToggleFavourite }) {
  const vibes = useMemo(() => normalizeVibes(vibesData), []);
  const destinations = useMemo(() => normalizeDestinations(destinationsData), []);
  const [discoveryMode, setDiscoveryMode] = useState('vibe');
  const [selectedVibeId, setSelectedVibeId] = useState(null);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [countryFacts, setCountryFacts] = useState(null);
  const [countryUnavailable, setCountryUnavailable] = useState(false);
  const selectedVibe = getVibeById(selectedVibeId, vibes);
  const selectedColor = colorsData.find((item) => item.id === selectedColorId) || null;
  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) || null;
  const dreamDestinations = resolveDestinationIds(favouriteIds, destinations);
  const insights = getDreamPaletteInsights(favouriteIds, destinations, vibes, colorsData);
  const recommendations = discoveryMode === 'color'
    ? recommendDestinationsByColor(selectedColorId, destinations, colorsData)
    : recommendDestinations(selectedVibeId, destinations, vibes);

  useEffect(() => setSelectedDestinationId(null), [mode]);

  useEffect(() => {
    const code = selectedDestination?.countryCode;
    if (!code) { setCountryFacts(null); setCountryUnavailable(false); return undefined; }
    let active = true;
    const controller = new AbortController();
    setCountryFacts(null);
    setCountryUnavailable(false);
    (async () => {
      const cached = await loadCountryFacts(code);
      if (!active) return;
      if (cached.record) setCountryFacts(cached.record.facts);
      if (cached.fresh) return;
      const fetched = await fetchCountryFacts(code, { controller });
      if (!active) return;
      if (fetched) { setCountryFacts(fetched); saveCountryFacts(fetched); }
      else if (!cached.record) setCountryUnavailable(true);
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
            {countryFacts ? <View accessibilityLabel="Country snapshot" style={styles.snapshot}><Text style={styles.eyebrow}>COUNTRY SNAPSHOT</Text>{countryFacts.capitalCity ? <Text style={styles.fact}><Text style={styles.factLabel}>Capital  </Text>{countryFacts.capitalCity}</Text> : null}{countryFacts.region ? <Text style={styles.fact}><Text style={styles.factLabel}>Region  </Text>{countryFacts.region}</Text> : null}</View> : countryUnavailable ? <Text style={styles.unavailable}>Country snapshot is unavailable offline.</Text> : null}
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
      {insights.total ? <View accessibilityLabel="Dream Palette insights" style={styles.insightsCard}><Text style={styles.eyebrow}>YOUR DREAM PALETTE</Text><Text style={styles.insightCount}>{insights.total} {insights.total === 1 ? 'place' : 'places'}</Text><Text style={styles.insightLabel}>YOUR STRONGEST VIBE</Text><Text style={styles.insightValue}>{insights.dominantVibe?.name}</Text><Text style={styles.insightLabel}>YOUR COLOUR STORY</Text><Text style={styles.insightValue}>{insights.dominantColor?.name}</Text><Text style={styles.insightNote}>Based on your saved destinations.</Text></View> : null}
      {dreamDestinations.length ? dreamDestinations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Your Dream Palette is empty</Text><Text style={styles.emptyCopy}>Explore a vibe or colour and save places that feel like your next chapter.</Text></View>}
    </>
  );

  const selectedIdentity = discoveryMode === 'color' ? selectedColor : selectedVibe;
  return (
    <>
      <View style={styles.intro}><Text style={styles.eyebrow}>FEEL → COLOUR → PLACE</Text><Text style={styles.pageTitle}>{discoveryMode === 'vibe' ? 'How do you want to feel?' : 'Where will colour take you?'}</Text><Text style={styles.pageSubtitle}>Choose a feeling or colour story to reveal locally curated destinations.</Text></View>
      <View accessibilityLabel="Discovery method" accessibilityRole="tablist" style={styles.modeSwitch}>{[['vibe', 'By Vibe'], ['color', 'By Colour']].map(([id, label]) => { const selected = discoveryMode === id; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={id} onPress={() => setDiscoveryMode(id)} style={[styles.modeButton, selected && styles.modeButtonSelected]}><Text style={[styles.modeText, selected && styles.modeTextSelected]}>{label}{selected ? ' ✓' : ''}</Text></Pressable>; })}</View>
      <View accessibilityLabel={discoveryMode === 'vibe' ? 'Travel vibe choices' : 'Travel colour choices'} style={styles.choiceGrid}>{(discoveryMode === 'vibe' ? vibes : colorsData).map((item) => { const selected = discoveryMode === 'vibe' ? item.id === selectedVibeId : item.id === selectedColorId; return <Pressable accessibilityLabel={`${item.name} ${discoveryMode}${selected ? ', selected' : ''}`} accessibilityRole="button" accessibilityState={{ selected }} key={item.id} onPress={() => discoveryMode === 'vibe' ? setSelectedVibeId(item.id) : setSelectedColorId(item.id)} style={[styles.choiceButton, selected && styles.choiceButtonSelected]}><View style={[styles.choiceDot, { backgroundColor: item.palette?.[0] || FALLBACK_COLOR }]} /><Text style={styles.choiceName}>{item.name}</Text><Text style={styles.choiceAction}>{selected ? 'Selected ✓' : 'Choose'}</Text></Pressable>; })}</View>
      {!selectedIdentity ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Begin with {discoveryMode === 'vibe' ? 'a feeling' : 'a colour'}</Text><Text style={styles.emptyCopy}>Six curated {discoveryMode === 'vibe' ? 'vibes' : 'colour stories'} are ready when you are.</Text></View> : <><View style={[styles.identityCard, { backgroundColor: selectedIdentity.palette?.[2] || '#F4F0E8' }]}><Text style={styles.eyebrow}>{discoveryMode === 'vibe' ? selectedIdentity.colorFamily : 'CURATED COLOUR STORY'}</Text><Text style={styles.identityTitle}>{selectedIdentity.name}</Text><Text style={styles.identityDescription}>{selectedIdentity.description}</Text>{renderPalette(selectedIdentity.palette || [], selectedIdentity.name)}</View><Text style={styles.resultsTitle}>{discoveryMode === 'vibe' ? 'Places with this feeling' : 'Places in this colour story'}</Text>{recommendations.length ? recommendations.map((item) => renderDestinationCard(item)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No matching places yet</Text></View>}</>}
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 20, paddingTop: 8 }, eyebrow: { color: '#667085', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }, pageTitle: { color: '#17202A', fontSize: 36, fontWeight: '800', lineHeight: 42, marginTop: 8 }, pageSubtitle: { color: '#4B5563', fontSize: 15, lineHeight: 22, marginTop: 8 },
  modeSwitch: { backgroundColor: '#FFFFFF', borderRadius: 9, flexDirection: 'row', marginBottom: 18, padding: 4 }, modeButton: { alignItems: 'center', borderRadius: 7, flex: 1, padding: 11 }, modeButtonSelected: { backgroundColor: '#17202A' }, modeText: { color: '#667085', fontSize: 13, fontWeight: '800' }, modeTextSelected: { color: '#FFFFFF' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }, choiceButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, minWidth: '30%', padding: 12 }, choiceButtonSelected: { borderColor: '#17202A', borderWidth: 2, padding: 11 }, choiceDot: { borderRadius: 16, height: 28, marginBottom: 7, width: 28 }, choiceName: { color: '#17202A', fontSize: 13, fontWeight: '800', textAlign: 'center' }, choiceAction: { color: '#667085', fontSize: 10, marginTop: 3 },
  identityCard: { borderRadius: 10, marginBottom: 24, padding: 20 }, identityTitle: { color: '#17202A', fontSize: 30, fontWeight: '800', marginTop: 5 }, identityDescription: { color: '#344054', fontSize: 14, lineHeight: 21, marginTop: 7 }, resultsTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', marginBottom: 14 },
  destinationCard: { backgroundColor: '#FFFFFF', borderRadius: 10, elevation: 3, marginBottom: 20, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 10 }, compactCard: { marginBottom: 14 }, pressedCard: { opacity: 0.88 }, destinationBody: { padding: 18 }, destinationHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, destinationCopy: { flex: 1 }, destinationName: { color: '#17202A', fontSize: 28, fontWeight: '800', marginTop: 5 }, compactName: { fontSize: 22 }, destinationCountry: { color: '#667085', fontSize: 14, fontWeight: '600', marginTop: 1 }, destinationDescription: { color: '#4B5563', fontSize: 14, lineHeight: 21, marginTop: 12 }, savedBadge: { backgroundColor: '#E8F1EC', borderRadius: 5, color: '#28533C', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  paletteRow: { flexDirection: 'row', gap: 8, marginTop: 16 }, swatch: { borderColor: '#FFFFFF', borderRadius: 5, borderWidth: 2, flex: 1, height: 34 }, emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 28 }, emptyTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', textAlign: 'center' }, emptyCopy: { color: '#667085', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10 }, backButtonText: { color: '#17202A', fontSize: 14, fontWeight: '800' }, detailCard: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' }, detailBody: { padding: 22 }, detailKicker: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, detailTitle: { color: '#17202A', fontSize: 38, fontWeight: '900', marginTop: 5 }, detailCountry: { color: '#667085', fontSize: 17, fontWeight: '600', marginTop: 2 }, vibeLine: { color: '#8D4F5B', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 18, textTransform: 'uppercase' }, detailDescription: { color: '#4B5563', fontSize: 15, lineHeight: 23, marginTop: 9 }, detailSectionTitle: { color: '#17202A', fontSize: 17, fontWeight: '800', marginTop: 22 },
  snapshot: { backgroundColor: '#F4F7F8', borderRadius: 8, marginTop: 24, padding: 16 }, fact: { color: '#344054', fontSize: 14, marginTop: 10 }, factLabel: { color: '#17202A', fontWeight: '800' }, unavailable: { color: '#667085', fontSize: 12, marginTop: 18 }, saveButton: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, marginTop: 26, padding: 14 }, saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, removeButton: { backgroundColor: '#FDECEC', borderColor: '#D92D20', borderWidth: 1 }, removeButtonText: { color: '#A61B1B' }, credit: { color: '#667085', fontSize: 11, marginTop: 14, textAlign: 'center', textDecorationLine: 'underline' }, relatedSection: { marginTop: 26 },
  insightsCard: { backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 20, padding: 22 }, insightCount: { color: '#17202A', fontSize: 28, fontWeight: '900', marginTop: 7 }, insightLabel: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 18 }, insightValue: { color: '#8D4F5B', fontSize: 20, fontWeight: '800', marginTop: 3 }, insightNote: { color: '#667085', fontSize: 12, marginTop: 18 }, darkButton: { backgroundColor: '#17202A', borderRadius: 8, marginTop: 18, paddingHorizontal: 18, paddingVertical: 12 }, darkButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
