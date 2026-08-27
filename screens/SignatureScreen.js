import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import destinationsData from '../data/destinations.js';
import vibesData from '../data/vibes.js';
import getContrastColor from '../utils/accessibility.js';
import {
  getVibeById,
  normalizeDestinations,
  normalizeVibes,
  recommendDestinations,
  resolveDestinationIds,
} from '../utils/discovery.js';
import { isFavouriteId } from '../utils/dreamPalette.js';

const FALLBACK_COLOR = '#E8EEF2';

export default function SignatureScreen({
  mode,
  favouriteIds,
  onSelectTheme,
  onToggleFavourite,
}) {
  const vibes = useMemo(() => normalizeVibes(vibesData), []);
  const destinations = useMemo(() => normalizeDestinations(destinationsData), []);
  const [selectedVibeId, setSelectedVibeId] = useState(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);

  useEffect(() => {
    setSelectedDestinationId(null);
  }, [mode]);

  const selectedVibe = getVibeById(selectedVibeId, vibes);
  const recommendations = selectedVibe
    ? recommendDestinations(selectedVibe.id, destinations, vibes)
    : [];
  const dreamDestinations = resolveDestinationIds(favouriteIds, destinations);
  const selectedDestination = destinations.find((item) => item.id === selectedDestinationId) || null;

  const renderPalette = (palette, label) => {
    const colors = palette.length > 0 ? palette : [FALLBACK_COLOR];
    return (
      <View accessibilityLabel={`${label} colour palette`} style={styles.paletteRow}>
        {colors.map((color) => (
          <Pressable
            accessibilityLabel={`Use ${color} as app theme`}
            accessibilityRole="button"
            key={color}
            onPress={(event) => {
              event.stopPropagation();
              onSelectTheme(color);
            }}
            style={[styles.swatch, { backgroundColor: color }]}
          />
        ))}
      </View>
    );
  };

  const renderDestinationCard = (destination) => {
    const saved = isFavouriteId(favouriteIds, destination.id);
    const primaryColor = destination.palette[0] || FALLBACK_COLOR;
    return (
      <Pressable
        accessibilityHint="Opens curated destination details"
        accessibilityLabel={`${destination.name}, ${destination.country}${saved ? ', saved to Dream Palette' : ''}`}
        accessibilityRole="button"
        key={destination.id}
        onPress={() => setSelectedDestinationId(destination.id)}
        style={({ pressed }) => [styles.destinationCard, pressed && styles.pressedCard]}
      >
        <View style={[styles.colorBlock, { backgroundColor: primaryColor }]} />
        <View style={styles.destinationBody}>
          <View style={styles.destinationHeading}>
            <View style={styles.destinationCopy}>
              <Text style={styles.eyebrow}>{destination.colorFamily || 'Curated colour story'}</Text>
              <Text style={styles.destinationName}>{destination.name}</Text>
              <Text style={styles.destinationCountry}>{destination.country}</Text>
            </View>
            {saved ? <Text style={styles.savedBadge}>SAVED</Text> : null}
          </View>
          <Text style={styles.destinationDescription}>
            {destination.description || 'A colour-led destination selected for this travel vibe.'}
          </Text>
          {renderPalette(destination.palette, destination.name)}
        </View>
      </Pressable>
    );
  };

  const renderDetail = () => {
    if (!selectedDestination) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Destination unavailable</Text>
          <Text style={styles.emptyCopy}>This curated destination could not be found.</Text>
          <Pressable onPress={() => setSelectedDestinationId(null)} style={styles.darkButton}>
            <Text style={styles.darkButtonText}>Back</Text>
          </Pressable>
        </View>
      );
    }

    const destinationVibes = selectedDestination.vibeIds
      .map((id) => getVibeById(id, vibes))
      .filter(Boolean);
    const saved = isFavouriteId(favouriteIds, selectedDestination.id);
    const primaryColor = selectedDestination.palette[0] || FALLBACK_COLOR;
    const contrastColor = getContrastColor(primaryColor);

    return (
      <>
        <Pressable onPress={() => setSelectedDestinationId(null)} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {mode === 'dream' ? 'Dream Palette' : 'Discover'}</Text>
        </Pressable>
        <View style={styles.detailCard}>
          <View style={[styles.detailHero, { backgroundColor: primaryColor }]}>
            <Text style={[styles.detailKicker, { color: contrastColor }]}>CURATED DESTINATION</Text>
            <Text style={[styles.detailTitle, { color: contrastColor }]}>{selectedDestination.name}</Text>
            <Text style={[styles.detailCountry, { color: contrastColor }]}>{selectedDestination.country}</Text>
          </View>
          <View style={styles.detailBody}>
            <Text style={styles.vibeLine}>{destinationVibes.map((vibe) => vibe.name).join(' · ')}</Text>
            <Text style={styles.detailDescription}>
              {selectedDestination.description || 'A colour-led destination selected for this travel vibe.'}
            </Text>
            <Text style={styles.detailSectionTitle}>Why it matches</Text>
            <Text style={styles.detailDescription}>
              {selectedDestination.whyItMatches || 'Its local colour identity complements the selected travel vibe.'}
            </Text>
            <Text style={styles.detailSectionTitle}>Destination palette</Text>
            {renderPalette(selectedDestination.palette, selectedDestination.name)}
            <Pressable
              accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${selectedDestination.name} ${saved ? 'from' : 'to'} Dream Palette`}
              accessibilityRole="button"
              onPress={() => onToggleFavourite(selectedDestination.id)}
              style={[styles.saveButton, saved && styles.removeButton]}
            >
              <Text style={[styles.saveButtonText, saved && styles.removeButtonText]}>
                {saved ? 'Remove from Dream Palette' : 'Save to Dream Palette'}
              </Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  };

  if (selectedDestinationId) return renderDetail();

  if (mode === 'dream') {
    return (
      <>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>PLACES TO REMEMBER</Text>
          <Text style={styles.pageTitle}>Dream Palette</Text>
          <Text style={styles.pageSubtitle}>A personal collection of destinations saved by colour and feeling.</Text>
        </View>
        {dreamDestinations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your Dream Palette is empty</Text>
            <Text style={styles.emptyCopy}>Explore a vibe and save places that feel like your next chapter.</Text>
          </View>
        ) : dreamDestinations.map(renderDestinationCard)}
      </>
    );
  }

  const identityColor = selectedVibe?.palette[2] || '#F4F0E8';
  return (
    <>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>FEEL → COLOUR → PLACE</Text>
        <Text style={styles.pageTitle}>How do you want to feel?</Text>
        <Text style={styles.pageSubtitle}>Choose a travel vibe to reveal a curated colour story and places that share it.</Text>
      </View>
      <View accessibilityLabel="Travel vibe choices" style={styles.vibeGrid}>
        {vibes.map((vibe) => {
          const selected = vibe.id === selectedVibeId;
          return (
            <Pressable
              accessibilityLabel={`${vibe.name} vibe${selected ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={vibe.id}
              onPress={() => setSelectedVibeId(vibe.id)}
              style={[styles.vibeButton, selected && styles.vibeButtonSelected]}
            >
              <View style={[styles.vibeDot, { backgroundColor: vibe.palette[0] || FALLBACK_COLOR }]} />
              <Text style={styles.vibeName}>{vibe.name}</Text>
              <Text style={styles.vibeAction}>{selected ? 'Selected ✓' : 'Choose'}</Text>
            </Pressable>
          );
        })}
      </View>

      {!selectedVibe ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Begin with a feeling</Text>
          <Text style={styles.emptyCopy}>Six curated vibes are ready when you are. These are design associations, not scientific predictions.</Text>
        </View>
      ) : (
        <>
          <View style={[styles.identityCard, { backgroundColor: identityColor }]}>
            <Text style={styles.eyebrow}>{selectedVibe.colorFamily || 'Curated palette'}</Text>
            <Text style={styles.identityTitle}>{selectedVibe.name}</Text>
            <Text style={styles.identityDescription}>{selectedVibe.description}</Text>
            {renderPalette(selectedVibe.palette, selectedVibe.name)}
          </View>
          <Text style={styles.resultsTitle}>Places with this feeling</Text>
          {recommendations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching places yet</Text>
              <Text style={styles.emptyCopy}>This vibe does not currently have a curated destination.</Text>
            </View>
          ) : recommendations.map(renderDestinationCard)}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 22, paddingTop: 8 },
  eyebrow: { color: '#667085', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  pageTitle: { color: '#17202A', fontSize: 38, fontWeight: '800', lineHeight: 43, marginTop: 8 },
  pageSubtitle: { color: '#4B5563', fontSize: 15, lineHeight: 22, marginTop: 8 },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  vibeButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, minWidth: '30%', padding: 12 },
  vibeButtonSelected: { borderColor: '#17202A', borderWidth: 2, padding: 11 },
  vibeDot: { borderRadius: 16, height: 28, marginBottom: 7, width: 28 },
  vibeName: { color: '#17202A', fontSize: 14, fontWeight: '800' },
  vibeAction: { color: '#667085', fontSize: 10, marginTop: 3 },
  identityCard: { borderRadius: 10, marginBottom: 24, padding: 20 },
  identityTitle: { color: '#17202A', fontSize: 30, fontWeight: '800', marginTop: 5 },
  identityDescription: { color: '#344054', fontSize: 14, lineHeight: 21, marginTop: 7 },
  resultsTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', marginBottom: 14 },
  destinationCard: { backgroundColor: '#FFFFFF', borderRadius: 10, elevation: 3, marginBottom: 20, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 10 },
  pressedCard: { opacity: 0.88 },
  colorBlock: { height: 88, width: '100%' },
  destinationBody: { padding: 18 },
  destinationHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  destinationCopy: { flex: 1 },
  destinationName: { color: '#17202A', fontSize: 28, fontWeight: '800', marginTop: 5 },
  destinationCountry: { color: '#667085', fontSize: 14, fontWeight: '600', marginTop: 1 },
  destinationDescription: { color: '#4B5563', fontSize: 14, lineHeight: 21, marginTop: 12 },
  savedBadge: { backgroundColor: '#E8F1EC', borderRadius: 5, color: '#28533C', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  paletteRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  swatch: { borderColor: '#FFFFFF', borderRadius: 5, borderWidth: 2, flex: 1, height: 34 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 28 },
  emptyTitle: { color: '#17202A', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: '#667085', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10 },
  backButtonText: { color: '#17202A', fontSize: 14, fontWeight: '800' },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' },
  detailHero: { minHeight: 180, padding: 22, justifyContent: 'flex-end' },
  detailKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, opacity: 0.78 },
  detailTitle: { fontSize: 38, fontWeight: '900', marginTop: 5 },
  detailCountry: { fontSize: 17, fontWeight: '600', marginTop: 2, opacity: 0.82 },
  detailBody: { padding: 22 },
  vibeLine: { color: '#8D4F5B', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  detailDescription: { color: '#4B5563', fontSize: 15, lineHeight: 23, marginTop: 9 },
  detailSectionTitle: { color: '#17202A', fontSize: 17, fontWeight: '800', marginTop: 22 },
  saveButton: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, marginTop: 26, padding: 14 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  removeButton: { backgroundColor: '#FDECEC', borderColor: '#D92D20', borderWidth: 1 },
  removeButtonText: { color: '#A61B1B' },
  darkButton: { backgroundColor: '#17202A', borderRadius: 8, marginTop: 18, paddingHorizontal: 18, paddingVertical: 12 },
  darkButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
