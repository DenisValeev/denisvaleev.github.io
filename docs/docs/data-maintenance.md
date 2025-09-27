# Data maintenance

Content-heavy apps rely on shared datasets stored under `data/` plus machine-generated snapshots that live alongside each app. This guide documents the files that need to stay in sync and the scripts that regenerate them.

## Directory overview

| File | Description |
| --- | --- |
| `jokes-manifest.json`, `quotes-manifest.json`, `slang-manifest.json` | Deterministic manifests produced by `tools/update-content-metadata.js`. They record record hashes, canonical IDs, total counts, and metadata used by downstream scripts. |
| `*-embeddings.json`, `*-embeddings-openai.json`, `*-embeddings-cohere.json`, `slang-embeddings-hfspace.json`, `slang-embeddings-synthetic128.json` | Embedding stores keyed by record IDs. These power the similarity reports, the embedding explorer, and duplicate detection workflows. |
| `similarity-report-*.json` | Cosine similarity sweeps grouped by dataset and provider (synthetic, OpenAI, Cohere, HF space, synthetic-128). Cross-deck variants highlight overlaps between jokes, quotes, and slang. |
| `similarity-overrides.json` | Flags intentional near-duplicates so the cosine similarity lab can highlight protected pairs instead of suggesting removals. |
| `test-runs/` | Archives Playwright trace data and logs captured by `tools/record-playwright-log.js` to help diagnose failures. |

## Updating deck datasets

1. Edit the dataset files under `apps/jokes/jokes.js`, `apps/quotes/quotes-data.js`, or `apps/slang/slang.js`.
2. Run the syntax and shape checks documented in each app’s `AGENTS.md` file (`node --check ...` and the `node -e` globals check).
   - For jokes specifically, ensure every record includes a `sourceId` that matches one of the curated assets surfaced in `apps/asset-observatory/asset-data.js`. New sources should land under `data/` with capture notes so provenance survives future refreshes.
3. Regenerate metadata and manifests:
   ```bash
   node tools/update-content-metadata.js --dataset=jokes
   node tools/update-content-metadata.js --dataset=quotes
   node tools/update-content-metadata.js --dataset=slang
   ```
   Pass `--dataset=<name>` to target a single collection when needed.
4. Refresh embeddings for duplicate detection. Typical commands:
   ```bash
   node tools/review-content-similarity.js --dataset=jokes --provider=synthetic --write --update-manifest
   node tools/review-content-similarity.js --dataset=jokes --provider=hfspace --model=bienkieu/sentence-embedding --batch-size=8 --report=data/similarity-report-jokes.json
   node tools/review-content-similarity.js --dataset=quotes --provider=openai --write --update-manifest
   node tools/review-content-similarity.js --dataset=slang --provider=synthetic --threshold-slang=0.8 --write --update-manifest
   ```
   Adjust providers and options according to your API access and the thresholds documented in `apps/slang/AGENTS.md` and the repository README.
5. Review high-similarity pairs and move intentional overlaps into `data/similarity-overrides.json` so the similarity lab highlights them as protected.
6. Commit refreshed datasets, manifests, embeddings, and similarity reports together to keep the bundle consistent.

## Regenerating similarity reports

- `tools/review-content-similarity.js` emits JSON files such as `data/similarity-report-jokes.json`, `data/similarity-report-quotes-openai.json`, and `data/similarity-report-cross-deck.json`.
- Pass `--provider=<source>` plus `--write` and `--report=...` to persist new embeddings and the matching report. Providers include:
  - `synthetic` for deterministic vectors embedded locally.
  - `hfspace` for the BienKieu Hugging Face Space (`sentence-transformers/all-MiniLM-L6-v2`).
  - `openai` and `cohere` for API-based embeddings when credentials are available.
- Use `--threshold-<dataset>` flags to enforce dataset-specific duplication caps (for example, `--threshold-slang=0.8`).
- After generating reports, rerun `node tools/generate-asset-report.js` so the asset observatory reflects the new counts and byte sizes.

## Maintaining the asset observatory snapshot

- The observatory reads `apps/asset-observatory/asset-data.js`, a machine-generated file containing dataset counts, provider rollups, cross-deck statistics, and ledger rows.
- Regenerate it via:
  ```bash
  node tools/generate-asset-report.js
  ```
- The script inspects dataset files, manifests, embedding stores, similarity reports, and upstream sources. It records totals for entries, bytes, and asset counts per provider, plus cross-deck similarity pairs.
- Commit the updated snapshot along with the underlying dataset changes so the dashboard stays consistent.

## Offline manifest refreshes

- Any change to HTML, JavaScript, or JSON assets requires regenerating `offline-manifest.json`:
  ```bash
  npm run build:offline
  ```
- The generator computes SHA-256 digests, total bytes, asset counts, and Git metadata. The manifest’s version feeds directly into the service worker’s cache key.
- After updating the manifest, reload the landing page to confirm the offline card reflects the new bundle size.

## Diagnostics and audit logs

- Run `node tools/record-playwright-log.js` to capture Playwright traces for failing specs. Output lives under `data/test-runs/` with timestamps and spec names.
- Use the JSON artifacts inside `test-runs/` to reproduce test paths or share failure context in pull requests.
