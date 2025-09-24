# Wiki authoring workflow

The wiki pulls each entry from a trio of files inside `apps/wiki/articles/`:

```
apps/wiki/articles/
├── index.yaml            # ordered list of article slugs (filename stems)
├── kickoff-chaos.json    # metadata for a single article
├── kickoff-chaos.md      # markdown body for the same article
└── …
```

The JavaScript client loads `index.yaml`, then fetches the corresponding JSON and Markdown files for every slug that appears in the list. This keeps article copy editable without touching application code while still supporting preloading in the service worker.

## Metadata JSON

Each `<slug>.json` file should include:

- `slug`: usually identical to the filename stem (used in URLs)
- `title`: human readable headline; falls back to the slug if omitted
- `summary`: short blurb shown in the list
- `accentEmoji`: optional emoji for the list card
- `published`: ISO date string (`YYYY-MM-DD`)
- `tags`: array of topic strings

Leave `summary`, `accentEmoji`, `published`, and `tags` blank if they are not relevant yet—the renderer handles empty metadata gracefully. When the title is omitted the UI derives one from the slug (for example `new-journey` becomes “New Journey”).

## Markdown body

The `<slug>.md` file stores the actual article copy. The in-browser parser supports:

- Headings `#`, `##`, and `###`
- Paragraphs and unordered lists
- Blockquotes, inline code, and fenced code blocks
- Markdown links (`[label](https://example.com)`)

Keep Markdown minimal—no front matter is needed because metadata lives alongside the body in the JSON file.

## Updating the index

`index.yaml` is a simple ordered list of filename stems. Newer articles should appear at the top so the UI opens the latest entry by default.

```yaml
# newest first
- release-party
- kickoff-chaos
```

Avoid directory traversal (`..`) or slashes in the slug. The loader treats invalid entries as warnings and skips them.

## Publishing a new entry

1. Add the slug to `apps/wiki/articles/index.yaml` in publication order.
2. Create `<slug>.json` with the metadata fields described above.
3. Create `<slug>.md` with the article content.
4. Run `node tools/generate-offline-manifest.js` to keep the offline cache list current.

The page automatically refreshes its list once those files exist on disk. When working locally, serve the site via `npx serve .` (or any static server) so the `fetch()` calls succeed; browsers block relative `file://` requests.

## Inline fallback for prototypes

For quick experiments you can still define `window.wikiArticles` (or embed a `<script type="application/json" data-wiki-articles>` payload) before `app.js` runs. The app falls back to this inline array if the file-backed fetches fail or are unavailable, which is handy for one-off demos without touching the article directory.

## Checklist

- [ ] Slug added to `index.yaml`
- [ ] Matching `.json` and `.md` files created
- [ ] Optional metadata fields double-checked
- [ ] Offline manifest regenerated
- [ ] Page tested in a served environment
