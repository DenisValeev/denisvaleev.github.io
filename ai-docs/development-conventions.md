# Development conventions

## HTML and CSS

- **Indentation.** Two spaces per level in all modernised files. Legacy files (e.g. `value-formatter`) may use wider indentation—match the surrounding style rather than reformatting the whole file.
- **Inline styles.** Every app defines its styles in a `<style>` block inside `<head>`. Do not add external stylesheets unless the app already uses one (only `apps/cloth` links `styles.css`).
- **CSS custom properties.** Define the full palette under `:root` and override it in `@media (prefers-color-scheme: dark)`. Use the same variable names already established in that app so light and dark themes stay in sync. Toys that have a fixed visual identity use `color-scheme: only light`.
- **Semantic structure.** Use `<main>`, `<article>`, `<header>`, `<nav>`, `<section>` where appropriate. Avoid `<div>` soup.
- **Buttons.** Always set `type="button"` unless submitting a form. Provide `:hover` and `:focus-visible` styles that match the rest of the page.
- **Icons.** The chevron SVG used in call-to-action spans is copy-pasted across cards. Reuse the exact same snippet so all arrows look identical.

## JavaScript

- **IIFEs.** Wrap app logic in an immediately invoked function expression to avoid polluting the global scope:
  ```js
  (function () {
    'use strict';
    // ...
  })();
  ```
- **`const`/`let` only.** Never use `var`.
- **Guard clauses.** Check that DOM nodes exist before wiring events:
  ```js
  const btn = document.getElementById('next');
  if (!btn) return;
  btn.addEventListener('click', handleNext);
  ```
  This prevents shared scripts from crashing on pages that omit certain elements.
- **Empty dataset handling.** Always check with `Array.isArray(data) ? data : []`. Filter falsy records before rendering. Show friendly fallback copy (`"No jokes available."`) and a `'💩'` placeholder when the array is empty.
- **Large table rendering.** Build rows with `document.createElement` and append via `DocumentFragment` before touching the live DOM. Update the count badge (`[data-count]`) with `toLocaleString()`.
- **Keyboard shortcuts.** Mirror the pattern from the jokes and quotes apps: `ArrowLeft` / `ArrowRight` for prev/next, `Space` to toggle reveal.

## Datasets

- **File format.** Dataset files are plain JS files that assign arrays to `window.*`:
  ```js
  window.jokes = [
    { "id": "j-001", "joke": "...", "punchline": "...", "sourceId": "..." },
  ];
  ```
- **Property names.** `joke`/`punchline` for jokes, `text`/`author`/`tags` for quotes, `term`/`definition` for slang. Do not rename these fields.
- **Formatting.** Match the generated double-quote style of existing entries when making manual edits. Avoid reformatting adjacent entries.
- **Validation before commit.** Run the syntax and shape checks from each app's `AGENTS.md`:
  ```bash
  node --check apps/jokes/jokes.js
  node -e "const d = require('./apps/jokes/jokes.js'); console.log(Array.isArray(window.jokes));"
  ```

## Accessibility

- Use `aria-live="polite"` on regions that update dynamically (progress bars, status messages).
- Use `aria-pressed` on toggle buttons (punchline reveal, definition reveal).
- Provide visually hidden captions for screen reader users where visual context is conveyed by position alone.
- Label navigation landmarks with `aria-label` when more than one `<nav>` element is present.

## Adding a new app

1. Create `apps/<name>/index.html` plus any supporting files (`app.js`, dataset, `AGENTS.md`).
2. Follow the inline-style pattern. Wrap JS in an IIFE.
3. Add a Home link targeting `../../`:
   ```html
   <a href="../../" aria-label="Home">← Home</a>
   ```
4. Add the app card to `index.html`. Use a unique emoji that no existing card uses.
5. Run `npm run build:offline` to include new assets in the offline manifest.
6. Add or extend a Playwright spec under `tests/`.
7. Update `docs/docs/apps.md` with the new app's entry.
8. Update `docs/index.html` if a new guide is added to `docs/docs/`.

## Updating existing documentation

- `docs/docs/` is the human-facing Markdown knowledge base. Update the relevant guide whenever you change a workflow, script, or dataset pipeline.
- `ai-docs/` (this directory) is the AI-agent-focused reference. Keep it in sync with any architectural or tooling changes.
- `AGENTS.md` (root) is the top-level agent guide. It covers the same conventions as this file but in summary form; update both when the conventions change.
- Each app may also have its own `apps/<name>/AGENTS.md`. Update that file when the app's maintenance commands or dataset shape changes.

## Common mistakes to avoid

- Forgetting to run `npm run build:offline` after adding or renaming assets — the offline manifest will be stale.
- Editing a dataset without regenerating manifests and embeddings — downstream tools and tests will diverge.
- Adding a new app without a Home link — `tests/home-navigation.spec.js` will fail.
- Using `var` or global function declarations — violates the IIFE convention.
- Removing a test to make a failing suite green — never acceptable.
