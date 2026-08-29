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
import PhotoPaletteExtractor from '../components/PhotoPaletteExtractor.js';
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
import { addExpense, deleteExpense, updateExpense } from '../utils/expenses.js';
import { buildColourPassport } from '../utils/colourPassport.js';
import { buildPreferenceProfile } from '../utils/preferenceProfile.js';
import {
  addRecentVibeId,
  loadRecentVibeIds,
  normalizeRecentVibeIds,
  saveRecentVibeIds,
} from '../utils/recentVibes.js';
import {
  deriveDreamMemoryDestinationIds,
  getDestinationJourneyPrefill,
  isJourneyIdentityField,
} from '../utils/journeyDestination.js';
import {
  normalizePhotoPaletteSuggestion,
  resolvePhotoPalette,
  validateJourneyPalette,
} from '../utils/journeyPaletteSuggestion.js';

const ACTIVE_THEME_KEY = '@wanderlust_palette/active_theme';
const DEFAULT_THEME = mockData[0]?.palette[0] || '#F7FAFC';
const EMPTY_FORM = { destination: '', country: '', date: '', notes: '' };
const EMPTY_EXPENSE_FORM = { amount: '', category: '', id: '' };

export default function HomeScreen() {
  const {
    clearLanguageError,
    formatCountry,
    formatDestination,
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
  const [hasStoredJourneys, setHasStoredJourneys] = useState(false);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [screen, setScreen] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formDestinationId, setFormDestinationId] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [pendingDurablePhoto, setPendingDurablePhoto] = useState(null);
  const pendingDurablePhotoRef = useRef(null);
  const [draftJourneyId, setDraftJourneyId] = useState('');
  const [photoExtractionRequest, setPhotoExtractionRequest] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState('');
  const [formPalette, setFormPalette] = useState([]);
  const [photoPaletteSuggestion, setPhotoPaletteSuggestion] = useState([]);
  const [paletteFeedback, setPaletteFeedback] = useState('');
  const [paletteHasManualEdits, setPaletteHasManualEdits] = useState(false);
  const paletteHasManualEditsRef = useRef(false);
  const [failedImageUris, setFailedImageUris] = useState(() => new Set());
  const [storageError, setStorageError] = useState('');
  const [section, setSection] = useState('discover');
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [dreamStorageError, setDreamStorageError] = useState('');
  const [expenseForm, setExpenseForm] = useState(null);
  const [expenseErrors, setExpenseErrors] = useState({});
  const [recentVibeIds, setRecentVibeIds] = useState([]);
  const recentVibeIdsRef = useRef([]);
  const recentVibeHydratedRef = useRef(false);
  const pendingRecentVibeIdsRef = useRef([]);
  const recentVibeSaveQueueRef = useRef(Promise.resolve());
  const [recentVibeStorageError, setRecentVibeStorageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAppState = async () => {
      const [journeyResult, savedThemeResult, favouriteResult, recentVibeResult] = await Promise.all([
        loadJourneys(sampleJourneys),
        AsyncStorage.getItem(ACTIVE_THEME_KEY).catch(() => null),
        loadFavouriteIds(),
        loadRecentVibeIds(),
      ]);

      if (!isMounted) return;
      setJourneys(journeyResult.journeys);
      setHasStoredJourneys(journeyResult.hasStoredJourneys);
      setStorageError(journeyResult.error || '');
      setFavouriteIds(favouriteResult.ids);
      setDreamStorageError(favouriteResult.error || '');
      const pendingIds = pendingRecentVibeIdsRef.current;
      const hydratedIds = normalizeRecentVibeIds([...pendingIds, ...recentVibeResult.ids]);
      recentVibeHydratedRef.current = true;
      pendingRecentVibeIdsRef.current = [];
      recentVibeIdsRef.current = hydratedIds;
      setRecentVibeIds(hydratedIds);
      setRecentVibeStorageError(recentVibeResult.error || '');
      if (pendingIds.length) {
        recentVibeSaveQueueRef.current = recentVibeSaveQueueRef.current
          .then(() => saveRecentVibeIds(hydratedIds))
          .then((result) => setRecentVibeStorageError(result.error || ''));
      }
      if (savedThemeResult) setActiveTheme(savedThemeResult);
    };

    loadAppState();
    return () => {
      isMounted = false;
    };
  }, [sampleJourneys]);

  useEffect(() => () => {
    const stagedPhoto = pendingDurablePhotoRef.current;
    pendingDurablePhotoRef.current = null;
    if (stagedPhoto) cleanupOwnedJourneyPhoto(stagedPhoto);
  }, []);

  const selectedJourney = journeys.find((journey) => journey.id === selectedId) || null;
  const memoryDestinationIds = useMemo(
    () => deriveDreamMemoryDestinationIds(favouriteIds, journeys),
    [favouriteIds, journeys],
  );
  const personalizationJourneys = useMemo(
    () => (hasStoredJourneys ? journeys : []),
    [hasStoredJourneys, journeys],
  );
  const preferenceProfile = useMemo(() => buildPreferenceProfile({
    recentVibeIds,
    dreamDestinationIds: favouriteIds,
    journeys: personalizationJourneys,
  }), [favouriteIds, personalizationJourneys, recentVibeIds]);
  const colourPassport = useMemo(() => buildColourPassport({
    profile: preferenceProfile,
    journeys: personalizationJourneys,
  }), [personalizationJourneys, preferenceProfile]);
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
    if (result.ok) {
      setJourneys(nextJourneys);
      setHasStoredJourneys(true);
    }
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

  const recordRecentVibe = useCallback((vibeId) => {
    const nextIds = addRecentVibeId(recentVibeIdsRef.current, vibeId);
    recentVibeIdsRef.current = nextIds;
    setRecentVibeIds(nextIds);
    if (!recentVibeHydratedRef.current) {
      pendingRecentVibeIdsRef.current = addRecentVibeId(pendingRecentVibeIdsRef.current, vibeId);
      return;
    }
    recentVibeSaveQueueRef.current = recentVibeSaveQueueRef.current
      .then(() => saveRecentVibeIds(nextIds))
      .then((result) => setRecentVibeStorageError(result.error || ''));
  }, []);

  const openList = () => {
    setScreen('list');
    setSelectedId(null);
    setEditingId(null);
    setFormErrors({});
    setExpenseForm(null);
    setExpenseErrors({});
  };

  const openDetail = (journey) => {
    setSelectedId(journey.id);
    setExpenseForm(null);
    setExpenseErrors({});
    setScreen('detail');
  };

  const openAddForm = (prefill = null) => {
    const previousStagedPhoto = pendingDurablePhotoRef.current;
    pendingDurablePhotoRef.current = null;
    if (previousStagedPhoto) cleanupOwnedJourneyPhoto(previousStagedPhoto);
    const journeyId = createLocalJourneyId();
    setEditingId(null);
    setDraftJourneyId(journeyId);
    setForm({
      ...EMPTY_FORM,
      country: prefill?.country || '',
      destination: prefill?.destination || '',
    });
    setFormDestinationId(prefill?.destinationId || '');
    setFormPalette([]);
    setPhotoPaletteSuggestion([]);
    setPaletteFeedback('');
    setPaletteHasManualEdits(false);
    paletteHasManualEditsRef.current = false;
    setFormErrors({});
    setPendingDurablePhoto(null);
    setPhotoExtractionRequest(null);
    setPhotoFeedback('');
    setExpenseForm(null);
    setExpenseErrors({});
    setScreen('form');
  };

  const openAddFormForDestination = (destinationId) => {
    const prefill = getDestinationJourneyPrefill(destinationId);
    if (!prefill) return;
    setSection('journeys');
    openAddForm(prefill);
  };

  const openEditForm = (journey) => {
    setEditingId(journey.id);
    setDraftJourneyId(journey.id);
    setForm({
      destination: journey.destination,
      country: journey.country,
      date: journey.date,
      notes: journey.notes,
    });
    setFormDestinationId(journey.destinationId || '');
    setFormPalette(journey.palette);
    setPhotoPaletteSuggestion([]);
    setPaletteFeedback('');
    setPaletteHasManualEdits(false);
    paletteHasManualEditsRef.current = false;
    setFormErrors({});
    setPendingDurablePhoto(null);
    pendingDurablePhotoRef.current = null;
    setPhotoExtractionRequest(null);
    setPhotoFeedback('');
    setExpenseForm(null);
    setExpenseErrors({});
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
      const targetJourneyId = editingId || draftJourneyId || createLocalJourneyId();
      const durablePhoto = await copyPersonalJourneyPhoto(pickerResult.asset, targetJourneyId);
      if (!durablePhoto.ok) {
        setPhotoFeedback('photo.saveFailed');
        return;
      }

      const previousStagedPhoto = pendingDurablePhotoRef.current;
      pendingDurablePhotoRef.current = durablePhoto;
      setPendingDurablePhoto(durablePhoto);
      setPhotoPaletteSuggestion([]);
      setPaletteFeedback('photo.coloursExtracting');
      setPhotoExtractionRequest({
        height: pickerResult.asset.height,
        id: `${Date.now()}-${durablePhoto.imageUri}`,
        uri: durablePhoto.imageUri,
        width: pickerResult.asset.width,
      });
      if (previousStagedPhoto) await cleanupOwnedJourneyPhoto(previousStagedPhoto);
    } catch (error) {
      setPhotoFeedback('photo.unavailableFeedback');
    }
  };

  const handlePhotoPaletteComplete = (extraction) => {
    if (!extraction?.ok) {
      setPhotoPaletteSuggestion([]);
      setPaletteFeedback('photo.coloursUnavailable');
      return;
    }

    const suggestion = normalizePhotoPaletteSuggestion(extraction.colors);
    if (suggestion.length !== 3) {
      setPhotoPaletteSuggestion([]);
      setPaletteFeedback('photo.coloursUnavailable');
      return;
    }

    setPhotoPaletteSuggestion(suggestion);
    setPaletteFeedback('');
    setFormPalette((current) => resolvePhotoPalette({
      currentPalette: current,
      suggestedPalette: suggestion,
      isEditing: Boolean(editingId),
      hasManualEdits: paletteHasManualEditsRef.current,
    }).palette);
  };

  const acceptPhotoPalette = () => {
    const resolution = resolvePhotoPalette({
      currentPalette: formPalette,
      suggestedPalette: photoPaletteSuggestion,
      isEditing: Boolean(editingId),
      hasManualEdits: paletteHasManualEdits,
      acceptSuggestion: true,
    });
    if (resolution.applied) {
      setFormPalette(resolution.palette);
      setPaletteHasManualEdits(true);
      paletteHasManualEditsRef.current = true;
      setFormErrors((current) => ({ ...current, palette: undefined }));
    }
  };

  const updatePaletteColor = (index, value) => {
    setFormPalette((current) => {
      const next = current.slice();
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
    setPaletteHasManualEdits(true);
    paletteHasManualEditsRef.current = true;
    setFormErrors((current) => ({ ...current, palette: undefined }));
  };

  const cancelJourneyForm = async () => {
    const stagedPhoto = pendingDurablePhotoRef.current;
    pendingDurablePhotoRef.current = null;
    setPendingDurablePhoto(null);
    setPhotoExtractionRequest(null);
    if (stagedPhoto) await cleanupOwnedJourneyPhoto(stagedPhoto);
    if (editingId && selectedJourney) setScreen('detail');
    else openList();
  };

  const submitForm = async () => {
    const paletteValidation = validateJourneyPalette(formPalette);
    if (!paletteValidation.valid) {
      setFormErrors((current) => ({ ...current, palette: 'invalid' }));
      return;
    }
    const journeyInput = {
      ...form,
      destinationId: formDestinationId,
      palette: paletteValidation.palette,
    };
    const newJourneyId = editingId || draftJourneyId || createLocalJourneyId();
    const durablePhoto = pendingDurablePhoto;
    let result = editingId
      ? updateJourney(journeys, editingId, journeyInput)
      : addJourney(journeys, journeyInput, { id: newJourneyId });

    if (Object.keys(result.errors).length > 0) {
      setFormErrors(result.errors);
      return;
    }

    if (!result.journey) {
      setFormErrors({ form: 'This journey is no longer available.' });
      return;
    }
    const targetJourneyId = result.journey.id;

    if (durablePhoto?.ok) {
      const inputWithPhoto = {
        ...journeyInput,
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
      setFormErrors({ form: persistence.error });
      return;
    }
    pendingDurablePhotoRef.current = null;
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
    setPendingDurablePhoto(null);
    setPhotoExtractionRequest(null);
    setPhotoPaletteSuggestion([]);
    setPaletteFeedback('');
    setPhotoFeedback('');
    setFormDestinationId('');
    setScreen('detail');
  };

  const startAddExpense = () => {
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setExpenseErrors({});
  };

  const startEditExpense = (expense) => {
    setExpenseForm({
      amount: String(expense.amount),
      category: expense.category,
      id: expense.id,
    });
    setExpenseErrors({});
  };

  const updateExpenseField = (field, value) => {
    setExpenseForm((current) => ({ ...current, [field]: value }));
    setExpenseErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const cancelExpenseForm = () => {
    setExpenseForm(null);
    setExpenseErrors({});
  };

  const saveExpense = async () => {
    if (!selectedJourney || !expenseForm) return;
    const result = expenseForm.id
      ? updateExpense(selectedJourney.expenses, expenseForm.id, expenseForm)
      : addExpense(selectedJourney.expenses, expenseForm);
    if (Object.keys(result.errors).length > 0) {
      setExpenseErrors(result.errors);
      return;
    }
    if (expenseForm.id && !result.found) {
      setExpenseErrors({ form: 'This expense is no longer available.' });
      return;
    }
    const journeyResult = updateJourney(journeys, selectedJourney.id, {
      ...selectedJourney,
      expenses: result.expenses,
    });
    if (!journeyResult.journey) {
      setExpenseErrors({ form: 'This journey is no longer available.' });
      return;
    }
    const persistence = await persistJourneys(journeyResult.journeys);
    if (!persistence.ok) {
      setExpenseErrors({ form: persistence.error });
      return;
    }
    cancelExpenseForm();
  };

  const requestDeleteExpense = (expense) => {
    if (!selectedJourney) return;
    Alert.alert(
      t('expenses.deleteTitle'),
      t('expenses.deleteMessage', { amount: formatAmount(expense.amount), category: expense.category }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const result = deleteExpense(selectedJourney.expenses, expense.id);
            if (!result.deleted) return;
            const journeyResult = updateJourney(journeys, selectedJourney.id, {
              ...selectedJourney,
              expenses: result.expenses,
            });
            if (!journeyResult.journey) return;
            const persistence = await persistJourneys(journeyResult.journeys);
            if (persistence.ok && expenseForm?.id === expense.id) cancelExpenseForm();
          },
        },
      ],
    );
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
    if (isJourneyIdentityField(field)) setFormDestinationId('');
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
          <View
            accessibilityLabel={t('journeys.paletteColourA11y', { color })}
            key={color}
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

  const renderExpenseManager = (journey) => (
    <View style={styles.expenseManager}>
      <View style={styles.expenseManagerHeader}>
        <View style={styles.expenseManagerCopy}>
          <Text style={styles.expenseManagerTitle}>{t('expenses.listTitle')}</Text>
          <Text style={styles.expenseManagerSubtitle}>{t('expenses.listHelp')}</Text>
        </View>
        {!expenseForm ? (
          <Pressable accessibilityRole="button" onPress={startAddExpense} style={styles.compactButton}>
            <Text style={styles.compactButtonText}>{t('expenses.add')}</Text>
          </Pressable>
        ) : null}
      </View>
      {journey.expenses.length ? journey.expenses.map((expense) => (
        <View key={expense.id} style={styles.expenseItem}>
          <View style={styles.expenseItemCopy}>
            <Text style={styles.expenseItemCategory}>{formatExpenseCategory(expense.category)}</Text>
            <Text style={styles.expenseItemAmount}>{formatAmount(expense.amount)}</Text>
          </View>
          <View style={styles.expenseItemActions}>
            <Pressable accessibilityLabel={t('expenses.editA11y', { category: expense.category })} accessibilityRole="button" onPress={() => startEditExpense(expense)} style={styles.smallActionButton}>
              <Text style={styles.smallActionText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t('expenses.deleteA11y', { category: expense.category })} accessibilityRole="button" onPress={() => requestDeleteExpense(expense)} style={[styles.smallActionButton, styles.smallDeleteButton]}>
              <Text style={styles.smallDeleteText}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </View>
      )) : <Text style={styles.expenseEmpty}>{t('expenses.noEntries')}</Text>}
      {expenseForm ? (
        <View style={styles.expenseEditor}>
          <Text style={styles.expenseEditorTitle}>{t(expenseForm.id ? 'expenses.editTitle' : 'expenses.addTitle')}</Text>
          <Text style={styles.label}>{t('expenses.category')}</Text>
          <TextInput
            accessibilityLabel={t('expenses.category')}
            autoCorrect={false}
            maxLength={80}
            onChangeText={(value) => updateExpenseField('category', value)}
            placeholder={t('expenses.categoryPlaceholder')}
            style={[styles.input, expenseErrors.category && styles.inputError]}
            value={expenseForm.category}
          />
          {expenseErrors.category ? <Text style={styles.errorText}>{localizeMessage(expenseErrors.category)}</Text> : null}
          <Text style={[styles.label, styles.expenseAmountLabel]}>{t('expenses.amount')}</Text>
          <TextInput
            accessibilityLabel={t('expenses.amount')}
            keyboardType="decimal-pad"
            onChangeText={(value) => updateExpenseField('amount', value)}
            placeholder={t('expenses.amountPlaceholder')}
            style={[styles.input, expenseErrors.amount && styles.inputError]}
            value={expenseForm.amount}
          />
          {expenseErrors.amount ? <Text style={styles.errorText}>{localizeMessage(expenseErrors.amount)}</Text> : null}
          {expenseErrors.form ? <Text style={styles.errorText}>{localizeMessage(expenseErrors.form)}</Text> : null}
          <View style={styles.expenseEditorActions}>
            <Pressable accessibilityRole="button" onPress={cancelExpenseForm} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={saveExpense} style={styles.primaryButtonFlex}>
              <Text style={styles.primaryButtonText}>{t(expenseForm.id ? 'expenses.saveChanges' : 'expenses.save')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderList = () => (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.kicker, { color: textColor }]}>{t('journeys.kicker')}</Text>
          <Text style={[styles.title, { color: textColor }]}>{t('journeys.title')}</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>{t('journeys.subtitle')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => openAddForm()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('journeys.add')}</Text>
        </Pressable>
      </View>

      {journeys.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('journeys.emptyTitle')}</Text>
          <Text style={styles.emptyCopy}>{t('journeys.emptyCopy')}</Text>
          <Pressable onPress={() => openAddForm()} style={styles.primaryButton}>
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
        <View style={[
          styles.detailCard,
          selectedJourney.palette[0] ? { borderTopColor: selectedJourney.palette[0], borderTopWidth: 8 } : null,
        ]}>
          {renderJourneyImage(selectedJourney.imageUri, styles.detailImage)}
          <Text style={styles.cardDate}>{selectedJourney.date}</Text>
          <Text style={styles.detailTitle}>{selectedJourney.destination}</Text>
          <Text style={styles.detailCountry}>{selectedJourney.country}</Text>
          <Text style={styles.detailNotes}>{selectedJourney.notes || t('journeys.noNotes')}</Text>
          {renderPalette(selectedJourney)}
          {renderExpenseManager(selectedJourney)}
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
      <Pressable onPress={cancelJourneyForm} style={styles.backButton}>
        <Text style={styles.backButtonText}>← {t('common.cancel')}</Text>
      </Pressable>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? t('journeys.editTitle') : t('journeys.addTitle')}</Text>
        <Text style={styles.formSubtitle}>{t('journeys.required')}</Text>
        {formDestinationId ? (() => {
          const linked = getDestinationJourneyPrefill(formDestinationId);
          return linked ? (
            <Text style={styles.linkedDestination}>
              {t('journeys.linkedDestination', {
                country: formatCountry(linked.countryCode, linked.country),
                destination: formatDestination(linked.destinationId, linked.destination),
              })}
            </Text>
          ) : null;
        })() : null}
        {renderField('destination', t('journeys.destination'), { placeholder: t('journeys.destinationPlaceholder') })}
        {renderField('country', t('journeys.country'), { placeholder: t('journeys.countryPlaceholder') })}
        {renderField('date', t('journeys.date'), { placeholder: t('journeys.datePlaceholder') })}
        {renderField('notes', t('journeys.notes'), { multiline: true, placeholder: t('journeys.notesPlaceholder') })}
        <View style={styles.photoField}>
          <Text style={styles.label}>{t('photo.field')}</Text>
          {pendingDurablePhoto?.imageUri
            ? <Image accessibilityLabel={t('photo.previewA11y')} source={{ uri: pendingDurablePhoto.imageUri }} style={styles.photoPreview} />
            : editingId && selectedJourney?.imageUri
              ? renderJourneyImage(selectedJourney.imageUri, styles.photoPreview)
              : <View accessibilityLabel={t('photo.noneSelected')} style={[styles.photoPreview, styles.imageFallback]}><Text style={styles.imageFallbackText}>{t('photo.noneSelected')}</Text></View>}
          <Pressable accessibilityLabel={editingId && selectedJourney?.imageSource === 'personal' ? t('photo.replace') : t('photo.choose')} accessibilityRole="button" onPress={choosePersonalPhoto} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>{editingId && selectedJourney?.imageSource === 'personal' ? t('photo.replace') : t('photo.choose')}</Text>
          </Pressable>
          {photoFeedback ? <Text accessibilityRole="alert" style={styles.photoFeedback}>{t(photoFeedback)}</Text> : null}
          {photoExtractionRequest ? (
            <PhotoPaletteExtractor
              key={photoExtractionRequest.id}
              onComplete={handlePhotoPaletteComplete}
              request={photoExtractionRequest}
            />
          ) : null}
          {paletteFeedback ? <Text accessibilityRole="status" style={styles.photoFeedback}>{t(paletteFeedback)}</Text> : null}
        </View>
        {photoPaletteSuggestion.length === 3 ? (
          <View style={styles.suggestedPalette}>
            <Text style={styles.label}>{t('photo.coloursFromPhoto')}</Text>
            <View style={styles.suggestedPaletteRow}>
              {photoPaletteSuggestion.map((color) => (
                <View accessibilityLabel={t('journeys.paletteColourA11y', { color })} key={color} style={[styles.suggestedSwatch, { backgroundColor: color }]} />
              ))}
            </View>
            <Pressable onPress={acceptPhotoPalette} style={styles.secondaryButtonWide}>
              <Text style={styles.secondaryButtonText}>{t('photo.useColours')}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.paletteEditor}>
          <Text style={styles.label}>{t('photo.paletteField')}</Text>
          <Text style={styles.paletteHelp}>{t('photo.paletteHelp')}</Text>
          {Array.from({ length: Math.max(3, Math.min(5, formPalette.length)) }, (_, index) => index).map((index) => {
            const color = formPalette[index] || '';
            const validColor = /^#[0-9A-F]{6}$/i.test(color);
            return (
              <View key={index} style={styles.paletteInputRow}>
                <View style={[styles.paletteInputSwatch, validColor ? { backgroundColor: color } : null]} />
                <TextInput
                  accessibilityLabel={t('photo.paletteColour', { number: index + 1 })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  onChangeText={(value) => updatePaletteColor(index, value)}
                  placeholder="#RRGGBB"
                  style={styles.paletteInput}
                  value={color}
                />
              </View>
            );
          })}
          {formErrors.palette ? <Text style={styles.errorText}>{t('photo.invalidPalette')}</Text> : null}
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
      {section === 'discover' && recentVibeStorageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(recentVibeStorageError)}</Text>
          <Pressable onPress={() => setRecentVibeStorageError('')}>
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
          colourPassport={colourPassport}
          favouriteIds={favouriteIds}
          memoryDestinationIds={memoryDestinationIds}
          mode={section}
          onAddJourney={openAddFormForDestination}
          onDestinationChange={resetScrollPosition}
          onRecommendationReady={scrollToDiscoveryResults}
          onSelectTheme={selectTheme}
          onToggleFavourite={toggleFavourite}
          onVibeSelect={recordRecentVibe}
          preferenceProfile={preferenceProfile}
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
  expenseManager: { borderColor: '#DCE4E8', borderRadius: 8, borderWidth: 1, marginTop: 24, padding: 16 },
  expenseManagerHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  expenseManagerCopy: { flex: 1 },
  expenseManagerTitle: { color: '#17202A', fontSize: 18, fontWeight: '900' },
  expenseManagerSubtitle: { color: '#667085', fontSize: 12, lineHeight: 17, marginTop: 3 },
  compactButton: { backgroundColor: '#17202A', borderRadius: 7, minHeight: 42, paddingHorizontal: 13, paddingVertical: 11 },
  compactButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  expenseItem: { alignItems: 'center', borderTopColor: '#E4E9EC', borderTopWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 14, paddingTop: 14 },
  expenseItemCopy: { flex: 1 },
  expenseItemCategory: { color: '#344054', fontSize: 14, fontWeight: '800' },
  expenseItemAmount: { color: '#17202A', fontSize: 18, fontWeight: '900', marginTop: 2 },
  expenseItemActions: { flexDirection: 'row', gap: 7 },
  smallActionButton: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 52, paddingHorizontal: 9 },
  smallActionText: { color: '#17202A', fontSize: 11, fontWeight: '800' },
  smallDeleteButton: { backgroundColor: '#FDECEC' },
  smallDeleteText: { color: '#A61B1B', fontSize: 11, fontWeight: '800' },
  expenseEditor: { backgroundColor: '#F4F7F8', borderRadius: 8, marginTop: 16, padding: 14 },
  expenseEditorTitle: { color: '#17202A', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  expenseAmountLabel: { marginTop: 14 },
  expenseEditorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButtonFlex: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, flex: 1, padding: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 8, flex: 1, padding: 13 },
  secondaryButtonText: { color: '#17202A', fontWeight: '700' },
  deleteButton: { alignItems: 'center', backgroundColor: '#FDECEC', borderRadius: 8, flex: 1, padding: 13 },
  deleteButtonText: { color: '#A61B1B', fontWeight: '700' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 22 },
  formTitle: { color: '#17202A', fontSize: 30, fontWeight: '800' },
  formSubtitle: { color: '#667085', fontSize: 14, marginBottom: 22, marginTop: 6 },
  linkedDestination: { backgroundColor: '#E8F1EC', borderRadius: 7, color: '#28533C', fontSize: 13, fontWeight: '800', marginBottom: 18, overflow: 'hidden', padding: 11 },
  field: { marginBottom: 18 },
  label: { color: '#344054', fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E0', borderRadius: 8, borderWidth: 1, color: '#17202A', fontSize: 16, paddingHorizontal: 12, paddingVertical: 11 },
  notesInput: { minHeight: 110, textAlignVertical: 'top' },
  photoField: { marginBottom: 18 },
  photoPreview: { aspectRatio: 1.55, backgroundColor: '#E8EEF2', borderRadius: 8, marginBottom: 10, width: '100%' },
  photoFeedback: { color: '#667085', fontSize: 13, lineHeight: 18, marginTop: 8 },
  suggestedPalette: { backgroundColor: '#F4F7F8', borderRadius: 8, marginBottom: 18, padding: 14 },
  suggestedPaletteRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  suggestedSwatch: { borderColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, flex: 1, height: 42 },
  paletteEditor: { marginBottom: 18 },
  paletteHelp: { color: '#667085', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  paletteInputRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
  paletteInputSwatch: { backgroundColor: '#E8EEF2', borderColor: '#CBD5E0', borderRadius: 5, borderWidth: 1, height: 34, width: 34 },
  paletteInput: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E0', borderRadius: 8, borderWidth: 1, color: '#17202A', flex: 1, fontSize: 15, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryButtonWide: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 8, padding: 13 },
  inputError: { borderColor: '#C62828' },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 5 },
  errorBanner: { alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: 8, flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 16, padding: 12 },
  errorBannerText: { color: '#664D03', flex: 1, fontSize: 13 },
  dismissText: { color: '#664D03', fontSize: 13, fontWeight: '800' },
});
