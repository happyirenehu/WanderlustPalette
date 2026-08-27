import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import mockData from '../assets/mockData.json';
import getContrastColor from '../utils/accessibility.js';
import { addJourney, deleteJourney, normalizeJourneys, updateJourney } from '../utils/journeys.js';
import { loadJourneys, saveJourneys } from '../utils/journeyStorage.js';

const ACTIVE_THEME_KEY = '@wanderlust_palette/active_theme';
const DEFAULT_THEME = mockData[0]?.palette[0] || '#F7FAFC';
const EMPTY_FORM = { destination: '', country: '', date: '', notes: '' };

function getDisplayImageUri(imageUri) {
  if (!imageUri.startsWith('https://images.unsplash.com/')) return imageUri;
  const separator = imageUri.includes('?') ? '&' : '?';
  return `${imageUri}${separator}fit=max&w=1200&q=80`;
}

export default function HomeScreen() {
  const sampleJourneys = useMemo(() => normalizeJourneys(mockData), []);
  const [journeys, setJourneys] = useState(sampleJourneys);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [screen, setScreen] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAppState = async () => {
      const [journeyResult, savedThemeResult] = await Promise.all([
        loadJourneys(sampleJourneys),
        AsyncStorage.getItem(ACTIVE_THEME_KEY).catch(() => null),
      ]);

      if (!isMounted) return;
      setJourneys(journeyResult.journeys);
      setStorageError(journeyResult.error || '');
      if (savedThemeResult) setActiveTheme(savedThemeResult);
    };

    loadAppState();
    return () => {
      isMounted = false;
    };
  }, [sampleJourneys]);

  const selectedJourney = journeys.find((journey) => journey.id === selectedId) || null;
  const textColor = getContrastColor(activeTheme);

  const selectTheme = async (color) => {
    if (!color) return;
    setActiveTheme(color);

    try {
      await AsyncStorage.setItem(ACTIVE_THEME_KEY, color);
    } catch (error) {
      setStorageError('The theme changed for this session but could not be saved.');
    }
  };

  const persistJourneys = async (nextJourneys) => {
    setJourneys(nextJourneys);
    const result = await saveJourneys(nextJourneys);
    setStorageError(result.error || '');
  };

  const openList = () => {
    setScreen('list');
    setSelectedId(null);
    setEditingId(null);
    setFormErrors({});
  };

  const openDetail = (journey) => {
    selectTheme(journey.palette[0]);
    setSelectedId(journey.id);
    setScreen('detail');
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setScreen('form');
  };

  const openEditForm = (journey) => {
    setEditingId(journey.id);
    setForm({
      destination: journey.destination,
      country: journey.country,
      date: journey.date,
      notes: journey.notes,
    });
    setFormErrors({});
    setScreen('form');
  };

  const submitForm = async () => {
    const result = editingId
      ? updateJourney(journeys, editingId, form)
      : addJourney(journeys, form);

    if (Object.keys(result.errors).length > 0) {
      setFormErrors(result.errors);
      return;
    }

    if (!result.journey) {
      setFormErrors({ form: 'This journey is no longer available.' });
      return;
    }

    await persistJourneys(result.journeys);
    setSelectedId(result.journey.id);
    setEditingId(null);
    setFormErrors({});
    setScreen('detail');
  };

  const requestDelete = (journey) => {
    Alert.alert(
      'Delete journey?',
      `${journey.destination}, ${journey.country} will be removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = deleteJourney(journeys, journey.id);
            if (!result.deleted) return;
            await persistJourneys(result.journeys);
            openList();
          },
        },
      ],
    );
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const renderPalette = (journey) => {
    if (journey.palette.length === 0) return null;

    return (
      <View style={styles.paletteRow}>
        {journey.palette.slice(0, 5).map((color) => (
          <Pressable
            accessibilityLabel={`Set theme to ${color}`}
            key={color}
            onPress={(event) => {
              event.stopPropagation();
              selectTheme(color);
            }}
            style={[styles.swatch, { backgroundColor: color }]}
          />
        ))}
      </View>
    );
  };

  const renderList = () => (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.kicker, { color: textColor }]}>MY JOURNEYS</Text>
          <Text style={[styles.title, { color: textColor }]}>Wanderlust</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>A palette of places worth remembering.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={openAddForm} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </Pressable>
      </View>

      {journeys.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No journeys yet</Text>
          <Text style={styles.emptyCopy}>Add your first destination to begin your travel journal.</Text>
          <Pressable onPress={openAddForm} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add journey</Text>
          </Pressable>
        </View>
      ) : journeys.map((journey) => (
        <Pressable
          accessibilityHint="Opens journey details"
          key={journey.id}
          onPress={() => openDetail(journey)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          {journey.imageUri ? <Image source={{ uri: getDisplayImageUri(journey.imageUri) }} style={styles.image} /> : null}
          <View style={styles.cardBody}>
            <Text style={styles.cardDate}>{journey.date}</Text>
            <Text style={styles.location}>{journey.destination}</Text>
            <Text style={styles.country}>{journey.country}</Text>
            {journey.notes ? <Text style={styles.description}>{journey.notes}</Text> : null}
            {renderPalette(journey)}
          </View>
        </Pressable>
      ))}
    </>
  );

  const renderDetail = () => {
    if (!selectedJourney) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Journey not found</Text>
          <Text style={styles.emptyCopy}>It may have been removed from this device.</Text>
          <Pressable onPress={openList} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to journeys</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <Pressable onPress={openList} style={styles.backButton}>
          <Text style={styles.backButtonText}>← My Journeys</Text>
        </Pressable>
        <View style={styles.detailCard}>
          {selectedJourney.imageUri ? <Image source={{ uri: getDisplayImageUri(selectedJourney.imageUri) }} style={styles.detailImage} /> : null}
          <Text style={styles.cardDate}>{selectedJourney.date}</Text>
          <Text style={styles.detailTitle}>{selectedJourney.destination}</Text>
          <Text style={styles.detailCountry}>{selectedJourney.country}</Text>
          <Text style={styles.detailNotes}>{selectedJourney.notes || 'No notes added.'}</Text>
          {renderPalette(selectedJourney)}
          <View style={styles.actionRow}>
            <Pressable onPress={() => openEditForm(selectedJourney)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => requestDelete(selectedJourney)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  };

  const renderField = (field, label, options = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline={options.multiline}
        onChangeText={(value) => updateField(field, value)}
        placeholder={options.placeholder}
        style={[styles.input, options.multiline && styles.notesInput, formErrors[field] && styles.inputError]}
        value={form[field]}
      />
      {formErrors[field] ? <Text style={styles.errorText}>{formErrors[field]}</Text> : null}
    </View>
  );

  const renderForm = () => (
    <>
      <Pressable onPress={() => (editingId && selectedJourney ? setScreen('detail') : openList())} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Cancel</Text>
      </Pressable>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit journey' : 'Add journey'}</Text>
        <Text style={styles.formSubtitle}>Required fields are marked with an asterisk.</Text>
        {renderField('destination', 'Destination *', { placeholder: 'Kyoto' })}
        {renderField('country', 'Country *', { placeholder: 'Japan' })}
        {renderField('date', 'Date *', { placeholder: 'YYYY-MM-DD' })}
        {renderField('notes', 'Notes', { multiline: true, placeholder: 'What made this journey memorable?' })}
        {formErrors.form ? <Text style={styles.errorText}>{formErrors.form}</Text> : null}
        <Pressable onPress={submitForm} style={styles.primaryButtonWide}>
          <Text style={styles.primaryButtonText}>{editingId ? 'Save changes' : 'Save journey'}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: activeTheme }]}
      keyboardShouldPersistTaps="handled"
      style={[styles.screen, { backgroundColor: activeTheme }]}
    >
      {storageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{storageError}</Text>
          <Pressable onPress={() => setStorageError('')}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
      {screen === 'list' ? renderList() : null}
      {screen === 'detail' ? renderDetail() : null}
      {screen === 'form' ? renderForm() : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: 24 },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, justifyContent: 'space-between', marginBottom: 28, paddingTop: 16 },
  headerCopy: { flex: 1 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12, opacity: 0.72 },
  title: { fontSize: 44, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 6, opacity: 0.78 },
  primaryButton: { backgroundColor: '#17202A', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 },
  primaryButtonWide: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, marginTop: 8, padding: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 8, elevation: 4, marginBottom: 24, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.16, shadowRadius: 12 },
  cardPressed: { opacity: 0.88 },
  image: { aspectRatio: 1.55, backgroundColor: '#CBD5E0', width: '100%' },
  cardBody: { padding: 18 },
  cardDate: { color: '#667085', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  location: { color: '#17202A', fontSize: 28, fontWeight: '800', marginTop: 6 },
  country: { color: '#667085', fontSize: 15, fontWeight: '600', marginTop: 2 },
  description: { color: '#4B5563', fontSize: 14, lineHeight: 21, marginTop: 8 },
  paletteRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  swatch: { borderColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, flex: 1, height: 42 },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 32 },
  emptyTitle: { color: '#17202A', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 8, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  backButtonText: { color: '#17202A', fontSize: 15, fontWeight: '700' },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden', padding: 22 },
  detailImage: { aspectRatio: 1.55, backgroundColor: '#CBD5E0', marginBottom: 20, marginHorizontal: -22, marginTop: -22, width: 'auto' },
  detailTitle: { color: '#17202A', fontSize: 36, fontWeight: '800', marginTop: 8 },
  detailCountry: { color: '#667085', fontSize: 18, fontWeight: '600', marginTop: 2 },
  detailNotes: { color: '#4B5563', fontSize: 16, lineHeight: 24, marginTop: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 8, flex: 1, padding: 13 },
  secondaryButtonText: { color: '#17202A', fontWeight: '700' },
  deleteButton: { alignItems: 'center', backgroundColor: '#FDECEC', borderRadius: 8, flex: 1, padding: 13 },
  deleteButtonText: { color: '#A61B1B', fontWeight: '700' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22 },
  formTitle: { color: '#17202A', fontSize: 30, fontWeight: '800' },
  formSubtitle: { color: '#667085', fontSize: 14, marginBottom: 22, marginTop: 6 },
  field: { marginBottom: 18 },
  label: { color: '#344054', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E0', borderRadius: 8, borderWidth: 1, color: '#17202A', fontSize: 16, paddingHorizontal: 12, paddingVertical: 11 },
  notesInput: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: '#C62828' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 5 },
  errorBanner: { alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: 8, flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 16, padding: 12 },
  errorBannerText: { color: '#664D03', flex: 1, fontSize: 13 },
  dismissText: { color: '#664D03', fontSize: 13, fontWeight: '800' },
});
