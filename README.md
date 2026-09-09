# Wanderlust Palette

## Project Overview

I built Wanderlust Palette as a React Native and Expo coursework project that connects travel planning with colour, feeling and memory. The app lets users begin with a mood or colour, discover matching destinations, save places they dream about, and later record those places as personal Journeys.

The main experience follows this path:

**Feel → Vibe → Colour → Destination Discovery → Dream Palette → Travel → Personal Palette → Remember**

As users save Dreams and add Journey memories, the app gradually builds a personal Colour Passport that reflects both where they hope to go and where they have been.

## Key Features

- Discover destinations by vibe or colour
- Filter suggestions by travel budget
- Explore destination details and related places
- Save destinations to a Dream Palette
- Add, edit and delete Journeys
- Record Journey expenses and view calculated insights
- Take a photo or choose one from the photo library
- Extract colours from a photo and edit the suggested Journey palette
- Link saved Dreams to Journey memories
- Receive recommendations shaped by recent choices, Dreams and Journeys
- View a personal Colour Passport with a programmed watercolour animation
- Load optional country information from the World Bank API
- Switch between English and Traditional Chinese (`zh-Hant`)
- Navigate with responsive top and bottom section controls
- Use screen-reader labels, selected states, status feedback and dynamic contrast

## Technical Highlights

### Camera → Photo → Colour

When adding or replacing a Journey photo, the user can choose **Take Photo** or **Choose from Library**. Both options feed into the same processing flow:

1. Expo ImagePicker requests the relevant permission and returns the selected image.
2. The picker result is normalized and checked before it is used.
3. The image is copied into an app-owned Journey photo directory with Expo FileSystem.
4. Expo ImageManipulator produces a small analysis image, limited to 64 × 64 pixels.
5. Expo GL/WebGL renders that image and provides RGBA pixel readback.
6. Project code groups the pixel colours into 4,096 histogram buckets, ranks the dominant groups and selects three colours that are sufficiently distinct.
7. The three suggestions are shown in the Journey form, where the user can accept or edit them before saving.

To keep photo replacement safe, the new photo is copied and staged before the updated Journey is persisted. An old app-owned photo is deleted only after the replacement has been saved successfully.

Expo GL/WebGL provides the graphics context and pixel-readback functionality. The project-specific work around it includes bounded image preparation, validation, quantization, histogram counting, distinct-colour selection, cleanup and integration with Journey persistence.

### Adaptive Recommendations

The recommendation system does not use machine learning. Instead, it builds a preference profile from recent vibe choices, saved Dreams, Journeys and Journey colours.

Each type of evidence has an explicit weight. Recent vibe choices favour newer selections, Dream destinations contribute their curated vibes and colours, and Journeys contribute both linked destination data and colours from their editable palettes. Destinations are then scored deterministically. Equal scores stay in catalogue order, so the same input always produces the same result. The app also explains the strongest reasons behind each personalized suggestion.

If the user has not created any personal evidence yet, the catalogue provides a consistent neutral starting point.

### Colour Passport

The Colour Passport is a personal visual summary created from the user's saved travel evidence. It combines the strongest Dream colour, colours gathered from Journey memories, recurring vibe evidence and a representative Journey palette.

It is derived from current Dream and Journey data rather than stored as a separate record. When the Passport section is entered, up to five palette-aware watercolour shapes use React Native's built-in `Animated` API to move from offset positions and fade into their final composition. The animation runs once on entry, uses the native driver and does not change the underlying Passport data.

### World Bank API

Destination details can include optional country information from the World Bank's public, read-only country API. Before making a request, the app checks that it has a valid two-letter country code. It also validates the response and ignores malformed or mismatched records.

To keep this feature reliable, requests use an `AbortController` with a five-second timeout. Successful results are cached locally for 30 days. If cached information is available, it can be shown while older data is refreshed. If the network request fails and there is no cached record, the main destination detail still works without the additional country facts. The API does not require authentication.

## Technology Stack

These versions come from the project manifest:

| Technology | Version |
|---|---:|
| Expo | `~54.0.36` |
| React Native | `0.81.5` |
| React | `19.1.0` |
| JavaScript | ECMAScript modules with JSX |
| Jest | `~29.7.0` |
| jest-expo | `~54.0.18` |
| AsyncStorage | `2.2.0` |
| Expo ImagePicker | `~17.0.11` |
| Expo FileSystem | `~19.0.24` |
| Expo ImageManipulator | `~14.0.8` |
| Expo GL | `~16.0.10` |
| React Native Safe Area Context | `~5.6.0` |

## Requirements

- Node.js and npm. The repository does not pin a Node version, so use a Node release supported by Expo SDK 54.
- A development environment that can run an Expo SDK 54 project.
- A compatible physical device or native simulator/emulator environment for checking Camera and Photo → Colour behaviour.

This project was developed and validated with Expo SDK 54. A newer Expo Go client may not support that SDK version, so the marker should use the separately documented compatible run or deployment route.

## Installation

### From the development Git repository

The Git repository contains `package-lock.json`. After cloning the repository, install the locked dependency versions with:

```bash
cd WanderlustPalette
npm ci
```

The lockfile remains part of the development repository and is not deleted or changed for submission.

### From the submitted coursework ZIP

The coursework ZIP intentionally excludes `package-lock.json` to follow the submission requirements. After extracting that ZIP, install the declared dependencies with:

```bash
cd WanderlustPalette
npm install
```

This exclusion applies only to the submitted ZIP. A marker running the ZIP should use `npm install`, while development from Git should use `npm ci`.

