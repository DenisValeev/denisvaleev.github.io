# Toolbox

A collection of lightweight browser apps served from a single landing page. Each mini-app focuses on quick interactions, from shuffling curated decks to formatting lists for development workflows.

## Available apps

- **Random Jokes** – Shuffle developer-friendly jokes, reveal punchlines on demand, and jump to the full archive when you need more context.
- **Gen Alpha Slang** – Learn trending Gen Alpha terms, shuffle the deck, and reveal definitions when you’re ready for the context.
- **Quotes** – Shuffle themed quote decks, step back whenever you like, and explore every line in the all-in-one archive.
- **Cosine Similarity Lab** – Explore the 0.50+ cosine matches across jokes, quotes, and cross-deck blends, tweak the minimum score, and compare entries side by side with vector stats.
- **Value Formatter** – Turn newline-separated entries into formatted key-value pairs for quick copy/paste in code reviews or data preparation.
- **Asset Observatory** – Summarise dataset payloads, embedding stores, and similarity sweeps across the toolbox with nerdy charts and a full ledger view.

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
- `tests/asset-observatory.spec.js` keeps the asset dashboard honest so charts, summaries, and the ledger stay in sync.
- `tests/home-navigation.spec.js` ensures every app exposes the Home shortcut.

Use `npm run test:ui` if you want to watch the checks in the Playwright inspector while iterating locally. To focus on a single spec, pass its filename to Playwright, for example:

```bash
npx playwright test tests/asset-observatory.spec.js
```

### Refreshing the asset observatory snapshot

Regenerate the observatory’s dataset whenever you add content or tweak embeddings so the dashboard reflects the latest assets:

```bash
node tools/generate-asset-report.js
```

The script inspects every deck’s dataset, manifest, embedding store, similarity report, and upstream source file. It then writes an updated `apps/asset-observatory/asset-data.js` snapshot that the dashboard consumes to render charts and tables. Commit the refreshed file alongside your changes.

## Data maintenance

- Run `node tools/update-content-metadata.js` after refreshing the jokes, quotes, or Gen Alpha slang datasets to assign
  deterministic IDs and regenerate the manifest files under `data/`. The script rewrites `apps/jokes/jokes.js`,
  `apps/quotes/quotes-data.js`, and `apps/gen-alpha/slang.js` in the house style and emits manifest files with normalized
  hashes plus embedding metadata placeholders for downstream deduplication workflows. Use `--dataset=genalpha` to update only
  the slang deck when you do not want to rewrite the larger archives.
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
