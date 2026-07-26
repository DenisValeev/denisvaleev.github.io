# Testing

## Setup

Install dev dependencies and the Chromium browser bundle once per environment:

```bash
npm install
npx playwright install --with-deps chromium
```

Use `npx playwright install chromium` (without `--with-deps`) if your environment already provides the system libraries.

## npm scripts

| Command | What it does |
| --- | --- |
| `npm test` | Runs the full Playwright suite. The `pretest` hook installs Chromium if missing. |
| `npm run test:ui` | Opens the Playwright UI runner for interactive, step-through debugging. |
| `npm run test:record` | Runs `tools/record-playwright-log.js` to capture traces, videos, and console logs for every spec. |
| `npm run build:offline` | Regenerates `offline-manifest.json` via `tools/generate-offline-manifest.js`. |

## Playwright specs

| Spec | Responsibility |
| --- | --- |
| `tests/index.spec.js` | Landing page renders all app cards and developer shortcut links. |
| `tests/home.spec.js` | Every app has a working Home link back to the landing page. |
| `tests/home-navigation.spec.js` | Regression guard ensuring no app loses its Home navigation after UI changes. |
| `tests/jokes.spec.js` | Deck controls, punchline reveal, keyboard shortcuts, and dataset fallbacks for the jokes app. |
| `tests/jokes-dataset.spec.js` | Dataset invariants: unique IDs, punchline presence, manifest alignment. |
| `tests/jokes-all.spec.js` | Archive page renders count, search, and table interactions. |
| `tests/quotes.spec.js` | Deck controls, attribution toggle, keyboard shortcuts for the quotes app. |
| `tests/quotes-data.spec.js` | Dataset invariants for quotes. |
| `tests/quotes-all.spec.js` | Quotes archive page interactions. |
| `tests/slang-app.spec.js` | Deck controls, definition reveal, keyboard shortcuts for the slang app. |
| `tests/slang-dataset.spec.js` | Slang dataset invariants. |
| `tests/slang-all.spec.js` | Slang archive page interactions. |
| `tests/value-formatter.spec.js` | Preset transforms, persistence, and manual formatting logic. |
| `tests/similarity-report.spec.js` | Dataset toggles, score threshold slider, and similarity overlays. |
| `tests/asset-observatory.spec.js` | Observatory dashboard stays aligned with `asset-data.js`. |
| `tests/embedding-explorer.spec.js` | Dataset switching, record filtering, neighbor list, and chart rendering. |
| `tests/offline-manifest.spec.js` | Manifest enumerates every shipped HTML, JS, and JSON asset. |
| `tests/enchanted-bunny.spec.js` | Enchanted bunny app interactions and navigation. |

## Running a single spec

```bash
npx playwright test tests/asset-observatory.spec.js
```

Combine with `--headed` to watch the browser:

```bash
npx playwright test tests/jokes.spec.js --headed
```

## Capturing diagnostics

```bash
npm run test:record
```

Traces and console logs land in `data/test-runs/`. Attach that directory to pull requests when reporting failures.

## What to run after common changes

| Change type | Required checks |
| --- | --- |
| Any HTML/JS/CSS edit | `npm test` |
| Deck dataset edit (jokes/quotes/slang) | `npm test` focusing on the matching dataset + app + all specs |
| Asset observatory data refresh | `npx playwright test tests/asset-observatory.spec.js` |
| Offline manifest regeneration | `npx playwright test tests/offline-manifest.spec.js` |
| Enchanted bunny changes | `npx playwright test tests/enchanted-bunny.spec.js tests/home-navigation.spec.js` |
| New app added | `npm test` (index + home-navigation specs in particular) |

## Continuous integration (GitHub Actions)

Three workflows run automatically:

1. **Playwright smoke tests** — runs `npm test` on every push, pull request, and a weekly cron. Same command as local.
2. **Refresh offline manifest** — triggers after a PR merges; regenerates `offline-manifest.json` and commits it.
3. **Refresh asset observatory data** — triggers when dataset files change in a merged PR; re-runs `tools/generate-asset-report.js` and commits the updated snapshot.

A fourth **Deploy static site** workflow publishes the repository to GitHub Pages. It writes `.nojekyll` to skip Jekyll processing.