## Running the Application

The scripts in `package.json` provide these commands:

```bash
# Start the Expo development server
npm start

# Ask Expo to launch a specific platform
npm run ios
npm run android
npm run web
```

The validated coursework codebase targets Expo SDK 54. A final marker-runnable deployment route will be documented separately once it has been established and tested. This repository does not currently claim a public Expo URL, EAS project or store deployment.

## Camera and Photo Permissions

The Add/Replace Photo action offers **Choose from Library**, **Take Photo** and **Cancel**.

- Camera permission is requested only when **Take Photo** is chosen.
- Media-library permission is requested for **Choose from Library**.
- If permission is denied, the app shows specific feedback without changing the current form, photo or palette.
- Cancelling either native picker makes no state change and shows no error.
- A successful image is normalized and copied to app-owned local storage before colour extraction begins.
- Camera and library photos use the same preparation, extraction, editing and Journey-save flow.

The app's photo workflow does not request microphone permission.

## Data and Network Behaviour

The app stores the following information locally on the device:

- Journeys and their expense entries;
- saved Dream destination identifiers;
- the chosen language;
- recent vibe selections used by the recommendation system;
- cached World Bank country facts; and
- app-owned copies of personal Journey photos.

The preference profile, recommendations, Dream → Memory state and Colour Passport are calculated from this local evidence when needed rather than stored as separate copies. Personal Journey photos are read locally for colour extraction; the project does not contain a photo-upload or analytics workflow.

World Bank enrichment needs a network connection when no cached record is available. Storage and network failures produce controlled fallback states or localized feedback, so they do not block the main discovery and Journey features.

The project does not claim encryption, cloud synchronization or a privacy policy.

## Testing

At the validated production checkpoint:

- **30/30 Jest test suites passed**
- **249/249 executed tests passed**

### Automated Testing

The automated tests focus on the parts of the app that can be tested reliably in Jest. They cover:

- Journey, expense and Dream transformations and persistence;
- malformed storage data and storage failure paths;
- destination normalization, vibe/colour discovery, budget filtering and related destinations;
- deterministic preference profiles and adaptive recommendation integration;
- World Bank response parsing, timeout/failure behaviour and cache freshness;
- localization lookup, fallback and localized catalogue presentation;
- picker-result normalization, including a Camera-shaped result;
- app-owned Journey photo naming, copying, ownership checks and cleanup;
- photo-colour quantization, histogram selection and invalid RGBA inputs;
- Journey palette integration and manual-edit precedence;
- Dream → Memory linkage and Colour Passport derivation;
- Passport artwork palette construction; and
- hybrid-navigation visibility and contrast calculations.

Jest does not test native Camera hardware, native GL rendering or VoiceOver itself.

### Physical Device Testing

Native features were also checked on a physical iPhone. This testing covered:

- Camera capture;
- Photo → Colour;
- Journey persistence;
- photo replacement;
- the Colour Passport animation; and
- VoiceOver accessibility.

## Accessibility

Accessibility was treated as part of the interaction design rather than added only at the end. Interactive controls use roles, labels and hints so their purpose is clear to a screen reader. Vibe, colour, language and navigation choices expose their selected state, while form inputs keep meaningful labels after their placeholders disappear.

The app also includes contextual labels for expense actions, larger non-visual hit areas for selected compact controls, and dynamically calculated foreground contrast on colour-driven backgrounds. Duplicate navigation and the hidden GL analysis surface are removed from the accessibility tree so they do not create extra VoiceOver stops.

The final semantic changes were tested on an iPhone with VoiceOver. This is practical implementation and testing evidence, not a claim of formal WCAG certification.

## Project Structure

```text
WanderlustPalette/
├── App.js                     Application provider and root screen
├── screens/                   Main application and discovery/Passport UI
├── components/                Destination, vibe and photo-analysis components
├── utils/                     Deterministic domain, validation and integration logic
│   ├── *Storage.js            AsyncStorage and owned-photo persistence modules
│   ├── countryApi.js          World Bank request and response normalization
│   ├── photoPicker.js         Native picker-result normalization
│   └── photoColorExtractor.js Bounded RGBA colour extraction
├── data/                      Curated destination, vibe and colour catalogues
├── locales/                   English and Traditional Chinese resources
├── tests/                     Jest unit, integration, persistence and regression tests
└── assets/                    App artwork, icons and bundled Journey seed data
```

I kept calculations, validation and persistence work in testable utility modules where practical. The screens coordinate those modules with React state, platform APIs and user interactions.

## Known Limitations

- The project is designed primarily for portrait use.
- It targets Expo SDK 54, which may not open in a newer incompatible Expo Go client.
- There is no rendered end-to-end UI test harness. Camera hardware, GL rendering and VoiceOver behaviour therefore also require physical-device checks.
- Live World Bank enrichment needs network access when no cached country record exists.
- `HomeScreen.js` coordinates a relatively large amount of application state, although storage, validation, recommendation and extraction logic has been separated into utilities.
- The repository does not currently claim an App Store, Play Store, EAS or public Expo deployment.

## Attribution and Data Sources

- Country enrichment uses the public World Bank country API.
- Destination and vibe photography is shown with Unsplash attribution and outbound credit links where configured.
- Destination, vibe, colour and sample Journey catalogues are bundled project data used by the app.

## Coursework Note

This is a React Native and Expo mobile-development coursework project.

Validated production checkpoint: `v1.0-accessibility-validated`
