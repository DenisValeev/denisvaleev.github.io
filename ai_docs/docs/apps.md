---
layout: ai_docs
title: App catalog
summary: Mini-app responsibilities and regressions
nav_order: 3
permalink: /ai_docs/apps/
last_updated: 2024-05-07
---

# App catalog

Each mini app lives under `apps/<name>/` with inline styles, a focused script, and any supporting datasets it needs. The landing page links directly to every `index.html`, and many collections ship an additional `all-*.html` archive that renders the full dataset in a searchable table. This catalog summarises the responsibilities, data dependencies, and regression coverage for each tool.

## Dad Jokes (`apps/jokes`)

- **Purpose.** Shuffle a curated deck of developer-friendly jokes, reveal punchlines on demand, and explore the full archive when you need deeper context.
- **Key files.**
  - `index.html` – Deck UI with shuffle/prev/next controls, keyboard shortcuts, and a punchline toggle.
  - `app.js` – Guards missing DOM nodes, shuffles the dataset, renders the current joke, and wires keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Space`).
  - `jokes.js` – Dataset that assigns an array of `{ joke, punchline }` objects to `window.jokes`.
  - `all-jokes.html` & `render-all.js` – Table view with search/filter controls and a badge that reflects the dataset count via `data-count`.
- **Data maintenance.** Update jokes with `tools/update-content-metadata.js`, regenerate embeddings with `tools/review-content-similarity.js`, and use the commands in `apps/jokes/AGENTS.md` to validate syntax and spot duplicates.
- **Regression coverage.** `tests/jokes.spec.js` covers deck navigation; `tests/jokes-dataset.spec.js` verifies dataset invariants; `tests/home-navigation.spec.js` confirms the Home shortcut.

## Quotes (`apps/quotes`)

- **Purpose.** Surface themed quote decks with shuffle controls, reveal the full backlog, and maintain deterministic metadata for dedupe analysis.
- **Key files.**
  - `index.html` – Shuffle UI mirroring the jokes experience.
  - `app.js` – Maintains the active deck, handles keyboard shortcuts, and toggles the quote attribution display.
  - `quotes-data.js` – Dataset assigned to `window.quotesData` with `{ text, author, tags }` entries.
  - `all-quotes.html` & `render-all.js` – Archive table with search and filter affordances plus the dataset count badge.
- **Data maintenance.** Refresh the dataset metadata with `tools/update-content-metadata.js --dataset=quotes`, rerun embeddings for duplicate detection, and keep `data/quotes-embeddings*.json` in sync. Similarity overrides live in `data/similarity-overrides.json`.
- **Regression coverage.** `tests/quotes.spec.js` exercises the deck UI, `tests/quotes-all.spec.js` covers the archive table, and `tests/quotes-data.spec.js` checks dataset integrity.

## Slang (`apps/slang`)

- **Purpose.** Educate visitors on trending internet slang with reveal-on-demand definitions and a searchable archive.
- **Key files.**
  - `index.html` and `app.js` – Shuffle UI, reveal toggle, and keyboard shortcuts identical to the jokes/quotes decks but targeting `window.slangEntries`.
  - `slang.js` – Dataset assigned to `window.slangEntries`.
  - `all-slang.html` & `render-all.js` – Archive listing with search, filters, and the dataset count badge.
- **Data maintenance.** Follow `apps/slang/AGENTS.md`: run the syntax checks, regenerate metadata (`tools/update-content-metadata.js --dataset=slang`), and refresh embeddings via `tools/review-content-similarity.js` for the synthetic, Hugging Face, and 128-dimension stores.
- **Regression coverage.** `tests/slang-app.spec.js`, `tests/slang-all.spec.js`, and `tests/slang-dataset.spec.js` validate the UI, archive view, and dataset respectively.

## Cosine Similarity Lab (`apps/similarity-report`)

- **Purpose.** Visualise cosine-similar joke/quote/slang pairs, toggle datasets and providers, and inspect per-entry vector statistics.
- **Key files.**
  - `index.html` – Standalone HTML+JS document that fetches the similarity reports under `data/`, renders dataset toggles, and presents side-by-side comparisons.
  - Consumes `data/similarity-report-*.json` plus overrides declared in `data/similarity-overrides.json`.
- **Data maintenance.** Regenerate similarity reports with `tools/review-content-similarity.js` whenever embeddings change. The tool reads cross-deck reports (`data/similarity-report-cross-deck*.json`) alongside per-dataset outputs.
- **Regression coverage.** `tests/similarity-report.spec.js` exercises dataset filtering, score thresholds, and keyboard shortcuts.

## Asset Observatory (`apps/asset-observatory`)

- **Purpose.** Provide a high-level dashboard for dataset counts, embedding stores, similarity reports, and upstream sources powering the toolbox.
- **Key files.**
  - `index.html` – Layout and visualisations for the dataset cards, provider summaries, cross-deck rollups, and ledger table.
  - `app.js` – Loads `asset-data.js`, renders the dashboard, and wires filtering controls.
  - `asset-data.js` – Machine-generated snapshot produced by `tools/generate-asset-report.js`.
- **Data maintenance.** Run `node tools/generate-asset-report.js` whenever datasets, embeddings, or similarity reports change. The `apps/asset-observatory/AGENTS.md` file captures the workflow and regression command.
- **Regression coverage.** `tests/asset-observatory.spec.js` ensures cards, charts, and counts stay aligned with the snapshot.

## Embedding Explorer (`apps/embedding-explorer`)

- **Purpose.** Inspect embedding vectors, compare dataset records, and visualise high-impact dimensions.
- **Key files.**
  - `index.html` – Dashboard layout with dataset selector, record filter, neighbor list, and dual canvas plots.
  - `app.js` – Parses sample embeddings, decodes base64 vectors, computes statistics, renders histograms, and highlights the strongest positive/negative dimensions.
  - `sample-embeddings.js` – Bundled dataset and metadata sources exposed as `window.embeddingExplorerSamples` and `window.embeddingSources`.
- **Data maintenance.** Update `sample-embeddings.js` when adding new demo vectors. The explorer reads live datasets by decoding the base64 payloads from the embeddings stores in `data/` when available.
- **Regression coverage.** `tests/embedding-explorer.spec.js` verifies dataset switching, record filtering, neighbor insights, and chart rendering.

## Value Formatter (`apps/value-formatter`)

- **Purpose.** Transform newline-separated values into templated output for quick copy/paste workflows.
- **Key files.**
  - `index.html` – Single-page interface with preset transforms, custom transform inputs, and textareas for input/output. Stores the latest input in `localStorage` so the session persists.
  - All logic lives inline inside `<script>` tags; the app does not depend on external datasets.
- **Data maintenance.** None required beyond keeping the presets up to date. The tool stores user input locally and has no background data dependencies.
- **Regression coverage.** `tests/value-formatter.spec.js` validates presets, persistence, and manual transformations.

## Landing page integration

- Every app exposes a “Home” navigation link that returns to `../../`, satisfying `tests/home-navigation.spec.js` and `tests/home.spec.js`.
- The landing page’s `tests/index.spec.js` ensures new tools register their cards and developer shortcuts.
- When adding an app, update `index.html` with the new card and extend the offline manifest so the service worker caches the new assets.
