# Fidelat – Eritrean Language and Culture School Bern

A browser-based app for learning the Tigrinya (Ge'ez) alphabet. Learners study one alphabet
family at a time (seven forms, listening, ordering, reading) and practise with drag-and-drop
and listening tests. It is a static site (browser-native ES modules, no build step) hosted on
GitHub Pages.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `admin/index.html` | Learner and admin entry pages |
| `app.js` | Application shell: routing, rendering, event handling |
| `styles.css` | All styling |
| `src/core/` | App state (`progress-store.js`) |
| `src/data/` | Alphabet rows and per-family reading content (`readingPractice.json`) |
| `src/features/` | One module per learning mode (family lesson, drag-drop, listen-match, …) |
| `src/services/` | Audio, storage, themes, routing helpers, site login gate |
| `audio/`, `extra-letters/`, `sounds.json` | Letter recordings and the symbol → file mapping |
| `assets/fonts/` | Bundled Noto Sans Ethiopic |
| `data/` | Source word-frequency corpus used to prepare reading content (not deployed) |
| `tools/` | Maintenance scripts (login config generator, audio processing) |
| `tests/` | Node test suite |

See [ARCHITECTURE.md](ARCHITECTURE.md) for module responsibilities and [UPDATES.md](UPDATES.md)
for feature notes.

## Run locally

```bash
./run-local.sh          # serves http://localhost:8000 with caching disabled
```

Without an `auth-config.json` the site opens with no login. To try the login locally:

```bash
SITE_USERNAME=demo SITE_PASSWORD=demo123 node tools/generate-auth-config.mjs
```

`auth-config.json` is git-ignored; delete it to turn the login off again.

## Test

```bash
node --test tests/*.test.mjs
```

## Deploy and login

Pushing to `main` runs `.github/workflows/static.yml`, which publishes only the site files and
generates `auth-config.json` (a salted PBKDF2 hash, never the plaintext) from the repository
secrets `SITE_USERNAME` and `SITE_PASSWORD` (Settings → Secrets and variables → Actions).

GitHub Pages is static, so this login is a client-side gate that keeps casual visitors out; it is
not strong security.
