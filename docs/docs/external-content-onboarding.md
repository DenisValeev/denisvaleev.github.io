# External content onboarding

The toolbox uses deterministic embeddings and cosine comparisons to reject
near-duplicate jokes before they ever land in `apps/jokes/jokes.js`. The
`tools/onboard-external-jokes.js` helper ingests a candidate JSON file,
embeds each entry across one or more providers, and reports which jokes can
join the curated deck.

## Candidate file shape

Provide an array of objects where every joke includes at least a setup (stored
as `joke` or `setup`) and optionally a punchline (`punchline` or `answer`).
`id` and `label` fields are optional—missing values are replaced with
`candidate-###` identifiers so the summary stays readable.

```json
[
  {
    "id": "joke-001",
    "label": "Unexpected semicolons",
    "joke": "Why did the build fail?",
    "punchline": "The compiler thought the semicolon was sus."
  }
]
```

Save the array to disk (for example `data/new-jokes.json`) and feed the path to
`--input` or its alias `--candidates`.

## Running the triage script

Evaluate a batch with the default providers and a cosine threshold of `0.8`:

```bash
node tools/onboard-external-jokes.js --input=data/new-jokes.json \
  --output=reports/new-jokes-summary.json \
  --accepted-output=reports/new-jokes-accepted.json
```

The command:

- Loads the active jokes deck and its stored embeddings.
- Generates deterministic embeddings for any provider missing from disk.
- Compares each candidate against the curated deck using cosine similarity.
- Writes a machine-readable summary plus an optional accepted-only export.

Review the terminal output to spot high-similarity overlaps. The summary JSON
captures metadata such as the candidate file, evaluated providers, rejection
reasons, and the strongest match per joke.

## Customising the evaluation

- `--threshold=<value>` changes the cosine similarity cutoff (defaults to
  `0.8`). Lower values admit more jokes, higher ones enforce stricter
  deduplication.
- `--providers=synthetic,openai,cohere` restricts which embedding stores to use.
  Deterministic fallback vectors kick in automatically when a provider’s store
  is missing or incompatible.
- `--existing-embeddings=provider:path` lets you point at non-standard stores
  (for example, a freshly generated HF Space batch).
- `--candidate-embeddings=provider:path` reuses pre-computed vectors for the
  candidates, skipping deterministic generation when dimensions match.

## After accepting new jokes

1. Inspect `reports/new-jokes-accepted.json` and manually fold the approved
   entries into `apps/jokes/jokes.js`.
2. Run the usual dataset maintenance scripts (`node tools/update-content-metadata.js`,
   `node tools/review-content-similarity.js`, and
   `node tools/generate-asset-report.js`) so manifests, embeddings, and the asset
   observatory stay aligned.
3. Commit the refreshed datasets, manifests, similarity reports, and summary
   artifacts alongside the onboarding report for traceability.
