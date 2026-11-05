# Fidelat Studio Architecture

## Why This Design

The application now uses browser-native ES modules instead of a single large script. This keeps the project simple to run as static files while creating clear extension points for the next features.

React could still be introduced later if the app grows into many nested interactive views, but the current scope does not need a build system yet. For drag-and-drop, speech APIs, and offline-friendly learning screens, modular vanilla JavaScript is a good fit.

## Current Modules

- src/data/fidelat-data.js
  Central source of truth for variant names and Fidelat rows.
- src/data/readingPractice.json
  Local, family-keyed source of truth for Reading One and Reading Two content. The family lesson imports and renders these entries directly instead of generating reading combinations in code.
- src/services/storage-service.js
  Loads, saves, resets, and migrates persisted progress.
- src/services/audio-service.js
  Loads sounds.json, plays symbol audio, and handles simple spoken or synthesized feedback.
- src/core/progress-store.js
  Owns app state and derived progress helpers.
- src/features/alphabet-explorer.js
  Handles the low-pressure tap-to-hear learning mode.
- src/features/listen-match.js
  Handles the scored listening challenge and variant unlocking.
- pp.js
  Coordinates the app shell, routes between modes, and dispatches UI actions.

## Planned Next Modules

- src/features/drag-drop.js
  Lesson-specific draggable cards, targets, and success logic.
- src/services/speech-service.js
  Browser speech-recognition wrapper with feature detection and transcript capture.
- src/features/voice-coach.js
  Speaking prompts, evaluation rules, retry flow, and feedback UI.
- src/core/lesson-engine.js
  Shared sequencing for moving learners across activities with a consistent definition of mastery.

## Design Principles

- Keep one source of truth for symbols, audio, and mastery.
- Let each learning mode own its own UI and interactions.
- Add new features by composing services and feature modules instead of expanding one controller file.
- Preserve compatibility with local static hosting and the existing audio map.
