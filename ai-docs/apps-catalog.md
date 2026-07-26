# Apps catalog

Each app lives under `apps/<name>/`. The sections below describe the purpose, key files, data dependencies, and Playwright coverage for every tool.

---

## Dad Jokes (`apps/jokes`)

**Purpose.** Shuffle a curated deck of developer-friendly jokes, reveal punchlines on demand, and browse the full archive in a searchable table.

**Key files.**
- `index.html` — Deck UI with shuffle, prev, next controls and a punchline toggle.
- `app.js` — Shuffles the dataset, renders the active joke, wires keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Space`), and guards for missing DOM nodes.
- `jokes.js` — Dataset: `window.jokes = [{ joke, punchline, id, sourceId }, ...]`.
- `all-jokes.html` + `render-all.js` — Archive table with search, filter, and a `data-count` badge.
- `AGENTS.md` — Dataset validation commands and maintenance notes.

**Data dependencies.** `data/jokes-manifest.json`, `data/jokes-embeddings*.json`, `data/similarity-report-jokes*.json`.

**Test coverage.** `tests/jokes.spec.js`, `tests/jokes-dataset.spec.js`, `tests/jokes-all.spec.js`, `tests/home-navigation.spec.js`.

---

## Quotes (`apps/quotes`)

**Purpose.** Surface themed quote decks, reveal full attribution, and maintain deterministic metadata for deduplication analysis.

**Key files.**
- `index.html` — Shuffle UI mirroring the jokes experience.
- `app.js` — Active deck management, keyboard shortcuts, attribution toggle.
- `quotes-data.js` — Dataset: `window.quotesData = [{ text, author, tags, id }, ...]`.
- `all-quotes.html` + `render-all.js` — Archive table with filters and count badge.
- `AGENTS.md` — Validation commands.

**Data dependencies.** `data/quotes-manifest.json`, `data/quotes-embeddings*.json`, `data/similarity-report-quotes*.json`, `data/similarity-overrides.json`.

**Test coverage.** `tests/quotes.spec.js`, `tests/quotes-data.spec.js`, `tests/quotes-all.spec.js`, `tests/home-navigation.spec.js`.

---

## Slang (`apps/slang`)

**Purpose.** Educate visitors on trending internet slang with reveal-on-demand definitions and a searchable archive.

**Key files.**
- `index.html` + `app.js` — Shuffle UI and reveal toggle targeting `window.slangEntries`.
- `slang.js` — Dataset: `window.slangEntries = [{ term, definition, id }, ...]`.
- `all-slang.html` + `render-all.js` — Archive listing with search and count badge.
- `AGENTS.md` — Threshold settings and validation notes.

**Data dependencies.** `data/slang-manifest.json`, `data/slang-embeddings*.json`, `data/similarity-report-slang*.json`.

**Test coverage.** `tests/slang-app.spec.js`, `tests/slang-dataset.spec.js`, `tests/slang-all.spec.js`, `tests/home-navigation.spec.js`.

---

## Cosine Similarity Lab (`apps/similarity-report`)

**Purpose.** Visualise cosine-similar pairs across jokes, quotes, and slang. Toggle datasets and providers, adjust the minimum score, and inspect per-entry vector statistics.

**Key files.**
- `index.html` — Standalone HTML+JS document that fetches and renders similarity reports.

**Data dependencies.** `data/similarity-report-*.json`, `data/similarity-overrides.json`.

**Regenerate.** `node tools/review-content-similarity.js` with the appropriate `--dataset` and `--provider` flags.

**Test coverage.** `tests/similarity-report.spec.js`.

---

## Asset Observatory (`apps/asset-observatory`)

**Purpose.** Dashboard for dataset counts, embedding stores, similarity report stats, and upstream sources powering the toolbox.

**Key files.**
- `index.html` — Layout for cards, provider summaries, cross-deck rollups, and ledger table.
- `app.js` — Loads `asset-data.js`, renders the dashboard, and wires filter controls.
- `asset-data.js` — Machine-generated snapshot from `tools/generate-asset-report.js`.
- `AGENTS.md` — Regeneration command and regression checks.

**Regenerate.** `node tools/generate-asset-report.js` whenever datasets, embeddings, or similarity reports change.

**Test coverage.** `tests/asset-observatory.spec.js`.

---

## Embedding Explorer (`apps/embedding-explorer`)

**Purpose.** Inspect stored embedding vectors, compare records, and visualise high-impact dimensions via histograms and heatmaps.

**Key files.**
- `index.html` — Dashboard with dataset selector, record filter, neighbor list, and dual canvas plots.
- `app.js` — Decodes base64 vectors, computes statistics, renders charts, highlights strongest dimensions.
- `sample-embeddings.js` — Bundled sample definitions: `window.embeddingSources`.

**Data dependencies.** Reads live embedding stores from `data/` when available.

**Test coverage.** `tests/embedding-explorer.spec.js`.

---

## Value Formatter (`apps/value-formatter`)

**Purpose.** Transform newline-separated values into templated output for quick copy/paste in code reviews or data preparation.

**Key files.**
- `index.html` — Single-page UI with preset transforms, custom script inputs, and persisted textarea state via `localStorage`. All logic lives inline.

**Data dependencies.** None. Persists user input in `localStorage`.

**Test coverage.** `tests/value-formatter.spec.js`.

---

## Wiki (`apps/wiki`)

**Purpose.** Browse a curated collection of articles rendered in the browser.

**Key files.**
- `index.html` — App shell and navigation.
- `app.js` — Article loading and rendering logic.
- `articles/` — Individual article files.

**Test coverage.** Covered by `tests/home-navigation.spec.js`.

---

## Total Recall (`apps/total-recall`)

**Purpose.** Interactive recall or memorisation tool.

**Key files.**
- `index.html` — Full app with inline styles.
- `app.js` — Core interaction logic.

**Test coverage.** Covered by `tests/home-navigation.spec.js`.

---

## Enchanted Forest Bunny (`apps/enchanted-bunny`)

**Purpose.** An interactive animated forest-bunny toy with touch/pointer interactivity, designed for mobile home-screen install (PWA-lite via `apple-mobile-web-app-capable`).

**Key files.**
- `index.html` — Full app (2000+ lines) with inline CSS, canvas animations, and self-contained JS.
- `apple-touch-icon.png` — Home-screen icon.

**Theming.** Uses `color-scheme: only light` with a deep forest palette.

**Test coverage.** `tests/enchanted-bunny.spec.js`, `tests/home-navigation.spec.js`.

---

## Moonpetal Bunny Choir (`apps/bunny-moon-choir`)

**Purpose.** An atmospheric animated toy featuring bunnies in a moonlit scene.

**Key files.**
- `index.html` — Self-contained HTML with inline CSS and JS. Uses `color-scheme: only light`.

**Test coverage.** Covered by `tests/home-navigation.spec.js`.

---

## Cloth Lab (`apps/cloth`)

**Purpose.** Real-time physics-based cloth simulator. Users can drag, pin, and slice the cloth.

**Key files.**
- `index.html` — App shell with semantic markup and control panel.
- `main.js` — Physics engine and canvas rendering.
- `styles.css` — External stylesheet (the only app to use a linked CSS file instead of inline styles).

**Test coverage.** Covered by `tests/home-navigation.spec.js`.

---

## Landing page integration rules

- Every app must expose a **Home** link pointing to `../../` so `tests/home-navigation.spec.js` passes.
- Each app needs a card in `index.html` (`<a class="app-card">` in the `<ul class="apps">` list, or an `<a class="app-button">` in the tools section).
- New assets must be included in `offline-manifest.json` via `npm run build:offline`.
- Add or extend Playwright specs under `tests/` for any new interactive surface.
