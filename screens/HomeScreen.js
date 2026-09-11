import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import mockData from '../assets/mockData.json';
import SignatureScreen from './SignatureScreen.js';
import PhotoPaletteExtractor from '../components/PhotoPaletteExtractor.js';
import { useLanguage } from '../context/LanguageContext.js';
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
import getHybridNavigationVisibility from '../utils/hybridNavigation.js';
import getJourneyPaletteTheme from '../utils/journeyPaletteTheme.js';

const APP_BACKGROUND = '#F4F0E8';
const EDITORIAL_SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const EMPTY_FORM = { destination: '', country: '', date: '', notes: '' };
const EMPTY_EXPENSE_FORM = { amount: '', category: '', id: '' };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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
  const currentScrollYRef = useRef(0);
  const destinationReturnYRef = useRef(0);
  const journeyReturnYRef = useRef(0);
  const destinationDetailRef = useRef(false);
  const pendingNavigationScrollYRef = useRef(null);
  const topNavigationBoundaryRef = useRef(null);
  const topNavigationHeightRef = useRef(0);
  const bottomNavigationVisibleRef = useRef(false);
  const sampleJourneys = useMemo(() => normalizeJourneys(mockData), []);
  const [journeys, setJourneys] = useState(sampleJourneys);
  const [hasStoredJourneys, setHasStoredJourneys] = useState(false);
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
  const paletteRevealOpacity = useRef(new Animated.Value(0)).current;
  const paletteRevealTranslateY = useRef(new Animated.Value(8)).current;
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
  const [isDestinationDetail, setIsDestinationDetail] = useState(false);
  const [isBottomNavigationVisible, setIsBottomNavigationVisible] = useState(false);
  const [bottomNavigationHeight, setBottomNavigationHeight] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadAppState = async () => {
      const [journeyResult, favouriteResult, recentVibeResult] = await Promise.all([
        loadJourneys(sampleJourneys),
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
  const journeyPaletteTheme = useMemo(
    () => getJourneyPaletteTheme(selectedJourney?.palette),
    [selectedJourney?.palette],
  );
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
  const isTopLevelPresentation = !isDestinationDetail
    && (section !== 'journeys' || screen === 'list');
  const isJourneyDetailPresentation = section === 'journeys' && screen === 'detail';
  const scrollToDiscoveryResults = useCallback((y) => {
    scrollViewRef.current?.scrollTo({ animated: true, y: Math.max(0, y - 8) });
  }, []);
  const navigateToSection = useCallback((nextSection) => {
    if (nextSection === section && !destinationDetailRef.current) {
      pendingNavigationScrollYRef.current = null;
      scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
      currentScrollYRef.current = 0;
      return;
    }
    destinationDetailRef.current = false;
    pendingNavigationScrollYRef.current = 0;
    setIsDestinationDetail(false);
    setSection(nextSection);
  }, [section]);
  const handleDestinationStateChange = useCallback((isOpen) => {
    if (isOpen) {
      if (!destinationDetailRef.current) {
        destinationReturnYRef.current = currentScrollYRef.current;
        pendingNavigationScrollYRef.current = 0;
        destinationDetailRef.current = true;
        setIsDestinationDetail(true);
        return;
      }
      scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
      currentScrollYRef.current = 0;
      return;
    }
    destinationDetailRef.current = false;
    pendingNavigationScrollYRef.current = destinationReturnYRef.current;
    setIsDestinationDetail(false);
  }, []);

  useLayoutEffect(() => {
    const targetY = pendingNavigationScrollYRef.current;
    if (targetY === null) return;
    pendingNavigationScrollYRef.current = null;
    scrollViewRef.current?.scrollTo({ animated: false, y: targetY });
    currentScrollYRef.current = targetY;
  }, [isDestinationDetail, screen, section, selectedId]);

  const updateBottomNavigationVisibility = useCallback((scrollY) => {
    const nextVisible = isTopLevelPresentation && getHybridNavigationVisibility({
      isVisible: bottomNavigationVisibleRef.current,
      scrollY,
      topNavigationBoundary: topNavigationBoundaryRef.current,
      topNavigationHeight: topNavigationHeightRef.current,
    });
    if (nextVisible === bottomNavigationVisibleRef.current) return;
    bottomNavigationVisibleRef.current = nextVisible;
    setIsBottomNavigationVisible(nextVisible);
  }, [isTopLevelPresentation]);

  const handleAppScroll = useCallback((event) => {
    const scrollY = Math.max(0, event.nativeEvent.contentOffset.y);
    currentScrollYRef.current = scrollY;
    updateBottomNavigationVisibility(scrollY);
  }, [updateBottomNavigationVisibility]);

  const handleTopNavigationLayout = useCallback((event) => {
    const { height, y } = event.nativeEvent.layout;
    if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(y)) return;
    topNavigationHeightRef.current = height;
    topNavigationBoundaryRef.current = y + height;
    updateBottomNavigationVisibility(currentScrollYRef.current);
  }, [updateBottomNavigationVisibility]);

  const handleBottomNavigationLayout = useCallback((event) => {
    const { height } = event.nativeEvent.layout;
    if (Number.isFinite(height) && height > 0) setBottomNavigationHeight(height);
  }, []);

  useEffect(() => {
    updateBottomNavigationVisibility(currentScrollYRef.current);
  }, [isTopLevelPresentation, section, updateBottomNavigationVisibility]);

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
    pendingNavigationScrollYRef.current = screen === 'detail' ? journeyReturnYRef.current : 0;
    setScreen('list');
    setSelectedId(null);
    setEditingId(null);
    setFormErrors({});
    setExpenseForm(null);
    setExpenseErrors({});
  };

  const openDetail = (journey) => {
    if (screen === 'list') journeyReturnYRef.current = currentScrollYRef.current;
    pendingNavigationScrollYRef.current = 0;
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
    navigateToSection('journeys');
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

  const handlePersonalPhotoResult = async (result) => {
    const pickerResult = normalizePhotoPickerResult(result);
    if (pickerResult.status === 'cancelled') return;
    if (pickerResult.status !== 'selected') {
      setPhotoFeedback('photo.invalidSelection');
      return;
    }

    setPhotoFeedback('');
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
  };

  const chooseFromLibrary = async () => {
    setPhotoFeedback('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoFeedback('photo.permissionDenied');
        return;
      }

      await handlePersonalPhotoResult(await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        mediaTypes: ['images'],
        quality: 1,
        selectionLimit: 1,
      }));
    } catch (error) {
      setPhotoFeedback('photo.unavailableFeedback');
    }
  };

  const takePersonalPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoFeedback('photo.cameraPermissionDenied');
        return;
      }

      await handlePersonalPhotoResult(await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 1,
      }));
    } catch (error) {
      setPhotoFeedback('photo.cameraUnavailable');
    }
  };

  const choosePersonalPhoto = () => {
    Alert.alert(t('photo.sourceTitle'), t('photo.sourcePrompt'), [
      { text: t('photo.chooseFromLibrary'), onPress: chooseFromLibrary },
      { text: t('photo.takePhoto'), onPress: takePersonalPhoto },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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

  useEffect(() => {
    paletteRevealOpacity.stopAnimation();
    paletteRevealTranslateY.stopAnimation();

    if (photoPaletteSuggestion.length !== 3) {
      paletteRevealOpacity.setValue(0);
      paletteRevealTranslateY.setValue(8);
      return undefined;
    }

    paletteRevealOpacity.setValue(0);
    paletteRevealTranslateY.setValue(8);
    const reveal = Animated.parallel([
      Animated.timing(paletteRevealOpacity, {
        duration: 240,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(paletteRevealTranslateY, {
        duration: 240,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);
    reveal.start();
    return () => reveal.stop();
  }, [photoPaletteSuggestion]);

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
    if (editingId && selectedJourney) {
      pendingNavigationScrollYRef.current = 0;
      setScreen('detail');
    }
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
    // I wrote this:
    // I save the new Journey first before removing the old photo.
    // This prevents a failed edit from accidentally losing the user's photo.
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
    pendingNavigationScrollYRef.current = 0;
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
        resizeMode="cover"
        source={{ uri: getDisplayImageUri(imageUri) }}
        style={imageStyle}
      />
    );
  };

  const renderPalette = (journey, compact = false) => {
    if (journey.palette.length === 0) return null;

    return (
      <View accessibilityLabel={t('photo.paletteField')} style={[styles.paletteRow, compact && styles.cardPaletteRow]}>
        {journey.palette.slice(0, 5).map((color) => (
          <View
            accessibilityLabel={t('journeys.paletteColourA11y', { color })}
            key={color}
            style={[styles.swatch, compact && styles.cardSwatch, { backgroundColor: color }]}
          />
        ))}
      </View>
    );
  };

  const renderJourneyCover = (journey, imageStyle) => {
    if (journey.imageUri) return renderJourneyImage(journey.imageUri, imageStyle);
    const validPalette = journey.palette.filter((color) => /^#[0-9A-F]{6}$/i.test(color)).slice(0, 3);
    const palette = validPalette.length ? validPalette : ['#D8D2C8', '#A8B2AF', '#687374'];
    return (
      <View accessibilityLabel={t('images.fallback')} style={[imageStyle, styles.journeyPaletteCover]}>
        {palette.map((color, index) => (
          <View key={`${color}-${index}`} style={[styles.journeyPaletteField, index === 0 && styles.journeyPaletteFieldPrimary, { backgroundColor: color }]} />
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
            <Pressable accessibilityLabel={t('expenses.editA11y', { category: expense.category })} accessibilityRole="button" hitSlop={{ top: 2, bottom: 2 }} onPress={() => startEditExpense(expense)} style={styles.smallActionButton}>
              <Text style={styles.smallActionText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t('expenses.deleteA11y', { category: expense.category })} accessibilityRole="button" hitSlop={{ top: 2, bottom: 2 }} onPress={() => requestDeleteExpense(expense)} style={[styles.smallActionButton, styles.smallDeleteButton]}>
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
          <Text style={styles.kicker}>{t('journeys.kicker')}</Text>
          <Text style={styles.title}>{t('journeys.title')}</Text>
          <Text style={styles.subtitle}>{t('journeys.subtitle')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => openAddForm()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('journeys.add')}</Text>
        </Pressable>
      </View>

      {journeys.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('journeys.emptyTitle')}</Text>
          <Text style={styles.emptyCopy}>{t('journeys.emptyCopy')}</Text>
          <Pressable accessibilityRole="button" onPress={() => openAddForm()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('journeys.addJourney')}</Text>
          </Pressable>
        </View>
      ) : journeys.map((journey) => (
        <Pressable
          accessibilityLabel={`${journey.destination}, ${journey.country}, ${journey.date}`}
          accessibilityHint={t('journeys.openHint')}
          accessibilityRole="button"
          key={journey.id}
          onPress={() => openDetail(journey)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          {renderJourneyCover(journey, styles.image)}
          <View style={styles.cardBody}>
            <Text style={styles.cardDate}>{journey.date}</Text>
            <Text style={styles.location}>{journey.destination}</Text>
            <Text style={styles.country}>{journey.country}</Text>
            {journey.notes ? <Text numberOfLines={2} style={styles.description}>{journey.notes}</Text> : null}
            {renderPalette(journey, true)}
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
          <Pressable accessibilityRole="button" onPress={openList} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('journeys.back')}</Text>
          </Pressable>
        </View>
      );
    }

    const localAccent = journeyPaletteTheme.primaryColor;
    const localTextColor = journeyPaletteTheme.primaryForegroundColor;
    return (
      <>
        <Pressable accessibilityLabel={t('journeys.back')} accessibilityRole="button" onPress={openList} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('journeys.myJourneys')}</Text>
        </Pressable>
        <View style={[styles.detailCard, { borderColor: journeyPaletteTheme.borderColor }]}>
          {renderJourneyCover(selectedJourney, styles.detailImage)}
          <View style={[styles.detailAtmosphere, { backgroundColor: localAccent }]}>
            <Text style={[styles.detailDate, { color: localTextColor }]}>{selectedJourney.date}</Text>
            <Text style={[styles.detailTitle, { color: localTextColor }]}>{selectedJourney.destination}</Text>
            <Text style={[styles.detailCountry, { color: localTextColor }]}>{selectedJourney.country}</Text>
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.memoryLabel}>{t('journeys.notes')}</Text>
            <Text style={styles.detailNotes}>{selectedJourney.notes || t('journeys.noNotes')}</Text>
            <Text style={styles.memoryLabel}>{t('photo.paletteField')}</Text>
            {renderPalette(selectedJourney)}
            {renderExpenseManager(selectedJourney)}
            {renderExpenseSummary(selectedJourney)}
            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" onPress={() => openEditForm(selectedJourney)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => requestDelete(selectedJourney)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
              </Pressable>
            </View>
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
      <Pressable accessibilityLabel={t('common.cancel')} accessibilityRole="button" onPress={cancelJourneyForm} style={styles.backButton}>
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
            ? <Image accessibilityLabel={t('photo.previewA11y')} resizeMode="cover" source={{ uri: pendingDurablePhoto.imageUri }} style={styles.photoPreview} />
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
          <Animated.View
            style={[
              styles.suggestedPalette,
              {
                opacity: paletteRevealOpacity,
                transform: [{ translateY: paletteRevealTranslateY }],
              },
            ]}
          >
            <Text style={styles.label}>{t('photo.coloursFromPhoto')}</Text>
            <View style={styles.suggestedPaletteRow}>
              {photoPaletteSuggestion.map((color) => (
                <View accessibilityLabel={t('journeys.paletteColourA11y', { color })} key={color} style={[styles.suggestedSwatch, { backgroundColor: color }]} />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={acceptPhotoPalette} style={styles.secondaryButtonWide}>
              <Text style={styles.secondaryButtonText}>{t('photo.useColours')}</Text>
            </Pressable>
          </Animated.View>
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
        <Pressable accessibilityRole="button" onPress={submitForm} style={styles.primaryButtonWide}>
          <Text style={styles.primaryButtonText}>{editingId ? t('journeys.saveChanges') : t('journeys.saveJourney')}</Text>
        </Pressable>
      </View>
    </>
  );

  const renderSectionNavigation = (placement, onLayout) => (
    <View
      accessibilityElementsHidden={placement === 'top' && isBottomNavigationVisible}
      accessibilityLabel={t('nav.label')}
      accessibilityRole="tablist"
      importantForAccessibility={placement === 'top' && isBottomNavigationVisible ? 'no-hide-descendants' : 'auto'}
      onLayout={onLayout}
      style={[styles.sectionNav, placement === 'top' && styles.topSectionNav, placement === 'bottom' && styles.bottomSectionNav]}
    >
      <View style={styles.sectionNavInner}>
        {[
          ['discover', t('nav.discover')],
          ['dreams', t('nav.dreams')],
          ['journeys', t('nav.journeys')],
          ['passport', t('nav.passport')],
        ].map(([id, label]) => {
          const selected = section === id;
          return (
            <Pressable
              accessibilityLabel={`${label}${selected ? `, ${t('language.selected')}` : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => navigateToSection(id)}
              style={[styles.sectionTab, selected && styles.sectionTabSelected]}
            >
              <Text style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: APP_BACKGROUND }]}>
      {isJourneyDetailPresentation ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.journeyWatercolourLayer}
        >
          <View style={[styles.journeyWatercolourWash, styles.journeyWatercolourPrimary, { backgroundColor: journeyPaletteTheme.primaryColor }]} />
          <View style={[styles.journeyWatercolourWash, styles.journeyWatercolourSecondary, { backgroundColor: journeyPaletteTheme.secondaryColor }]} />
          <View style={[styles.journeyWatercolourWash, styles.journeyWatercolourTertiary, { backgroundColor: journeyPaletteTheme.tertiaryColor }]} />
        </View>
      ) : null}
      <SafeAreaView edges={isDestinationDetail ? ['right', 'bottom', 'left'] : ['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <ScrollView
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={handleAppScroll}
      ref={scrollViewRef}
      scrollEventThrottle={16}
      style={styles.screen}
    >
      {isTopLevelPresentation ? <View accessibilityLabel={t('language.controlLabel')} accessibilityRole="tablist" style={styles.languageControl}>
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
      </View> : null}
      {isTopLevelPresentation && languageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t(languageError)}</Text>
          <Pressable accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} onPress={clearLanguageError}><Text style={styles.dismissText}>{t('common.dismiss')}</Text></Pressable>
        </View>
      ) : null}
      {isTopLevelPresentation ? renderSectionNavigation('top', handleTopNavigationLayout) : null}
      {!isDestinationDetail && section === 'journeys' && storageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(storageError)}</Text>
          <Pressable accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} onPress={() => setStorageError('')}>
            <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
      {!isDestinationDetail && section === 'discover' && recentVibeStorageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(recentVibeStorageError)}</Text>
          <Pressable accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} onPress={() => setRecentVibeStorageError('')}>
            <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
      {!isDestinationDetail && (section === 'discover' || section === 'dreams') && dreamStorageError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{localizeMessage(dreamStorageError)}</Text>
          <Pressable accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} onPress={() => setDreamStorageError('')}>
            <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
          </Pressable>
        </View>
      ) : null}
      {section === 'discover' || section === 'dreams' || section === 'passport' ? (
        <SignatureScreen
          colourPassport={colourPassport}
          favouriteIds={favouriteIds}
          memoryDestinationIds={memoryDestinationIds}
          mode={section}
          onAddJourney={openAddFormForDestination}
          onDestinationStateChange={handleDestinationStateChange}
          onRecommendationReady={scrollToDiscoveryResults}
          onToggleFavourite={toggleFavourite}
          onVibeSelect={recordRecentVibe}
          preferenceProfile={preferenceProfile}
        />
      ) : null}
      {section === 'journeys' && screen === 'list' ? renderList() : null}
      {section === 'journeys' && screen === 'detail' ? renderDetail() : null}
      {section === 'journeys' && screen === 'form' ? renderForm() : null}
      {isTopLevelPresentation && bottomNavigationHeight > 0
        ? <View style={{ height: bottomNavigationHeight }} />
        : null}
      </ScrollView>
      </SafeAreaView>
      {isTopLevelPresentation ? (
        <View
          accessibilityElementsHidden={!isBottomNavigationVisible}
          importantForAccessibility={isBottomNavigationVisible ? 'auto' : 'no-hide-descendants'}
          onLayout={handleBottomNavigationLayout}
          pointerEvents={isBottomNavigationVisible ? 'auto' : 'none'}
          style={[
            styles.bottomNavigationOverlay,
            { opacity: isBottomNavigationVisible ? 1 : 0, paddingBottom: insets.bottom },
          ]}
        >
          {renderSectionNavigation('bottom')}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  journeyWatercolourLayer: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  journeyWatercolourWash: { position: 'absolute' },
  journeyWatercolourPrimary: { borderRadius: 280, height: 420, opacity: 0.12, right: -150, top: -150, width: 520 },
  journeyWatercolourSecondary: { borderRadius: 240, bottom: 90, height: 300, left: -230, opacity: 0.09, width: 480 },
  journeyWatercolourTertiary: { borderRadius: 190, height: 240, opacity: 0.055, right: -145, top: 430, width: 330 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 42, paddingHorizontal: 20, paddingTop: 18 },
  languageControl: { alignSelf: 'flex-end', borderColor: '#D8D0C7', borderRadius: 18, borderWidth: 1, flexDirection: 'row', marginBottom: 12, padding: 2 },
  languageButton: { alignItems: 'center', borderRadius: 15, justifyContent: 'center', minHeight: 38, minWidth: 58, paddingHorizontal: 10 },
  languageButtonSelected: { backgroundColor: '#E8DED1' },
  languageButtonText: { color: '#667085', fontSize: 15, fontWeight: '800' },
  languageButtonTextSelected: { color: '#1C2426' },
  sectionNav: { borderBottomColor: '#D7D0C7', borderBottomWidth: 1, marginBottom: 26 },
  sectionNavInner: { alignSelf: 'center', flexDirection: 'row', maxWidth: 560, width: '100%' },
  sectionTab: { alignItems: 'center', borderBottomColor: 'transparent', borderBottomWidth: 2, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 2, paddingVertical: 10 },
  sectionTabSelected: { borderBottomColor: '#1C2426' },
  sectionTabText: { color: '#667085', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sectionTabTextSelected: { color: '#1C2426' },
  bottomNavigationOverlay: { backgroundColor: APP_BACKGROUND, borderTopColor: '#D7D0C7', borderTopWidth: 1, bottom: 0, left: 0, position: 'absolute', right: 0, zIndex: 10 },
  topSectionNav: { marginHorizontal: -12 },
  bottomSectionNav: { borderBottomWidth: 0, marginBottom: 0, paddingHorizontal: 8, paddingTop: 6 },
  headerRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 14, justifyContent: 'space-between', marginBottom: 30, paddingTop: 16 },
  headerCopy: { flex: 1 },
  kicker: { color: '#766F68', fontSize: 13, fontWeight: '700', letterSpacing: 1.7, marginBottom: 10, textTransform: 'uppercase' },
  title: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 43, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: '#5E625F', fontSize: 16, lineHeight: 23, marginTop: 7 },
  primaryButton: { backgroundColor: '#1C2426', borderRadius: 12, minHeight: 46, paddingHorizontal: 17, paddingVertical: 13 },
  primaryButtonWide: { alignItems: 'center', backgroundColor: '#1C2426', borderRadius: 12, marginTop: 12, minHeight: 50, padding: 15 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#FFFCF7', borderRadius: 18, elevation: 3, marginBottom: 28, overflow: 'hidden', shadowColor: '#2C2925', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.12, shadowRadius: 16 },
  cardPressed: { opacity: 0.88 },
  image: { aspectRatio: 1.08, backgroundColor: '#CBD5E0', width: '100%' },
  journeyPaletteCover: { flexDirection: 'row', overflow: 'hidden' },
  journeyPaletteField: { flex: 1 },
  journeyPaletteFieldPrimary: { flex: 2 },
  imageFallback: { alignItems: 'center', backgroundColor: '#E8EEF2', justifyContent: 'center' },
  imageFallbackText: { color: '#667085', fontSize: 13, fontWeight: '700' },
  cardBody: { padding: 20 },
  cardDate: { color: '#817A72', fontSize: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  location: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 31, fontWeight: '700', letterSpacing: -0.5, marginTop: 7 },
  country: { color: '#77736E', fontSize: 16, fontWeight: '500', marginTop: 2 },
  description: { color: '#555D5B', fontSize: 16, fontStyle: 'italic', lineHeight: 25, marginTop: 11 },
  paletteRow: { flexDirection: 'row', gap: 5, marginTop: 12 },
  cardPaletteRow: { gap: 0, marginHorizontal: -20, marginBottom: -20, marginTop: 18 },
  swatch: { flex: 1, height: 58 },
  cardSwatch: { height: 12 },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFCF7', borderRadius: 16, padding: 32 },
  emptyTitle: { color: '#1C2426', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 8, textAlign: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 12, minHeight: 44, paddingVertical: 12 },
  backButtonText: { color: '#1C2426', fontSize: 16, fontWeight: '700' },
  detailCard: { backgroundColor: '#FFFCF7', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  detailImage: { aspectRatio: 1.05, backgroundColor: '#CBD5E0', width: '100%' },
  detailAtmosphere: { paddingBottom: 25, paddingHorizontal: 22, paddingTop: 22 },
  detailDate: { fontSize: 14, fontWeight: '700', letterSpacing: 1.3, opacity: 0.82, textTransform: 'uppercase' },
  detailTitle: { fontFamily: EDITORIAL_SERIF, fontSize: 39, fontWeight: '700', letterSpacing: -0.8, lineHeight: 44, marginTop: 7 },
  detailCountry: { fontSize: 18, fontWeight: '500', marginTop: 3, opacity: 0.84 },
  detailContent: { padding: 22 },
  memoryLabel: { color: '#817A72', fontSize: 14, fontWeight: '700', letterSpacing: 1.2, marginTop: 6, textTransform: 'uppercase' },
  detailNotes: { color: '#434C4A', fontSize: 18, fontStyle: 'italic', lineHeight: 28, marginBottom: 28, marginTop: 10 },
  expenseSummary: { backgroundColor: '#F2F3F0', borderRadius: 12, marginTop: 24, padding: 17 },
  expenseTitle: { color: '#17202A', fontSize: 18, fontWeight: '900', letterSpacing: 0.6, marginBottom: 12 },
  expenseHighlightRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  expenseHighlight: { flex: 1 },
  expenseLabel: { color: '#667085', fontSize: 14, fontWeight: '900', letterSpacing: 0.5, marginTop: 10, textTransform: 'uppercase' },
  expenseValue: { color: '#17202A', fontSize: 22, fontWeight: '900', marginTop: 3 },
  expenseLargest: { color: '#8D4F5B', fontSize: 16, fontWeight: '800', marginTop: 4 },
  expenseRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 8 },
  expenseCategory: { color: '#344054', flex: 1, fontSize: 14, fontWeight: '700' },
  expenseAmount: { color: '#17202A', fontSize: 14, fontWeight: '900' },
  expenseNote: { color: '#667085', fontSize: 14, lineHeight: 21, marginTop: 14 },
  expenseEmpty: { color: '#667085', fontSize: 14, lineHeight: 21 },
  expenseManager: { borderTopColor: '#D8D0C7', borderTopWidth: 1, marginTop: 30, paddingTop: 22 },
  expenseManagerHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  expenseManagerCopy: { flex: 1 },
  expenseManagerTitle: { color: '#17202A', fontSize: 18, fontWeight: '900' },
  expenseManagerSubtitle: { color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 3 },
  compactButton: { backgroundColor: '#17202A', borderRadius: 7, minHeight: 42, paddingHorizontal: 13, paddingVertical: 11 },
  compactButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  expenseItem: { alignItems: 'center', borderTopColor: '#E4E9EC', borderTopWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 14, paddingTop: 14 },
  expenseItemCopy: { flex: 1 },
  expenseItemCategory: { color: '#344054', fontSize: 14, fontWeight: '800' },
  expenseItemAmount: { color: '#17202A', fontSize: 18, fontWeight: '900', marginTop: 2 },
  expenseItemActions: { flexDirection: 'row', gap: 7 },
  smallActionButton: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 52, paddingHorizontal: 9 },
  smallActionText: { color: '#17202A', fontSize: 14, fontWeight: '800' },
  smallDeleteButton: { backgroundColor: '#FDECEC' },
  smallDeleteText: { color: '#A61B1B', fontSize: 14, fontWeight: '800' },
  expenseEditor: { backgroundColor: '#F4F7F8', borderRadius: 8, marginTop: 16, padding: 14 },
  expenseEditorTitle: { color: '#17202A', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  expenseAmountLabel: { marginTop: 14 },
  expenseEditorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButtonFlex: { alignItems: 'center', backgroundColor: '#17202A', borderRadius: 8, flex: 1, padding: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#E8EEF2', borderRadius: 8, flex: 1, padding: 13 },
  secondaryButtonText: { color: '#17202A', fontSize: 16, fontWeight: '700' },
  deleteButton: { alignItems: 'center', backgroundColor: '#FDECEC', borderRadius: 8, flex: 1, padding: 13 },
  deleteButtonText: { color: '#A61B1B', fontSize: 16, fontWeight: '700' },
  formCard: { backgroundColor: '#FFFCF7', borderRadius: 18, padding: 22 },
  formTitle: { color: '#1C2426', fontFamily: EDITORIAL_SERIF, fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  formSubtitle: { color: '#77736E', fontSize: 16, lineHeight: 23, marginBottom: 26, marginTop: 7 },
  linkedDestination: { backgroundColor: '#E8F1EC', borderRadius: 7, color: '#28533C', fontSize: 14, fontWeight: '800', marginBottom: 18, overflow: 'hidden', padding: 11 },
  field: { marginBottom: 20 },
  label: { color: '#424A48', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#D8D0C7', borderRadius: 10, borderWidth: 1, color: '#1C2426', fontSize: 16, paddingHorizontal: 13, paddingVertical: 12 },
  notesInput: { minHeight: 110, textAlignVertical: 'top' },
  photoField: { borderTopColor: '#DED7CE', borderTopWidth: 1, marginBottom: 22, paddingTop: 22 },
  photoPreview: { aspectRatio: 1.12, backgroundColor: '#E8EEF2', borderRadius: 14, marginBottom: 12, width: '100%' },
  photoFeedback: { color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 8 },
  suggestedPalette: { backgroundColor: '#F1EEE8', borderRadius: 12, marginBottom: 22, padding: 16 },
  suggestedPaletteRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  suggestedSwatch: { flex: 1, height: 62 },
  paletteEditor: { borderTopColor: '#DED7CE', borderTopWidth: 1, marginBottom: 22, paddingTop: 22 },
  paletteHelp: { color: '#667085', fontSize: 14, lineHeight: 20, marginBottom: 8 },
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
