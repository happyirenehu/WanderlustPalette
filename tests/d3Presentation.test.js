import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'HomeScreen.js'), 'utf8');
const signatureSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'SignatureScreen.js'), 'utf8');

describe('D3 presentation boundaries', () => {
  test('Journey atmosphere is local and cannot persist a global palette theme', () => {
    expect(homeSource).not.toContain('@wanderlust_palette/active_theme');
    expect(homeSource).not.toContain('onSelectTheme');
    expect(signatureSource).not.toContain('onSelectTheme');
    expect(homeSource).toContain('getContrastColor(localAccent)');
    expect(homeSource).toContain('backgroundColor: localAccent');
  });

  test('Journey cards preserve an image-first cover presentation with a palette fallback', () => {
    expect(homeSource).toContain('renderJourneyCover(journey, styles.image)');
    expect(homeSource).toContain('styles.journeyPaletteCover');
  });

  test('Destination detail keeps stable identity and adds no unsupported match data', () => {
    expect(signatureSource).toContain('{selectedDestination.name}');
    expect(signatureSource).toContain('{selectedDestination.country}');
    expect(signatureSource).toContain('styles.detailBody');
    expect(signatureSource).not.toContain('94%');
    expect(signatureSource).not.toContain('matchPercentage');
  });

  test('Passport artwork and narrative remain derived from existing evidence', () => {
    expect(signatureSource).toContain('getPassportNarrative(colourPassport)');
    expect(signatureSource).toContain('colourPassport?.representativePalette');
    expect(signatureSource).toContain('renderWatercolourArtwork(passportComposition)');
  });

  test('top-level information architecture is Discover, Journeys, then Passport', () => {
    const navStart = homeSource.indexOf("['discover', t('nav.discover')]");
    const journeys = homeSource.indexOf("['journeys', t('nav.journeys')]", navStart);
    const passport = homeSource.indexOf("['dream', t('nav.passport')]", journeys);

    expect(navStart).toBeGreaterThan(-1);
    expect(journeys).toBeGreaterThan(navStart);
    expect(passport).toBeGreaterThan(journeys);
    expect(homeSource).not.toContain("['nearby'");
  });

  test('destination detail removes global chrome while retaining an accessible safe-area back action', () => {
    expect(homeSource).toContain("edges={isDestinationDetail ? ['right', 'bottom', 'left']");
    expect(homeSource).toContain('contentInsetAdjustmentBehavior="never"');
    expect(homeSource).toContain('!isDestinationDetail ? <View accessibilityLabel={t(\'language.controlLabel\')}');
    expect(homeSource).toContain('!isDestinationDetail ? <View accessibilityLabel={t(\'nav.label\')}');
    expect(signatureSource).toContain('onDestinationStateChange?.(isOpen)');
    expect(signatureSource).toContain("accessibilityLabel={t('common.back')}");
    expect(signatureSource).toContain('style={[styles.heroBackButton, { top: insets.top + 10 }]}');
  });

  test('Passport identity leads and Saved Dreams remains supporting content', () => {
    const passport = signatureSource.indexOf('style={styles.passportCard}');
    const savedDreams = signatureSource.indexOf("t('dream.savedDreamsTitle')", passport);
    const dreamCards = signatureSource.indexOf('dreamDestinations.length', savedDreams);

    expect(passport).toBeGreaterThan(-1);
    expect(savedDreams).toBeGreaterThan(passport);
    expect(dreamCards).toBeGreaterThan(savedDreams);
  });

  test('Inspired by You stays in the discovery flow and has an explicit jump affordance', () => {
    const selectionResults = signatureSource.indexOf('!selectedIdentity ?');
    const inspired = signatureSource.indexOf('onLayout={handleInspiredLayout}', selectionResults);

    expect(signatureSource).toContain("t('personalization.jump')");
    expect(signatureSource).toContain('onPress={scrollToInspired}');
    expect(inspired).toBeGreaterThan(selectionResults);
    expect(signatureSource).toContain('selectColor(color.id)');
    expect(signatureSource).toContain('selectVibe(vibe.id)');
  });

  test('Discover keeps one stable content width and all six source vibes across detail transitions', () => {
    expect(homeSource).toContain('contentContainerStyle={[styles.content, { backgroundColor: APP_BACKGROUND }]}');
    expect(homeSource).not.toContain('destinationDetailContent');
    expect(signatureSource).toContain("detailCard: { backgroundColor: '#FFFCF7', marginHorizontal: -20, marginTop: -18");
    expect(signatureSource).toContain('vibes.map((vibe) => <VibeCard');
    expect(signatureSource).toContain('vibeCardGrid: { flexDirection: \'row\', flexWrap: \'wrap\'');
  });

  test('destination navigation owns deterministic top and return scroll positions', () => {
    expect(homeSource).toContain('destinationReturnYRef.current = currentScrollYRef.current');
    expect(homeSource).toContain('pendingNavigationScrollYRef.current = 0');
    expect(homeSource).toContain('pendingNavigationScrollYRef.current = destinationReturnYRef.current');
    expect(homeSource).toContain('useLayoutEffect(() => {');
    expect(signatureSource).toContain('const previousDestinationId = useRef(null)');
    expect(signatureSource).toContain('if (isOpen || wasOpen !== isOpen) onDestinationStateChange?.(isOpen)');
  });

  test('one-shot exploration scroll intent cannot survive destination navigation', () => {
    const openDestination = signatureSource.slice(
      signatureSource.indexOf('const openDestination ='),
      signatureSource.indexOf('const closeDestination ='),
    );
    const closeDestination = signatureSource.slice(
      signatureSource.indexOf('const closeDestination ='),
      signatureSource.indexOf('const renderDestinationCard ='),
    );

    expect(openDestination).toContain('pendingResultsScroll.current = false');
    expect(openDestination).toContain('resultsY.current = null');
    expect(closeDestination).toContain('pendingResultsScroll.current = false');
    expect(signatureSource).toContain('if (selectedDestinationId || !selectedExplorationId');
    expect(signatureSource).not.toContain('setTimeout(');
  });

  test('Journey Detail owns hero-top entry and list-return scroll targets', () => {
    const openList = homeSource.slice(
      homeSource.indexOf('const openList ='),
      homeSource.indexOf('const openDetail ='),
    );
    const openDetail = homeSource.slice(
      homeSource.indexOf('const openDetail ='),
      homeSource.indexOf('const openAddForm ='),
    );

    expect(openDetail).toContain("if (screen === 'list') journeyReturnYRef.current = currentScrollYRef.current");
    expect(openDetail).toContain('pendingNavigationScrollYRef.current = 0');
    expect(openList).toContain("screen === 'detail' ? journeyReturnYRef.current : 0");
    expect(homeSource).toContain('[isDestinationDetail, screen, section, selectedId]');
  });

  test('colour and vibe taps create measured one-shot Current Exploration scroll intents', () => {
    const selectVibeSource = signatureSource.slice(
      signatureSource.indexOf('const selectVibe ='),
      signatureSource.indexOf('const selectColor ='),
    );
    const selectColorSource = signatureSource.slice(
      signatureSource.indexOf('const selectColor ='),
      signatureSource.indexOf('const selectDiscoveryMode ='),
    );
    const resultsLayoutSource = signatureSource.slice(
      signatureSource.indexOf('const handleResultsLayout ='),
      signatureSource.indexOf('const handleInspiredLayout ='),
    );

    expect(selectVibeSource).toContain('pendingResultsScroll.current = true');
    expect(selectColorSource).toContain('pendingResultsScroll.current = true');
    expect(selectColorSource).toContain('setSelectedColorId(colorId)');
    expect(resultsLayoutSource).toContain('Number.isFinite(measuredY)');
    expect(resultsLayoutSource).toContain('pendingResultsScroll.current = false');
    expect(resultsLayoutSource.indexOf('pendingResultsScroll.current = false')).toBeLessThan(
      resultsLayoutSource.indexOf('onRecommendationReady?.(resultsY.current)'),
    );
    expect(signatureSource).toContain('const selectedExplorationId = discoveryMode === \'color\'');
  });
});
