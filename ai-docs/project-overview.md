# Project overview

## What is this project?

**denisvaleev.github.io** is a static toolbox served from GitHub Pages. The landing page (`index.html`) lists a collection of small, self-contained web apps. Each app lives under `apps/<name>/`, runs entirely in the browser, and requires no build step or backend.

The toolbox is intentionally minimal: no framework, no bundler, no server-side logic. Pages load HTML files directly, or through any static HTTP server.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page. Advertises every app, handles offline bootstrap, registers the service worker. |
| `apps/` | One folder per app. Each contains HTML with inline CSS, a JavaScript controller, and any needed datasets. |
| `data/` | Canonical datasets, manifests, embedding stores, similarity reports, and audit logs. |
| `tools/` | Node.js maintenance scripts for offline manifests, metadata, embeddings, similarity, and diagnostics. |
| `tests/` | Playwright end-to-end specs covering the landing page and every app. |
| `docs/` | Human-facing Markdown knowledge base rendered by a browser-side docs app. |
| `ai-docs/` | This directory — AI-agent-focused documentation. |
| `service-worker.js` | Cache controller that precaches toolbox assets for offline use. |
| `offline-manifest.json` | Machine-generated list of every shipped asset with byte sizes and a SHA-256 digest. |
| `package.json` | Dev dependency (`@playwright/test`) plus `npm test` and `npm run build:offline` scripts. |
| `playwright.config.js` | Playwright configuration (browser, server startup, timeouts). |
| `.github/` | GitHub Actions workflows for CI, offline manifest refresh, and observatory data refresh. |
| `AGENTS.md` | Top-level agent guide with coding conventions and validation rules. |

## Apps at a glance

| App folder | Title | Type |
| --- | --- | --- |
| `apps/jokes` | Dad Jokes | Deck + archive |
| `apps/quotes` | Quotes | Deck + archive |
| `apps/slang` | Slang | Deck + archive |
| `apps/similarity-report` | Cosine Similarity Lab | Analytics |
| `apps/asset-observatory` | Asset Observatory | Dashboard |
| `apps/embedding-explorer` | Embedding Explorer | Analytics |
| `apps/value-formatter` | Value Formatter | Utility |
| `apps/wiki` | Wiki | Content browser |
| `apps/total-recall` | Total Recall | Interactive tool |
| `apps/enchanted-bunny` | Enchanted Forest Bunny | Interactive toy |
| `apps/bunny-moon-choir` | Moonpetal Bunny Choir | Interactive toy |
| `apps/cloth` | Cloth Lab | Physics simulation |

## Key ideas

- **Static-first.** No bundler, no server. Opening any HTML file is enough during development.
- **Offline-capable.** `service-worker.js` + `offline-manifest.json` precache every asset so the toolbox works without a network connection.
- **Curated datasets.** Jokes, quotes, and slang share a content pipeline: deterministic IDs, embedding stores, and cosine-similarity reports for deduplication.
- **Playwright coverage.** Every interactive surface has an automated end-to-end spec.
- **No `var`.** JavaScript follows modern idioms: IIFEs, `const`/`let`, guard clauses for missing DOM nodes.
