---
layout: ai_docs
title: Overview
summary: Start here
nav_order: 1
permalink: /ai_docs/
last_updated: 2024-05-07
---

# Toolbox documentation hub

The Toolbox repository hosts a static collection of mini web applications that run entirely in the browser. The landing page (`index.html`) exposes curated cards for every tool, while each app ships as a standalone HTML document with inline styles and a lightweight script bundle. Datasets, embeddings, and similarity reports live under `data/`, and a service worker keeps the full bundle available offline.

This documentation hub surfaces the moving pieces behind the project so new contributors can quickly understand how the toolbox is assembled and maintained. Use the navigation in the left column to jump to specific topics covering the site architecture, individual apps, datasets, automation tooling, and day-to-day development practices.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page that advertises each mini app, applies the shared visual language, and registers the offline bootstrap flow. |
| `apps/` | Self-contained applications. Each folder bundles HTML, inline CSS, JavaScript controllers, and any dataset required for the tool. |
| `data/` | Canonical datasets, manifests, embeddings, similarity reports, and audit logs that power the content-heavy apps. |
| `tools/` | Node.js maintenance scripts for generating offline bundles, refreshing datasets, pruning duplicates, and recording Playwright output. |
| `tests/` | Playwright specifications that exercise the landing page, each app’s interactions, offline cache coverage, and dataset sanity checks. |
| `service-worker.js` | Cache controller that consumes the offline manifest, precaches toolbox assets, and handles background updates. |
| `offline-manifest.json` | Machine-generated manifest listing every asset served offline, its byte size, and the cache digest. |
| `apps/**/AGENTS.md` | App-specific maintenance notes that describe validation commands and guardrails for editing the datasets. |

## Key ideas

- **Static-first distribution.** No build step is required—opening an HTML file loads the app. Scripts use vanilla DOM APIs, and data ships as JavaScript modules that populate `window.*` globals.
- **Offline resilience.** A custom service worker plus `offline-manifest.json` prefetch every HTML, JSON, and JavaScript file so the toolbox remains usable without a network connection.
- **Curated datasets.** The jokes, quotes, and slang decks share a consistent content pipeline. Deterministic manifests and embedding stores unlock deduplication tools, similarity visualisations, and cross-app analytics.
- **Playwright coverage.** Automated end-to-end tests verify navigation, keyboard affordances, dataset rendering, and offline coverage. Maintenance scripts record and replay logs to help investigate regressions.
- **Documented workflows.** Node scripts in `tools/` automate content refreshes, offline manifest regeneration, and duplicate pruning. Agents.md files inside each app explain how to sanity-check datasets before committing changes.

Start with the **Site architecture** section to learn how the landing page, service worker, and asset manifest collaborate, then review the **App catalog** and **Data maintenance** guides for deeper dives into each domain.
