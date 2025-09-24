# Wiki authoring workflow

The wiki now relies on a single Markdown file per entry with Jekyll-style front matter. Everything lives under `apps/wiki/articles/`:

```
apps/wiki/articles/
├── index.yaml        # ordered list of article slugs (filename stems)
├── 2025-09-24.md     # Markdown body with YAML front matter
└── …
```

The client loads `index.yaml`, then fetches each Markdown file, parsing its front matter for metadata. This keeps copy, commit summaries, and display details in one place while still letting the service worker prefetch every story.

## Front matter schema

Each article starts with a `---` block that mirrors what Jekyll expects:

```yaml
---
title: "Cache sweeps and wiki polish"
date: 2025-09-24
summary: "Forced the offline bundle to refresh across every merge while teaching the wiki to read front matter."
emoji: "🧭"          # optional; falls back to 📝 when omitted
tags:
  - offline
  - wiki
---
```

Supported keys:

- `title`: human readable headline shown in the list and reader pane.
- `date`: ISO date string (`YYYY-MM-DD`) used for the published label.
- `summary`: short blurb for the sidebar.
- `emoji` (or `accentEmoji`): emoji badge for the card.
- `tags`: array of topic strings rendered below the title.
- `slug`: optional override for the filename stem (rarely needed).

Any missing field falls back to sensible defaults—the slug is derived from the filename, the emoji defaults to 📝, and tags simply disappear.

## Body markup

After the closing `---`, the Markdown body can use the usual features supported by the custom renderer:

- Headings `#`, `##`, and `###`
- Paragraphs and unordered lists
- Blockquotes, inline code, and fenced code blocks
- Markdown links (`[label](https://example.com)`)
- `<details>` blocks for long commit ledgers

Whitespace before or after the body is trimmed, so keep spacing intentional.

## Updating the index

`index.yaml` is still an ordered list of filename stems (no extension). Keep it in reverse-chronological order so the latest day loads first:

```yaml
# newest first
- 2025-09-24
- 2025-09-23
```

Avoid directory traversal (`..`) or slashes in the slug—the loader skips anything suspicious and logs a warning.

## Publishing a new entry

1. Add the slug to `apps/wiki/articles/index.yaml` in publication order.
2. Create `<slug>.md` with the front matter and Markdown body. Summaries should describe the real git history for that day.
3. Run `node tools/generate-offline-manifest.js` so the service worker knows about the new article.

Serve the site locally with `npx serve .` (or any static server) while editing so the fetch calls succeed; browsers block `file://` requests.

## Inline fallback for prototypes

If you need a quick prototype without touching disk, you can still define `window.wikiArticles` (or drop a `<script type="application/json" data-wiki-articles>` blob) before `app.js` runs. The loader falls back to that inline payload if fetching the Markdown files fails.

## Checklist

- [ ] Slug added to `index.yaml`
- [ ] Markdown file created with front matter and body
- [ ] Tags and summary double-checked for accuracy
- [ ] Offline manifest regenerated
- [ ] Page tested in a served environment
