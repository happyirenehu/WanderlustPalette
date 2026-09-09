import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'HomeScreen.js'), 'utf8');
const signatureSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'SignatureScreen.js'), 'utf8');
const hybridNavigationSource = fs.readFileSync(path.join(__dirname, '..', 'utils', 'hybridNavigation.js'), 'utf8');
const enSource = fs.readFileSync(path.join(__dirname, '..', 'locales', 'en.js'), 'utf8');
const zhHantSource = fs.readFileSync(path.join(__dirname, '..', 'locales', 'zh-Hant.js'), 'utf8');

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
    expect(signatureSource).toContain('getPassportArtworkPalette(colourPassport)');
    expect(signatureSource).toContain('renderWatercolourArtwork(passportComposition)');
  });

  test('top-level information architecture is Discover, Dreams, Journeys, then Passport', () => {
    const navStart = homeSource.indexOf("['discover', t('nav.discover')]");
    const dreams = homeSource.indexOf("['dreams', t('nav.dreams')]", navStart);
    const journeys = homeSource.indexOf("['journeys', t('nav.journeys')]", dreams);
    const passport = homeSource.indexOf("['passport', t('nav.passport')]", journeys);

    expect(navStart).toBeGreaterThan(-1);
    expect(dreams).toBeGreaterThan(navStart);
    expect(journeys).toBeGreaterThan(dreams);
    expect(passport).toBeGreaterThan(journeys);
    expect(homeSource).not.toContain("['nearby'");
  });

  test('destination detail removes global chrome while retaining an accessible safe-area back action', () => {
    expect(homeSource).toContain("edges={isDestinationDetail ? ['right', 'bottom', 'left']");
    expect(homeSource).toContain('contentInsetAdjustmentBehavior="never"');
    expect(homeSource).toContain('const isTopLevelPresentation = !isDestinationDetail');
    expect(homeSource).toContain("isTopLevelPresentation ? renderSectionNavigation('top', handleTopNavigationLayout)");
    expect(signatureSource).toContain('onDestinationStateChange?.(isOpen)');
    expect(signatureSource).toContain("accessibilityLabel={t('common.back')}");
    expect(signatureSource).toContain('style={[styles.heroBackButton, { top: insets.top + 10 }]}');
  });

  test('Dreams owns saved destinations and travel-style insights while Passport owns only identity', () => {
    const dreamsStart = signatureSource.indexOf("if (mode === 'dreams') return");
    const passportStart = signatureSource.indexOf("if (mode === 'passport') return", dreamsStart);
    const discoverStart = signatureSource.indexOf('const selectedIdentity =', passportStart);
    const dreamsBranch = signatureSource.slice(dreamsStart, passportStart);
    const passportBranch = signatureSource.slice(passportStart, discoverStart);

    expect(dreamsStart).toBeGreaterThan(-1);
    expect(passportStart).toBeGreaterThan(dreamsStart);
    expect(dreamsBranch).toContain("t('dream.savedDreamsTitle')");
    expect(dreamsBranch).toContain('dreamDestinations.length');
    expect(dreamsBranch).toContain("t('dream.styleKicker')");
    expect(dreamsBranch).not.toContain('styles.passportCard');
    expect(passportBranch).toContain('styles.passportCard');
    expect(passportBranch).toContain("t('passport.explanation')");
    expect(passportBranch).not.toContain("t('dream.savedDreamsTitle')");
    expect(passportBranch).not.toContain("t('dream.styleKicker')");
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

  test('hybrid navigation is one shared renderer using the existing section state and handler', () => {
    expect(homeSource.match(/const \[section, setSection\]/g)).toHaveLength(1);
    expect(homeSource.match(/const \[favouriteIds, setFavouriteIds\]/g)).toHaveLength(1);
    expect(homeSource).toContain("renderSectionNavigation('top', handleTopNavigationLayout)");
    expect(homeSource).toContain("renderSectionNavigation('bottom')");
    expect(homeSource).toContain('const selected = section === id');
    expect(homeSource).toContain('onPress={() => navigateToSection(id)}');
    expect(homeSource).not.toContain('activeSection');
  });

  test('global navigation is limited to top-level Discover, Dreams, Journey list, and Passport presentations', () => {
    expect(homeSource).toContain("&& (section !== 'journeys' || screen === 'list')");
    expect(homeSource).toContain("{isTopLevelPresentation ? renderSectionNavigation('top', handleTopNavigationLayout) : null}");
    expect(homeSource).toContain("section === 'discover' || section === 'dreams' || section === 'passport'");
    expect(homeSource).toContain("{section === 'journeys' && screen === 'detail' ? renderDetail() : null}");
    expect(homeSource).toContain("{section === 'journeys' && screen === 'form' ? renderForm() : null}");
    expect(signatureSource).toContain("mode === 'dreams' ? t('nav.dreams') : t('nav.discover')");
  });

  test('bottom navigation eligibility comes from measured layout without viewport magic numbers', () => {
    expect(homeSource).toContain('topNavigationBoundaryRef.current = y + height');
    expect(homeSource).toContain('topNavigationHeight: topNavigationHeightRef.current');
    expect(hybridNavigationSource).toContain('topNavigationHeight * HYSTERESIS_RATIO');
    expect(hybridNavigationSource).not.toMatch(/scrollY\s*>\s*(100|150)/);
    expect(homeSource).not.toContain('screenHeight');
    expect(homeSource).not.toContain('Dimensions.get');
    expect(homeSource).not.toContain('setTimeout(');
  });

  test('bottom utility navigation is an isolated safe-area overlay with measured content clearance', () => {
    expect(homeSource).toContain("position: 'absolute'");
    expect(homeSource).toContain('paddingBottom: insets.bottom');
    expect(homeSource).toContain('pointerEvents={isBottomNavigationVisible');
    expect(homeSource).toContain('height: bottomNavigationHeight');
    expect(homeSource).toContain("maxWidth: 560, width: '100%'");
  });

  test('navigation labels remain localized and selected state is an underline rather than a dark fill', () => {
    expect(enSource).toContain("discover: 'Discover'");
    expect(enSource).toContain("dreams: 'Dreams'");
    expect(enSource).toContain("journeys: 'Journeys'");
    expect(enSource).toContain("passport: 'Passport'");
    expect(zhHantSource).toContain("discover: '探索'");
    expect(zhHantSource).toContain("dreams: '夢想'");
    expect(zhHantSource).toContain("journeys: '旅程'");
    expect(zhHantSource).toContain("passport: '色彩護照'");
    expect(homeSource).toContain("sectionTabSelected: { borderBottomColor: '#1C2426' }");
    expect(homeSource).not.toMatch(/sectionTabSelected:\s*\{[^}]*backgroundColor/);
  });

  test('four navigation tabs retain readable type and 48-point targets at narrow widths', () => {
    expect(homeSource).toContain("topSectionNav: { marginHorizontal: -12 }");
    expect(homeSource).toContain("bottomSectionNav: { borderBottomWidth: 0, marginBottom: 0, paddingHorizontal: 8");
    expect(homeSource).toContain("sectionTab: { alignItems: 'center', borderBottomColor: 'transparent', borderBottomWidth: 2, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 2");
    expect(homeSource).toContain("sectionTabText: { color: '#667085', fontSize: 16");
  });
});
