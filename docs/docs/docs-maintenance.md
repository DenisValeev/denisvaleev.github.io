# Documentation maintenance

The documentation hub lives under `docs/` and renders Markdown guides inside `docs/index.html`. Use this checklist to keep the
knowledge base accurate whenever workflows or datasets evolve.

## Editing guides

- Place Markdown files inside `docs/docs/` so the loader can fetch them via relative paths.
- Use descriptive headings and keep tables aligned with two-space indentation to match the rest of the docs.
- Reference paths exactly as they appear in the repository (for example ``apps/jokes/jokes.js``) so quick searches stay useful.
- When documenting commands, wrap them in fenced code blocks tagged with the shell language (`````bash```) for consistent
  styling.

## Updating navigation

- Register each new guide in the `guides` array inside `docs/index.html`. Supply an `id`, human-readable `title`, Markdown `file`
  path, and a short `summary`.
- Keep the `id` stable and URL-friendly—hash navigation uses it to update the address bar and history state.
- Order entries intentionally: place high-level introductions (`overview`, `architecture`) near the top and workflows or
  reference material further down.

## Previewing changes

1. From the repository root, install dependencies if you have not already:
   ```bash
   npm install
   ```
2. Serve the docs with any static server. `npx serve .` exposes the site at `http://localhost:3000/` by default, while
   `python -m http.server` works in Python-heavy environments.
3. Open `http://localhost:3000/docs/` (or the equivalent port) and cycle through every guide to confirm the navigation, progress
   indicator, and hash routing behave as expected.

## Keeping content fresh

- Mirror updates to Playwright specs, maintenance scripts, and dataset workflows in the relevant guides so the docs remain the
  source of truth.
- Whenever you touch the offline manifest or service worker, cross-link the change in both the **Data maintenance** and
  **Testing & automation** guides to reinforce the workflow.
- When you remove or rename a guide, delete the corresponding Markdown file and prune the `guides` array to avoid 404s.

## Pull request expectations

- Documentation updates ship alongside code changes that alter workflows. Avoid leaving TODO comments—describe the intended
  process directly in the Markdown.
- Before opening a pull request, skim the rendered diff (for example with `git diff --word-diff`) to catch spelling errors and
  missing commands.
