import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import mockData from '../assets/mockData.json';
import SignatureScreen from './SignatureScreen.js';
import { useLanguage } from '../context/LanguageContext.js';
import getContrastColor from '../utils/accessibility.js';
import { addFavouriteId, isFavouriteId, removeFavouriteId } from '../utils/dreamPalette.js';
import { loadFavouriteIds, saveFavouriteIds } from '../utils/dreamPaletteStorage.js';
import { addJourney, createLocalJourneyId, deleteJourney, normalizeJourneys, updateJourney } from '../utils/journeys.js';
import { loadJourneys, saveJourneys } from '../utils/journeyStorage.js';
import getDisplayImageUri from '../utils/imageSources.js';
import { cleanupOwnedJourneyPhoto, copyPersonalJourneyPhoto } from '../utils/journeyPhotoStorage.js';
import normalizePhotoPickerResult from '../utils/photoPicker.js';
import getExpenseInsights from '../utils/expenseInsights.js';

const ACTIVE_THEME_KEY = '@wanderlust_palette/active_theme';
const DEFAULT_THEME = mockData[0]?.palette[0] || '#F7FAFC';
const EMPTY_FORM = { destination: '', country: '', date: '', notes: '' };

export default function HomeScreen() {
  const {
    clearLanguageError,
    formatExpenseCategory,
    languageError,
    locale,
    localizeMessage,
    setLocale,
    t,
  } = useLanguage();
  const scrollViewRef = useRef(null);
  const sampleJourneys = useMemo(() => normalizeJourneys(mockData), []);
  const [journeys, setJourneys] = useState(sampleJourneys);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [screen, setScreen] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState('');
  const [failedImageUris, setFailedImageUris] = useState(() => new Set());
  const [storageError, setStorageError] = useState('');
  const [section, setSection] = useState('discover');
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [dreamStorageError, setDreamStorageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAppState = async () => {
      const [journeyResult, savedThemeResult, favouriteResult] = await Promise.all([
        loadJourneys(sampleJourneys),
        AsyncStorage.getItem(ACTIVE_THEME_KEY).catch(() => null),
        loadFavouriteIds(),
      ]);

      if (!isMounted) return;
      setJourneys(journeyResult.journeys);
      setStorageError(journeyResult.error || '');
      setFavouriteIds(favouriteResult.ids);
      setDreamStorageError(favouriteResult.error || '');
      if (savedThemeResult) setActiveTheme(savedThemeResult);
    };

    loadAppState();
    return () => {
      isMounted = false;
    };
  }, [sampleJourneys]);

  const selectedJourney = journeys.find((journey) => journey.id === selectedId) || null;
  const textColor = getContrastColor(activeTheme);
  const resetScrollPosition = useCallback(() => {
    scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);
  const scrollToDiscoveryResults = useCallback((y) => {
    scrollViewRef.current?.scrollTo({ animated: true, y: Math.max(0, y - 8) });
  }, []);

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
    const result = await saveJourneys(nextJourneys);
    setStorageError(result.error || '');
    if (result.ok) setJourneys(nextJourneys);
    return result;
  };

  const toggleFavourite = async (destinationId) => {
    const nextIds = isFavouriteId(favouriteIds, destinationId)
      ? removeFavouriteId(favouriteIds, destinationId)
      : addFavouriteId(favouriteIds, destinationId);
    setFavouriteIds(nextIds);
    const result = await saveFavouriteIds(nextIds);
    setDreamStorageError(result.error || '');
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
    setPendingPhoto(null);
    setPhotoFeedback('');
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
    setPendingPhoto(null);
    setPhotoFeedback('');
    setScreen('form');
  };

  const choosePersonalPhoto = async () => {
    setPhotoFeedback('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoFeedback('photo.permissionDenied');
        return;
      }

      const pickerResult = normalizePhotoPickerResult(await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        mediaTypes: ['images'],
        quality: 1,
        selectionLimit: 1,
      }));
      if (pickerResult.status === 'cancelled') return;
      if (pickerResult.status !== 'selected') {
        setPhotoFeedback('photo.invalidSelection');
        return;
      }
      setPendingPhoto(pickerResult.asset);
    } catch (error) {
      setPhotoFeedback('photo.unavailableFeedback');
    }
  };

  const submitForm = async () => {
    const newJourneyId = editingId || createLocalJourneyId();
    let durablePhoto = null;
    let result = editingId
      ? updateJourney(journeys, editingId, form)
      : addJourney(journeys, form, { id: newJourneyId });

    if (Object.keys(result.errors).length > 0) {
      setFormErrors(result.errors);
      return;
    }

    if (!result.journey) {
      setFormErrors({ form: 'This journey is no longer available.' });
      return;
    }
    const targetJourneyId = result.journey.id;

    if (pendingPhoto) {
      durablePhoto = await copyPersonalJourneyPhoto(pendingPhoto, targetJourneyId);
      if (!durablePhoto.ok) {
        setFormErrors({ form: durablePhoto.error });
        return;
      }
      const inputWithPhoto = {
        ...form,
        imageSource: durablePhoto.imageSource,
        imageUri: durablePhoto.imageUri,
      };
      result = editingId
        ? updateJourney(journeys, editingId, inputWithPhoto)
        : addJourney(journeys, inputWithPhoto, { id: targetJourneyId });
    }

    const previousJourney = editingId ? journeys.find((journey) => journey.id === editingId) : null;
    const persistence = await persistJourneys(result.journeys);
    if (!persistence.ok) {
      if (durablePhoto?.ok) await cleanupOwnedJourneyPhoto(durablePhoto);
      setFormErrors({ form: persistence.error });
      return;
    }
    if (durablePhoto?.ok && previousJourney) await cleanupOwnedJourneyPhoto(previousJourney);
    if (durablePhoto?.imageUri) {
      setFailedImageUris((current) => {
        const next = new Set(current);
        next.delete(durablePhoto.imageUri);
        return next;
      });
    }
    setSelectedId(result.journey.id);
    setEditingId(null);
    setFormErrors({});
    setPendingPhoto(null);
    setPhotoFeedback('');
    setScreen('detail');
  };

  const requestDelete = (journey) => {
    Alert.alert(
      t('journeys.deleteTitle'),
      t('journeys.deleteMessage', { country: journey.country, destination: journey.destination }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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

  const renderJourneyImage = (imageUri, imageStyle, accessibilityLabel = t('photo.existingA11y')) => {
    if (!imageUri) return null;
    if (failedImageUris.has(imageUri)) {
      return (
        <View accessibilityLabel={t('photo.unavailable')} style={[imageStyle, styles.imageFallback]}>
          <Text style={styles.imageFallbackText}>{t('photo.unavailable')}</Text>
        </View>
      );
    }
    return (
      <Image
        accessibilityLabel={accessibilityLabel}
        onError={() => setFailedImageUris((current) => new Set(current).add(imageUri))}
        source={{ uri: getDisplayImageUri(imageUri) }}
        style={imageStyle}
      />
    );
  };

  const renderPalette = (journey) => {
    if (journey.palette.length === 0) return null;

    return (
      <View style={styles.paletteRow}>
        {journey.palette.slice(0, 5).map((color) => (
          <Pressable
            accessibilityLabel={t('journeys.themeA11y', { color })}
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

  const formatAmount = (amount) => new Intl.NumberFormat(locale === 'zh-Hant' ? 'zh-Hant' : 'en', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  const renderExpenseSummary = (journey) => {
    const insights = getExpenseInsights(journey.expenses);
    const recordedTotal = Number.isFinite(journey.totalCost) ? journey.totalCost : null;
    const totalsDiffer = recordedTotal !== null && Math.abs(recordedTotal - insights.calculatedTotal) > 0.005;
    return (
      <View accessibilityLabel={t('expenses.title')} style={styles.expenseSummary}>
        <Text style={styles.expenseTitle}>{t('expenses.title')}</Text>
        {!insights.validExpenseCount ? <Text style={styles.expenseEmpty}>{t('expenses.empty')}</Text> : (
          <>
            <View style={styles.expenseHighlightRow}>
              <View style={styles.expenseHighlight}><Text style={styles.expenseLabel}>{t('expenses.calculatedTotal')}</Text><Text style={styles.expenseValue}>{formatAmount(insights.calculatedTotal)}</Text></View>
              <View style={styles.expenseHighlight}><Text style={styles.expenseLabel}>{t('expenses.entries')}</Text><Text style={styles.expenseValue}>{insights.validExpenseCount}</Text></View>
            </View>
            {totalsDiffer ? <View style={styles.expenseRow}><Text style={styles.expenseCategory}>{t('expenses.recordedTotal')}</Text><Text style={styles.expenseAmount}>{formatAmount(recordedTotal)}</Text></View> : null}
            <Text style={styles.expenseLabel}>{t('expenses.largestCategory')}</Text>
            <Text style={styles.expenseLargest}>{formatExpenseCategory(insights.largestCategory.category)} · {formatAmount(insights.largestCategory.amount)}</Text>
            <Text style={styles.expenseLabel}>{t('expenses.byCategory')}</Text>
            {insights.categoryTotals.map((item) => <View key={item.category} style={styles.expenseRow}><Text style={styles.expenseCategory}>{formatExpenseCategory(item.category)}</Text><Text style={styles.expenseAmount}>{formatAmount(item.amount)}</Text></View>)}
            <Text style={styles.expenseNote}>{t('expenses.derivedNote')}</Text>
          </>
        )}
      </View>
    );
  };

  const renderList = () => (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.kicker, { color: textColor }]}>{t('journeys.kicker')}</Text>
          <Text style={[styles.title, { color: textColor }]}>{t('journeys.title')}</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>{t('journeys.subtitle')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={openAddForm} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('journeys.add')}</Text>
        </Pressable>
      </View>

      {journeys.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('journeys.emptyTitle')}</Text>
          <Text style={styles.emptyCopy}>{t('journeys.emptyCopy')}</Text>
          <Pressable onPress={openAddForm} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('journeys.addJourney')}</Text>
          </Pressable>
        </View>
      ) : journeys.map((journey) => (
        <Pressable
          accessibilityHint={t('journeys.openHint')}
          key={journey.id}
          onPress={() => openDetail(journey)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          {renderJourneyImage(journey.imageUri, styles.image)}
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
          <Text style={styles.emptyTitle}>{t('journeys.notFound')}</Text>
          <Text style={styles.emptyCopy}>{t('journeys.notFoundCopy')}</Text>
          <Pressable onPress={openList} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('journeys.back')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <Pressable onPress={openList} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('journeys.myJourneys')}</Text>
        </Pressable>
        <View style={styles.detailCard}>
          {renderJourneyImage(selectedJourney.imageUri, styles.detailImage)}
          <Text style={styles.cardDate}>{selectedJourney.date}</Text>
          <Text style={styles.detailTitle}>{selectedJourney.destination}</Text>
          <Text style={styles.detailCountry}>{selectedJourney.country}</Text>
          <Text style={styles.detailNotes}>{selectedJourney.notes || t('journeys.noNotes')}</Text>
          {renderPalette(selectedJourney)}
          {renderExpenseSummary(selectedJourney)}
          <View style={styles.actionRow}>
            <Pressable onPress={() => openEditForm(selectedJourney)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable onPress={() => requestDelete(selectedJourney)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
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
      {formErrors[field] ? <Text style={styles.errorText}>{localizeMessage(formErrors[field])}</Text> : null}
    </View>
  );

  const renderForm = () => (
    <>
      <Pressable onPress={() => (editingId && selectedJourney ? setScreen('detail') : openList())} style={styles.backButton}>
        <Text style={styles.backButtonText}>← {t('common.cancel')}</Text>
      </Pressable>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? t('journeys.editTitle') : t('journeys.addTitle')}</Text>
        <Text style={styles.formSubtitle}>{t('journeys.required')}</Text>
        {renderField('destination', t('journeys.destination'), { placeholder: t('journeys.destinationPlaceholder') })}
        {renderField('country', t('journeys.country'), { placeholder: t('journeys.countryPlaceholder') })}
        {renderField('date', t('journeys.date'), { placeholder: t('journeys.datePlaceholder') })}
        {renderField('notes', t('journeys.notes'), { multiline: true, placeholder: t('journeys.notesPlaceholder') })}
        <View style={styles.photoField}>
          <Text style={styles.label}>{t('photo.field')}</Text>
          {pendingPhoto?.uri
            ? <Image accessibilityLabel={t('photo.previewA11y')} source={{ uri: pendingPhoto.uri }} style={styles.photoPreview} />
            : editingId && selectedJourney?.imageUri
              ? renderJourneyImage(selectedJourney.imageUri, styles.photoPreview)
              : <View accessibilityLabel={t('photo.noneSelected')} style={[styles.photoPreview, styles.imageFallback]}><Text style={styles.imageFallbackText}>{t('photo.noneSelected')}</Text></View>}
          <Pressable accessibilityLabel={editingId && selectedJourney?.imageSource === 'personal' ? t('photo.replace') : t('photo.choose')} accessibilityRole="button" onPress={choosePersonalPhoto} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>{editingId && selectedJourney?.imageSource === 'personal' ? t('photo.replace') : t('photo.choose')}</Text>
          </Pressable>
          {photoFeedback ? <Text accessibilityRole="alert" style={styles.photoFeedback}>{t(photoFeedback)}</Text> : null}
        </View>
        {formErrors.form ? <Text style={styles.errorText}>{localizeMessage(formErrors.form)}</Text> : null}
        <Pressable onPress={submitForm} style={styles.primaryButtonWide}>
          <Text style={styles.primaryButtonText}>{editingId ? t('journeys.saveChanges') : t('journeys.saveJourney')}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, { backgroundColor: activeTheme }]}>
      <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: activeTheme }]}
      keyboardShouldPersistTaps="handled"
      ref={scrollViewRef}
      style={[styles.screen, { backgroundColor: activeTheme }]}
    >
      <View accessibilityLabel={t('language.controlLabel')} accessibilityRole="tablist" style={styles.languageControl}>
        {[
          ['en', t('language.english')],
          ['zh-Hant', t('language.traditionalChinese')],
        ].map(([id, label]) => {
          const selected = locale === id;
          return (
            <Pressable
              accessibilityLabel={`${label}${selected ? `, ${t('language.selected')}` : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => setLocale(id)}
              style={[styles.languageButton, selected && styles.languageButtonSelected]}
            >
              <Text style={[styles.languageButtonText, selected && styles.languageButtonTextSelected]}>{label}{selected ? ' ✓' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      {languageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t(languageError)}</Text>
          <Pressable onPress={clearLanguageError}><Text style={styles.dismissText}>{t('common.dismiss')}</Text></Pressable>
        </View>
      ) : null}
      <View accessibilityLabel={t('nav.label')} accessibilityRole="tablist" style={styles.sectionNav}>
        {[
          ['discover', t('nav.discover')],
          ['dream', t('nav.dream')],
          ['journeys', t('nav.journeys')],
        ].map(([id, label]) => {
          const selected = section === id;
          return (
            <Pressable
              accessibilityLabel={`${label}${selected ? `, ${t('language.selected')}` : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => setSection(id)}
              style={[styles.sectionTab, selected && styles.sectionTabSelected]}
            >
              <Text style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {section === 'journeys' && storageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(storageError)}</Text>
          <Pressable onPress={() => setStorageError('')}>
            <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
      {section !== 'journeys' && dreamStorageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(dreamStorageError)}</Text>
          <Pressable onPress={() => setDreamStorageError('')}>
            <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
      {section === 'discover' || section === 'dream' ? (
        <SignatureScreen
          favouriteIds={favouriteIds}
          mode={section}
          onDestinationChange={resetScrollPosition}
          onRecommendationReady={scrollToDiscoveryResults}
          onSelectTheme={selectTheme}
          onToggleFavourite={toggleFavourite}
        />
      ) : null}
      {section === 'journeys' && screen === 'list' ? renderList() : null}
      {section === 'journeys' && screen === 'detail' ? renderDetail() : null}
      {section === 'journeys' && screen === 'form' ? renderForm() : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: 24 },
  languageControl: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderRadius: 8, flexDirection: 'row', marginBottom: 10, padding: 3 },
  languageButton: { alignItems: 'center', borderRadius: 6, justifyContent: 'center', minHeight: 38, minWidth: 58, paddingHorizontal: 10 },
  languageButtonSelected: { backgroundColor: '#17202A' },
  languageButtonText: { color: '#667085', fontSize: 12, fontWeight: '800' },
  languageButtonTextSelected: { color: '#FFFFFF' },
  sectionNav: { backgroundColor: '#FFFFFF', borderRadius: 9, flexDirection: 'row', gap: 4, marginBottom: 22, padding: 4 },
  sectionTab: { alignItems: 'center', borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 6, paddingVertical: 9 },
  sectionTabSelected: { backgroundColor: '#17202A' },
  sectionTabText: { color: '#667085', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  sectionTabTextSelected: { color: '#FFFFFF' },
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
  imageFallback: { alignItems: 'center', backgroundColor: '#E8EEF2', justifyContent: 'center' },
  imageFallbackText: { color: '#667085', fontSize: 13, fontWeight: '700' },
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
  expenseSummary: { backgroundColor: '#F4F7F8', borderRadius: 8, marginTop: 24, padding: 16 },
  expenseTitle: { color: '#17202A', fontSize: 16, fontWeight: '900', letterSpacing: 0.8, marginBottom: 12 },
  expenseHighlightRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  expenseHighlight: { flex: 1 },
  expenseLabel: { color: '#667085', fontSize: 10, fontWeight: '900', letterSpacing: 0.6, marginTop: 10, textTransform: 'uppercase' },
  expenseValue: { color: '#17202A', fontSize: 22, fontWeight: '900', marginTop: 3 },
  expenseLargest: { color: '#8D4F5B', fontSize: 16, fontWeight: '800', marginTop: 4 },
  expenseRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 8 },
  expenseCategory: { color: '#344054', flex: 1, fontSize: 13, fontWeight: '700' },
  expenseAmount: { color: '#17202A', fontSize: 13, fontWeight: '900' },
  expenseNote: { color: '#667085', fontSize: 11, lineHeight: 16, marginTop: 14 },
  expenseEmpty: { color: '#667085', fontSize: 13, lineHeight: 19 },
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
  photoField: { marginBottom: 18 },
  photoPreview: { aspectRatio: 1.55, backgroundColor: '#E8EEF2', borderRadius: 8, marginBottom: 10, width: '100%' },
  photoFeedback: { color: '#667085', fontSize: 13, lineHeight: 18, marginTop: 8 },
  secondaryButtonWide: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 8, padding: 13 },
  inputError: { borderColor: '#C62828' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 5 },
  errorBanner: { alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: 8, flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 16, padding: 12 },
  errorBannerText: { color: '#664D03', flex: 1, fontSize: 13 },
  dismissText: { color: '#664D03', fontSize: 13, fontWeight: '800' },
});
