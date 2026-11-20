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
| `writing-excercises/` | Printable A4 PDF handwriting worksheets for all 27 alphabet families (regenerate with `node tools/generate-worksheets.mjs`) |
| `data/` | Source word-frequency corpus used to prepare reading content (not deployed) |
| `tools/` | Maintenance scripts (login config generator, audio processing) |
| `tests/` | Node test suite |

Many alphabet recordings are from [Mesmer Tigrinya's alphabet chart](https://mesmertigrinya.com/alphabet-chart).
Other letters and sound effects retain the existing recordings. Check the source's
[terms](https://mesmertigrinya.com/terms) and obtain the necessary permission before distributing
or publishing its recordings.

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
If the login configuration exists but cannot be loaded or is invalid, the app displays an
error instead of silently opening without a login.

On learner pages, use the fixed **Settings** menu at the bottom of the screen to change
the color, reset progress, or log out when site login is enabled.

## Test

```bash
node --test tests/*.test.mjs
```

## Deploy and login

Set Settings → Pages → Build and deployment → Source to **GitHub Actions**. Pushing to `main`
or manually running `.github/workflows/static.yml` publishes only the site files to GitHub Pages.
If both repository secrets `SITE_USERNAME` and `SITE_PASSWORD` are configured (Settings →
Secrets and variables → Actions), the workflow generates `auth-config.json` with a salted PBKDF2
hash, never the plaintext. If either secret is missing, it warns and deploys without a login.

GitHub Pages is static, so this login is a client-side gate that keeps casual visitors out; it is
not strong security.
