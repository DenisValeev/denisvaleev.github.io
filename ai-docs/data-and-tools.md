# Data and tools

## Data directory (`data/`)

| File(s) | Description |
| --- | --- |
| `jokes-manifest.json` | Deterministic manifest for the jokes deck: record hashes, IDs, total count, embedding metadata. |
| `quotes-manifest.json` | Same for quotes. |
| `slang-manifest.json` | Same for slang. |
| `jokes-embeddings.json` | Synthetic/deterministic embedding store keyed by record ID. |
| `jokes-embeddings-openai.json` | OpenAI embedding store. |
| `jokes-embeddings-cohere.json` | Cohere embedding store. |
| `quotes-embeddings*.json` | Equivalent stores for the quotes deck. |
| `slang-embeddings.json` | Synthetic store for slang. |
| `slang-embeddings-hfspace.json` | Hugging Face Space embeddings (`sentence-transformers/all-MiniLM-L6-v2`). |
| `slang-embeddings-synthetic128.json` | 128-dimension deterministic store for slang. |
| `similarity-report-*.json` | Cosine similarity sweeps per dataset and provider. Cross-deck variants have a `cross-deck` infix. |
| `similarity-overrides.json` | Intentionally kept near-duplicates; the similarity lab highlights these pairs as "protected" instead of flagging them for removal. |
| `test-runs/` | Playwright trace archives and console logs captured by `tools/record-playwright-log.js`. |

## Maintenance scripts (`tools/`)

### `update-content-metadata.js`

Regenerates deterministic IDs and manifest files for one or all content decks.

```bash
# Update all three decks
node tools/update-content-metadata.js

# Update only one deck
node tools/update-content-metadata.js --dataset=slang
```

Rewrites `apps/jokes/jokes.js`, `apps/quotes/quotes-data.js`, and `apps/slang/slang.js` in the house style. Emits `data/*-manifest.json` files with normalised hashes and embedding metadata placeholders.

---

### `review-content-similarity.js`

Fetches or computes embeddings and produces cosine similarity reports.

```bash
# Synthetic provider (no API key required)
node tools/review-content-similarity.js \
  --dataset=jokes --provider=synthetic \
  --write --update-manifest \
  --report=data/similarity-report-jokes.json

# Hugging Face Space (free, no key required; keep batch-size ≤ 8)
node tools/review-content-similarity.js \
  --dataset=slang \
  --provider=hfspace \
  --model=bienkieu/sentence-embedding \
  --batch-size=8 \
  --write --update-manifest \
  --report=data/similarity-report-slang.json

# OpenAI or Cohere (API key required)
node tools/review-content-similarity.js \
  --dataset=quotes --provider=openai \
  --write --update-manifest
```

Key flags:
- `--write` — persist embeddings to disk.
- `--update-manifest` — sync embedding metadata back into the manifest files.
- `--report=<path>` — write the similarity report JSON.
- `--threshold-<dataset>=<value>` — dataset-specific cosine threshold (e.g. `--threshold-slang=0.8`).
- `--candidates=<type>:<path>` — embed prospective entries from a file and compare against the existing deck.

**Duplicate thresholds.** Cosine scores ≥ 0.8 are treated as duplicates for quotes and slang. New jokes should also be screened at 0.8.

---

### `generate-asset-report.js`

Inspects datasets, manifests, embedding stores, and similarity reports to produce `apps/asset-observatory/asset-data.js`.

```bash
node tools/generate-asset-report.js
```

Run this after any dataset or embedding change. Commit the refreshed `asset-data.js` alongside the underlying changes.

---

### `generate-offline-manifest.js`

Walks every HTML, JSON, and JS asset, computes SHA-256 digests and byte sizes, and writes `offline-manifest.json`. Called by `npm run build:offline`.

```bash
npm run build:offline
```

Run this after any change to files under `apps/`, `data/`, or `index.html`. The resulting manifest file must be committed together with the asset changes.

---

### `onboard-external-jokes.js`

Screens a batch of candidate jokes against the curated deck using cosine similarity, rejects near-duplicates, and emits summary reports.

```bash
node tools/onboard-external-jokes.js \
  --input=data/new-jokes.json \
  --output=reports/summary.json \
  --accepted-output=reports/accepted.json
```

Candidate JSON format:
```json
[
  { "id": "joke-001", "joke": "Why did the build fail?", "punchline": "Missing semicolon." }
]
```

After acceptance: manually fold `reports/accepted.json` entries into `apps/jokes/jokes.js`, then run the standard dataset maintenance chain.

---

### `prune-duplicate-records.js`

Applies curated duplicate removals to datasets, manifests, and embedding stores.

```bash
# Preview without writing
node tools/prune-duplicate-records.js --dry-run

# Apply changes
node tools/prune-duplicate-records.js
```

---

### `update-content-metadata.js` (also handles slang-only)

```bash
node tools/update-content-metadata.js --dataset=slang
```

Pass `--dataset=<name>` to update only one collection.

---

### `record-playwright-log.js`

Captures Playwright traces, videos, and console output for each spec. Output goes to `data/test-runs/` with timestamps.

```bash
npm run test:record
```

Use the resulting bundles to reproduce failures or attach diagnostics to pull requests.

---

## Full dataset refresh workflow

Run this sequence after any deck-level content change:

```bash
# 1. Regenerate IDs and manifests
node tools/update-content-metadata.js

# 2. Refresh embeddings and similarity reports
node tools/review-content-similarity.js --dataset=jokes --provider=synthetic --write --update-manifest --report=data/similarity-report-jokes.json
node tools/review-content-similarity.js --dataset=quotes --provider=synthetic --write --update-manifest --report=data/similarity-report-quotes.json
node tools/review-content-similarity.js --dataset=slang --provider=synthetic --write --update-manifest --report=data/similarity-report-slang.json

# 3. Refresh the asset observatory snapshot
node tools/generate-asset-report.js

# 4. Rebuild the offline manifest
npm run build:offline

# 5. Smoke-test
npm test
```

Commit every generated file together with the source changes so the deployed site and the test suite stay consistent.
