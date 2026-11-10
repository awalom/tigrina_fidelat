# Fidelat Studio Architecture

## Why This Design

The application now uses browser-native ES modules instead of a single large script. This keeps the project simple to run as static files while creating clear extension points for the next features.

React could still be introduced later if the app grows into many nested interactive views, but the current scope does not need a build system yet. For drag-and-drop, speech APIs, and offline-friendly learning screens, modular vanilla JavaScript is a good fit.

## Modules

- `app.js`
  Coordinates the app shell, routes between modes, renders the page, and dispatches UI actions.
- `src/data/fidelat-data.js`
  Central source of truth for variant names, alphabet rows, and additional letter groups.
- `src/data/readingPractice.json`
  Family-keyed reading content (Reading One to Three and Advanced Reading) rendered directly by the family lesson.
- `src/core/progress-store.js`
  Owns app state and derived progress helpers.
- `src/services/storage-service.js`, `content-service.js`
  Persist, reset, and migrate learner progress; hold editable admin copy.
- `src/services/audio-service.js`
  Loads `sounds.json`, plays symbol audio, and handles spoken or synthesized feedback.
- `src/services/theme-service.js`
  Colour themes for the page.
- `src/services/practice-route.js`
  Parses and builds deep links to practice sets.
- `src/services/site-gate.js`
  Login form shown before the app when `auth-config.json` is deployed.
- `src/features/family-lesson.js`
  One-family lesson stepper: seven forms, listening, ordering, reading, advanced reading.
- `src/features/alphabet-explorer.js`, `drag-drop.js`, `listen-match.js`, `additional-letters.js`
  The remaining learning modes, each owning its own UI and interactions.

## Design Principles

- Keep one source of truth for symbols, audio, and mastery.
- Let each learning mode own its own UI and interactions.
- Add new features by composing services and feature modules instead of expanding one controller file.
- Preserve compatibility with local static hosting and the existing audio map.
