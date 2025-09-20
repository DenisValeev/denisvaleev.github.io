# Toolbox

A collection of lightweight browser apps served from a single landing page. Each mini-app focuses on quick interactions, from shuffling curated decks to formatting lists for development workflows.

## Available apps

- **Random Jokes** – Shuffle developer-friendly jokes, reveal punchlines on demand, and jump to the full archive when you need more context.
- **Quotes** – Shuffle themed quote decks, step back whenever you like, and explore every line in the all-in-one archive.
- **Value Formatter** – Turn newline-separated entries into formatted key-value pairs for quick copy/paste in code reviews or data preparation.

## Usage

Open `index.html` in any modern browser to launch the landing page, then choose the tool you need. Every app runs entirely on the client, so no build step or backend setup is required.

## Local development

Because the site is static, you can use any local web server for live reloads while editing files. For example, from the repository root:

```bash
npx serve .
```

This starts a server on <http://localhost:3000> (or the next available port).

## Data maintenance

- Run `node tools/update-content-metadata.js` after refreshing the jokes or quotes datasets to assign deterministic IDs and
  regenerate the manifest files under `data/`. The script rewrites `apps/jokes/jokes.js` and `apps/quotes/quotes-data.js` in the
  house style and emits `data/jokes-manifest.json` / `data/quotes-manifest.json` with normalized hashes and embedding metadata
  placeholders for downstream deduplication workflows.
- Use `node tools/review-content-similarity.js` to fetch embeddings from public APIs (OpenAI, Cohere, Hugging Face, or the
  built-in deterministic `fake` provider), persist them under `data/*-embeddings.json`, and surface cosine-similar pairs for
  manual review. Pass `--write` to persist embeddings, `--update-manifest` to sync embedding metadata back into the manifests,
  and `--report=reports/{dataset}-duplicates.json` to generate JSON reports for auditing runs.
