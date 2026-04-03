# AI Docs — Toolbox Reference

This directory contains Markdown documentation written for AI agents and automated tools working on the **denisvaleev.github.io** toolbox. It covers the project's purpose, layout, coding conventions, individual apps, data maintenance workflows, and testing infrastructure.

## Index

| File | Contents |
| --- | --- |
| [project-overview.md](project-overview.md) | What the project is, repository layout, and key ideas |
| [architecture.md](architecture.md) | Landing page, service worker, offline manifest, and data loading |
| [apps-catalog.md](apps-catalog.md) | Every app: purpose, key files, data dependencies, and test coverage |
| [data-and-tools.md](data-and-tools.md) | Datasets, Node maintenance scripts, and step-by-step workflows |
| [testing.md](testing.md) | Playwright specs, npm scripts, and CI automation |
| [development-conventions.md](development-conventions.md) | Coding style, accessibility rules, and how to add new apps |

## Quick-start for agents

1. Read `project-overview.md` to understand the repository layout.
2. Read `development-conventions.md` before touching any HTML, CSS, or JS.
3. After editing datasets, follow the workflow in `data-and-tools.md`.
4. After any code change, run `npm test` (see `testing.md`).
5. When adding a new app, consult `apps-catalog.md` for the established pattern and update `index.html`, `offline-manifest.json`, and `docs/docs/apps.md`.
