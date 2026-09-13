# Wanderlust Palette

## About the Project

I built Wanderlust Palette as my React Native and Expo coursework project.

The idea came from how I remember travelling through colours and feelings, not only through places. I wanted to make an app where someone could start with how they feel, discover a destination, save somewhere they dream about visiting, and later turn their own travel photo into a personal colour memory.

The main path through the app is:

**Feel → Vibe → Colour → Discover → Dream → Travel → Personal Palette → Remember**

## Main Features

- Discover destinations by vibe, colour and budget
- View destination details and related places
- Save and remove destinations from Dream Palette
- Quickly add or remove a Dream from Discover with an accessible heart control
- Add, edit and delete personal Journeys
- Record travel expenses and view simple insights
- Take a photo or choose one from the photo library
- Extract three suggested colours from a Journey photo
- Edit and save personal Journey palettes
- Get recommendations from recent choices, Dreams and Journeys
- View a personal Colour Passport with a watercolour animation
- Use English or Traditional Chinese (`zh-Hant`)
- View optional World Bank country information
- Use accessibility labels, selected states and dynamic text contrast

## Technology

- Expo SDK 54
- React Native 0.81.5
- React 19.1.0
- JavaScript
- AsyncStorage
- Expo ImagePicker
- Expo FileSystem
- Expo ImageManipulator
- Expo GL
- Expo Linear Gradient
- Jest

## Install the Project

### Submitted coursework ZIP

The submitted ZIP does not contain `package-lock.json`.

After extracting the ZIP, open Terminal in the project folder and run:

```bash
npm install
```

### Git repository

The Git repository contains `package-lock.json`, so use the locked dependency versions:

```bash
cd WanderlustPalette
npm ci
```

## Run the App

Start the Expo development server with:

```bash
npm start
```

These scripts are also available:

```bash
npm run ios
npm run android
npm run web
```

This project uses Expo SDK 54. A newer Expo Go client may not directly support it, so use an SDK-54-compatible client or one of the options below.

## Ways to Run Wanderlust Palette

### Option 1 — Expo

Use the submitted Expo project or link with an SDK-54-compatible Expo client.

### Option 2 — Android Preview APK

I successfully created an Android Preview APK using EAS with the `preview-apk` profile. The cloud build completed successfully, but I did not perform a separate Android runtime test because I did not have an Android device available.

[View the Android build](https://expo.dev/accounts/happyirenehu/projects/WanderlustPalette/builds/215a4e57-0314-4c8a-be9e-3fe22e4814b8)

### Option 3 — iOS Simulator build

I successfully created an iOS Simulator build using EAS with the `ios-simulator` profile on Expo SDK 54.0.0. The cloud build completed successfully, but I did not launch it locally because Xcode is not installed on my development Mac. It was built from commit `dbc119014e221fa512683d1ef7e0070f1b3d5220`.

[View the iOS build](https://expo.dev/accounts/happyirenehu/projects/WanderlustPalette/builds/bf1c83b2-9c08-49b6-b1e1-ee72f237c697)

[Download the iOS Simulator archive](https://expo.dev/artifacts/eas/CJh0avq8ibaxCMN7QAPwzffue1MUCZF8kPAiwpr1EM8.tar.gz)

### Option 4 — Run from source

Use `npm ci` from the Git repository or `npm install` from the coursework ZIP, then run:

```bash
npm start
```

## Camera and Photo Colours

When adding or replacing a Journey photo, the app offers **Choose from Library**, **Take Photo** and **Cancel**.

- Camera permission is requested only after choosing **Take Photo**.
- Media-library permission is requested only after choosing **Choose from Library**.
- Cancelling does not change the form, photo or palette.
- Both paths use the same photo preparation and colour-extraction flow.
- The photo is copied into app-owned local storage before colour extraction.
- The app suggests three colours, which the user can edit before saving.

The photo workflow does not request microphone permission.

## Data and Network Behaviour

I store Journeys, expenses, Dream IDs, language choice, recent vibe choices, cached country facts and owned Journey photos locally on the device.

The app calculates recommendations, Dream-to-Memory links and the Colour Passport from that saved data instead of storing duplicate copies.

Country information comes from the public World Bank API when available. If there is no network connection or no cached country record, the main destination screen still works without the extra facts.

The project does not include photo uploads, cloud sync, analytics, encryption claims or a privacy policy.

## Testing

At the validated production checkpoint:

- 31/31 Jest test suites passed
- 262/262 tests passed
- 0 failures
- Coverage: Statements 94.39%, Branches 83.53%, Functions 97.63%, Lines 96.37%
- Expo Doctor: 18/18 checks passed
- `git diff --check`: passed

The Jest tests cover the parts that can be checked reliably in JavaScript, including storage, Journey and expense logic, Dreams, discovery, recommendations, localization, World Bank response handling, photo-picker normalization, photo-colour processing, palette behaviour and navigation helpers.

Jest does not test physical Camera hardware, real native GL rendering or VoiceOver itself.

## Physical Testing

I tested the main native features on a physical iPhone, including:

- Camera capture and photo-library selection
- Photo-to-Colour extraction
- Saving, reopening and replacing Journey photos
- Journey persistence
- Colour Passport animation
- VoiceOver accessibility

## Accessibility

I treated accessibility as part of the app design. Interactive controls have roles, labels or hints where needed. Vibe, colour, language and navigation choices expose their selected state.

I also added contextual labels for compact actions, larger non-visual hit areas where needed, and calculated text contrast for colour-based backgrounds. The final accessibility changes were checked with VoiceOver on an iPhone.

This is practical testing evidence, not a claim of formal WCAG certification.

## Coursework ZIP Checklist

Include:

- application source code
- assets
- `README.md`
- `package.json`
- required project configuration files

Exclude:

- `node_modules/`
- `package-lock.json`
- `coverage/`
- `.expo/`
- generated build output
- temporary files
- unrelated prototype files
- experimental audio/Sound prototype files

`package-lock.json` stays tracked in Git. It is excluded only from the coursework ZIP because the coursework instructions require this.

## Project Structure

The project keeps screens, components, utilities, data, locales, tests and assets in separate folders. `App.js` is the entry point.

## Known Limitations

- The app is designed mainly for portrait use.
- A newer Expo Go client may not support Expo SDK 54 directly.
- Camera hardware, native GL rendering and VoiceOver still need native-device checks outside Jest.
- World Bank information needs a network connection when no cached result exists.
- There is no rendered end-to-end UI test suite.
- The iOS Simulator cloud build was not launched locally because Xcode is not installed.
- The Android Preview APK cloud build completed successfully, but I did not have an Android device available for a separate runtime test.
- I do not claim physical-iPhone EAS distribution, TestFlight, App Store or Play Store availability.

## Attribution

- Country information uses the public World Bank country API.
- Destination and vibe images use Unsplash attribution and outbound credit links where configured.
- Destination, vibe, colour and sample Journey data are bundled project data.

## Coursework Checkpoint

Validated production checkpoint:

`v1.2.6-quick-dream`

`741d9df0a303aa6c3203ba30901010110083abb9`
