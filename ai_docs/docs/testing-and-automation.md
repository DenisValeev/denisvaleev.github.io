# Testing and automation

Playwright drives the regression coverage for the toolbox, and a handful of Node scripts make it easy to run the suite, capture diagnostics, and keep the offline bundle up to date. This guide summarises the workflows.

## npm scripts

| Command | Description |
| --- | --- |
| `npm test` | Runs the full Playwright suite (`playwright test`). The `pretest` hook installs the Chromium binary if it is missing. |
| `npm run test:ui` | Launches the Playwright UI runner for interactive debugging. |
| `npm run test:record` | Executes `tools/record-playwright-log.js` to capture traces, videos, and console logs for each spec. |
| `npm run build:offline` | Invokes `tools/generate-offline-manifest.js` to recompute `offline-manifest.json`. |

Before running tests locally, install dependencies and fetch a browser build:

```bash
npm install
npx playwright install --with-deps chromium
```

Use the lighter `npx playwright install chromium` variant if your environment already satisfies the system dependencies.

## Playwright coverage

| Spec | Responsibility |
| --- | --- |
| `tests/index.spec.js` | Ensures the landing page renders cards, developer shortcuts, and offline status messaging. |
| `tests/home.spec.js` & `tests/home-navigation.spec.js` | Verify every app exposes a Home link back to the landing page. |
| `tests/jokes.spec.js`, `tests/quotes.spec.js`, `tests/slang-app.spec.js` | Exercise shuffle controls, reveal toggles, keyboard shortcuts, and dataset fallbacks. |
| `tests/jokes-dataset.spec.js`, `tests/quotes-data.spec.js`, `tests/slang-dataset.spec.js` | Assert dataset invariants such as unique IDs, punchline availability, and manifest alignment. |
| `tests/jokes-all.spec.js`, `tests/quotes-all.spec.js`, `tests/slang-all.spec.js` | Confirm the archive pages render counts, filters, and table interactions. |
| `tests/value-formatter.spec.js` | Validates preset transforms, persistence, and manual formatting logic. |
| `tests/similarity-report.spec.js` | Covers dataset toggles, threshold sliders, and similarity overlays within the cosine lab. |
| `tests/asset-observatory.spec.js` | Keeps the observatory dashboard aligned with `asset-data.js`. |
| `tests/embedding-explorer.spec.js` | Exercises dataset selection, record filtering, neighbor exploration, and chart updates. |
| `tests/offline-manifest.spec.js` | Confirms the offline manifest enumerates every shipped asset. |

Run individual specs during development with `npx playwright test tests/<name>.spec.js`. Combine this with `npm run test:record` to capture diagnostic bundles when investigating regressions.

## Offline cache lifecycle

- The landing page automatically registers `service-worker.js` and fetches `offline-manifest.json`.
- `npm run build:offline` should be part of any change that adds or removes HTML/JS/JSON assets so cached bundles stay accurate.
- Use the “Refresh offline bundle” button on the landing page to exercise cache resets after updating the manifest.

## Continuous integration

GitHub Actions keep the site fresh after each merge:

- **Playwright smoke tests** run on pushes, pull requests, and a weekly cron schedule. They execute the same suite as `npm test`.
- **Refresh offline manifest** regenerates `offline-manifest.json` after merges so the cache manifest reflects the new asset graph.
- **Refresh asset observatory data** re-runs `tools/generate-asset-report.js` when dataset changes are detected, committing a refreshed `apps/asset-observatory/asset-data.js` snapshot.

Each workflow commits outputs back to the main branch when necessary, ensuring that published assets and cached bundles stay aligned with the source tree.
