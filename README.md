# Toolbox

A collection of lightweight browser apps served from a single landing page. Each mini-app focuses on quick interactions, from shuffling curated decks to formatting lists for development workflows.

## Available apps

- **Random Jokes** – Shuffle developer-friendly jokes, reveal punchlines on demand, and jump to the full archive when you need more context.
- **Quotes** – Shuffle themed quote decks, step back whenever you like, and explore every line in the all-in-one archive.
- **Cosine Similarity Lab** – Explore the 0.50+ cosine matches across jokes, quotes, and cross-deck blends, tweak the minimum score, and compare entries side by side with vector stats.
- **Value Formatter** – Turn newline-separated entries into formatted key-value pairs for quick copy/paste in code reviews or data preparation.

## Usage

Open `index.html` in any modern browser to launch the landing page, then choose the tool you need. Every app runs entirely on the client, so no build step or backend setup is required.

## Local development

Because the site is static, you can use any local web server for live reloads while editing files. For example, from the repository root:

```bash
npx serve .
```

This starts a server on <http://localhost:3000> (or the next available port).

## Testing

Install the dev dependencies once and run the Playwright smoke checks whenever you touch the interactive apps:

```bash
npm install
npx playwright install
npm test
```

The test runner launches a temporary `python -m http.server` instance, loads the Cosine Similarity Lab, and asserts that the dynamic thresholding and Levenshtein metrics render. Use `npm run test:ui` if you want to watch the checks in the Playwright inspector while iterating locally. `npx playwright install --with-deps` is handy the first time you set things up on a fresh machine that needs the browser dependencies.

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
  - When onboarding new material, add `--candidates=jokes:path/to/new-jokes.json` (or `quotes:...`) to embed the prospective
    entries and compare them against the existing decks at the current cosine threshold. Candidate files accept arrays of
    objects that mirror the dataset fields (`joke`/`punchline` for jokes, `text`/`author` for quotes) and reuse the active
    `--provider`/`--model` combination so duplicates are flagged before committing new content.
- Apply the curated duplicate removals with `node tools/prune-duplicate-records.js`. Use `--dry-run` to preview how many
  jokes, quotes, and embedding vectors would be pruned before writing the updated datasets, manifests, and stores back to disk.
