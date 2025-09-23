# Toolbox

A collection of lightweight browser apps served from a single landing page. Each mini-app focuses on quick interactions, from shuffling curated decks to formatting lists for development workflows.

## Available apps

- **Random Jokes** – Shuffle developer-friendly jokes, reveal punchlines on demand, and jump to the full archive when you need more context.
- **Quotes** – Shuffle themed quote decks, step back whenever you like, and explore every line in the all-in-one archive.
- **Cosine Similarity Lab** – Explore the 0.50+ cosine matches across jokes, quotes, and cross-deck blends, tweak the minimum score, and compare entries side by side with vector stats.
- **Value Formatter** – Turn newline-separated entries into formatted key-value pairs for quick copy/paste in code reviews or data preparation.
- **Playwright Run Telemetry** – Inspect JSON-backed timelines from the automated smoke tests, filter statuses, and review per-spec activity logs directly from the bundled JSON report.

## Usage

Open `index.html` in any modern browser to launch the landing page, then choose the tool you need. Every app runs entirely on the client, so no build step or backend setup is required.

## Local development

Because the site is static, you can use any local web server for live reloads while editing files. For example, from the repository root:

```bash
npx serve .
```

This starts a server on <http://localhost:3000> (or the next available port).

## Testing

Install the dev dependencies and download the Playwright browser bundle the first time you set up the repo:

```bash
npm install
npx playwright install
```

On fresh machines that lack the Chromium dependencies, run `npx playwright install --with-deps chromium` instead of the plain install above.

With the tooling in place, execute the full suite:

```bash
npm test
```

The tests spin up a temporary `python -m http.server` instance and exercise every interactive surface:

- `tests/index.spec.js` keeps the landing grid honest so newly added apps remain discoverable.
- `tests/jokes.spec.js` and `tests/quotes.spec.js` cover the deck navigation, punchline reveals, category filtering, and keyboard shortcuts.
- `tests/value-formatter.spec.js` validates preset transforms, ad-hoc scripts, and persistence.
- `tests/similarity-report.spec.js` exercises dataset toggles, thresholds, and similarity overlays.
- `tests/run-telemetry.spec.js` walks through the telemetry console filters, detail panel, and refresh flow.

Use `npm run test:ui` if you want to watch the checks in the Playwright inspector while iterating locally. To focus on a single spec, pass its filename to Playwright, for example:

```bash
npx playwright test tests/run-telemetry.spec.js
```

### Refreshing the telemetry console

Run the dedicated recording script whenever you want to update the live log that powers `apps/run-telemetry/`:

```bash
npm run test:record
```

The helper executes the full suite with the line reporter, normalizes absolute paths inside the generated JSON, and writes the result to `data/test-runs/latest.json`. The telemetry console fetches this file (or falls back to the bundled snapshot when you are offline) and surfaces each spec’s timeline, errors, and attachments. Commit the refreshed JSON when you want the static site to showcase the latest run.

## Data maintenance

- Run `node tools/update-content-metadata.js` after refreshing the jokes or quotes datasets to assign deterministic IDs and
  regenerate the manifest files under `data/`. The script rewrites `apps/jokes/jokes.js` and `apps/quotes/quotes-data.js` in the
  house style and emits `data/jokes-manifest.json` / `data/quotes-manifest.json` with normalized hashes and embedding metadata
  placeholders for downstream deduplication workflows.
- Use `node tools/review-content-similarity.js` to fetch embeddings from public APIs (OpenAI, Cohere, Hugging Face, or the
  built-in deterministic `fake` provider), persist them under `data/*-embeddings.json`, and surface cosine-similar pairs for
  manual review. Pass `--write` to persist embeddings, `--update-manifest` to sync embedding metadata back into the manifests,
  and `--report=reports/{dataset}-duplicates.json` to generate JSON reports for auditing runs. A free option is available via
  `--provider=hfspace --model=bienkieu/sentence-embedding`, which pipes batches through the BienKieu Hugging Face Space
  (`sentence-transformers/all-MiniLM-L6-v2`) using `curl`—no API key required. Keep `--batch-size` at 8 or lower to avoid the
  shared queue timing out.
  - When onboarding an external batch of jokes, run `node tools/onboard-external-jokes.js --input=path/to/new-jokes.json` to
    compare each candidate against the active embeddings for `fake`, `openai`, and `cohere`. Provide specific candidate
    embedding stores with `--candidate-embeddings=fake:path,openai:path,...` or let the script fall back to deterministic
    vectors when API-derived stores are unavailable. The summary report highlights rejections above the cosine threshold
    (default `0.8`) and can emit filtered JSON via `--output` / `--accepted-output` for follow-up curation.
  - When onboarding new material, add `--candidates=jokes:path/to/new-jokes.json` (or `quotes:...`) to embed the prospective
    entries and compare them against the existing decks at the current cosine threshold. Candidate files accept arrays of
    objects that mirror the dataset fields (`joke`/`punchline` for jokes, `text`/`author` for quotes) and reuse the active
    `--provider`/`--model` combination so duplicates are flagged before committing new content.
- Apply the curated duplicate removals with `node tools/prune-duplicate-records.js`. Use `--dry-run` to preview how many
  jokes, quotes, and embedding vectors would be pruned before writing the updated datasets, manifests, and stores back to disk.
