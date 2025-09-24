# AI documentation workspace

- Keep documentation in Markdown under `ai_docs/docs/`. Every guide needs YAML front matter with `layout: ai_docs`, a human-readable `title`, `summary`, numeric `nav_order`, the canonical `permalink`, and a `last_updated` ISO date.
- Navigation is generated automatically from the front matter. When adding a guide, give it the next `nav_order` slot and confirm the rendered nav reflects the new entry.
- Render tweaks should preserve the two-space indentation used throughout the HTML and CSS. Stick with the existing palette and typography to keep the docs visually aligned with the landing page.
- After editing docs, run `bundle exec jekyll build` (or `bundle exec jekyll serve`) to ensure the site compiles and review `http://localhost:4000/ai_docs/` for regressions.
- Keep cross-references current: when workflows, scripts, or tests change, update the relevant Markdown sections, `summary` fields, and `last_updated` metadata so the knowledge base stays authoritative.
