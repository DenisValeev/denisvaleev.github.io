# AI documentation workspace

- Keep documentation in Markdown under `ai_docs/docs/`. Use descriptive headings and prefer tables for directory overviews.
- Whenever you add a new guide, update `ai_docs/index.html` so the navigation lists the page. Each entry in the `guides` array should include an `id`, `title`, `file`, and concise `summary`.
- Render tweaks should preserve the two-space indentation used throughout the HTML and CSS. Stick with the existing palette and typography to keep the docs visually aligned with the landing page.
- After editing docs, load `ai_docs/index.html` in a browser (or via `npx serve .`) to confirm the Markdown renders and navigation links update the hash correctly.
- Keep cross-references current: when workflows, scripts, or tests change, update the relevant Markdown sections and summaries so the knowledge base stays authoritative.
