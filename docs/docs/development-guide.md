# Development guide

This guide distils the practices captured across the repository’s `AGENTS.md` files and README so contributors can keep the toolbox consistent.

## Coding conventions

- **HTML & CSS.** Use two-space indentation in modernised files. When editing legacy documents (for example the value formatter), match the surrounding style rather than reflowing the whole file. Keep styles inline and honour the established CSS custom properties so light/dark themes stay balanced.
- **JavaScript.** Wrap app scripts in IIFEs, prefer `const`/`let`, and guard for missing DOM nodes before wiring events. Datasets expose arrays via `window.*` assignments; filter falsy entries before rendering, and fall back to friendly copy (“No jokes available.”) when arrays are empty.
- **Accessibility.** Mirror the existing ARIA patterns: `aria-live` for progress updates, `aria-pressed` on toggle buttons, focus-visible styles for keyboard users, and labelled navigation landmarks.
- **Buttons and controls.** Always set `type="button"` on buttons that are not submitting forms. Provide hover/focus styles that match the landing page’s gradient buttons.

## Working with datasets

- Keep deck datasets (`apps/jokes/jokes.js`, `apps/quotes/quotes-data.js`, `apps/slang/slang.js`) valid JavaScript modules. Stick to the generated formatting and double quotes so diffs highlight content changes only.
- After editing entries, run the quick checks from each app’s `AGENTS.md` file to confirm the globals (`window.jokes`, `window.quotesData`, `window.slangEntries`) are populated.
- Regenerate manifests and embeddings as described in the **Data maintenance** guide. Update similarity overrides when intentionally keeping near-duplicates.

## Adding or updating apps

1. Create a folder under `apps/<name>/` with `index.html`, any supporting datasets, and a script entry point (`app.js`).
2. Follow the landing page card pattern (`<a class="app-button">`) and add the new card to `index.html`. Include developer shortcut links in the `.dev-tools` section when relevant. Pick an emoji or icon that is unique across the landing page so no two apps share the same symbol.
3. If the app ships multiple pages (archives, compact views), ensure each page exposes a Home link (`../../`) so `tests/home-navigation.spec.js` and `tests/home.spec.js` stay green.
4. Update `offline-manifest.json` via `npm run build:offline` so the service worker caches the new assets.
5. Add or extend Playwright specs under `tests/` to cover the new surface area.

## Offline workflow

- Keep `service-worker.js` and `offline-manifest.json` in sync. Whenever assets move or new pages appear, rerun `npm run build:offline` and smoke-test the offline card on the landing page.
- Use the reset button in the offline card to verify cache updates after changing the manifest.

## Tooling expectations

- Run Playwright locally (`npm test`) before shipping major UI or dataset changes. If browsers are missing, install them with `npx playwright install --with-deps chromium`.
- When touching dataset-heavy apps, run the focused specs (for example `npx playwright test tests/asset-observatory.spec.js`).
- Capture diagnostics with `npm run test:record` if you encounter flaky behaviour and attach the resulting `data/test-runs/` bundle to the investigation.

## Documentation upkeep

- The `docs/` folder hosts this documentation hub. Whenever you add a new guide, update `docs/index.html` to register it in the navigation.
- Keep the docs in sync with behavioural changes (new scripts, updated datasets, revised tests). Treat documentation updates as part of each pull request that changes workflows.
