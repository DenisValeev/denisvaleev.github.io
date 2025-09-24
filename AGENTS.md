# denisvaleev.github.io — Agent Guide

This project is a static toolbox site. The landing page (`index.html`) lists small web apps that live under `apps/<name>/`. Each app is self-contained (HTML with inline CSS plus one or two small JavaScript files) and is meant to be opened directly in the browser without a build step.

## HTML & CSS
- Follow the recent commits by keeping markup and styles indented with **two spaces per level**. If you must touch legacy files that still use wider indentation (for example the original data dumps or the `value-formatter` utility), respect the surrounding style instead of reformatting the entire file in one go.
- Each page defines its styles inline. Use CSS custom properties and `prefers-color-scheme` the same way the existing pages do so that light and dark themes stay in sync (`0857216`, `2ab713c`).
- Prefer semantic structure (`<main>`, `<article>`, `<header>`, etc.) and keep accessibility affordances such as `aria-label`, `aria-live`, and visually hidden captions. Mirror the card layout in `index.html` when adding new apps so the landing grid and the developer links remain consistent.
- Buttons should include `type="button"`, and interactive elements need focus states that match the existing hover/focus styles.

## JavaScript
- Keep scripts self-contained by wrapping them in an IIFE. Use `const`/`let`, never `var`.
- Guard early for missing DOM nodes before wiring up events. This pattern was introduced in "Guard jokes app initialization" and prevents the scripts that are shared across pages from crashing when elements are absent.
- Work with data via `Array.isArray(...)? ... : []` and filter out empty records before rendering. Every view handles an empty dataset gracefully with fallback copy such as `"No jokes available."` and a `'💩'` placeholder for missing punchlines—preserve those affordances when changing copy.
- When rendering large tables (the `render-all.js` files), build rows with `document.createElement` and append them to a `DocumentFragment` before touching the DOM. Keep the count badge (`data-count`) updated via `toLocaleString()` as the existing scripts do.
- Provide keyboard shortcuts that mirror the arrow/space behaviour already present in both the jokes and proverbs apps.

## Data files
- Datasets live in plain JavaScript files that assign arrays to `window.jokes` or `window.proverbsData`. Maintain the existing property names (`joke`/`punchline` and `text`) so the renderers continue to work.
- The data files predate the rest of the styling cleanup; match their current indentation and quoting when editing to avoid huge noise in the diff.

## Landing page upkeep
- Adding an app means adding a card (`<a class="app-card">`) inside the `<ul class="apps">` list and, if applicable, linking any auxiliary pages inside the `.dev-tools` section so that shortcut links stay discoverable.
- The chevron SVG icon inside the call-to-action span is reused everywhere—copy the existing snippet to keep the visuals aligned.

## Validation
- Automated checks are welcome, even though the apps are static. Run the Playwright smoke tests (`npm test`) when you touch the similarity lab, and feel free to add focused scripts for other apps as they evolve. In fresh environments, install the required browser bundle first with `npx playwright install --with-deps chromium` so the tests can launch successfully.
- Do not get complacent about missing browsers—if Playwright is absent, you must at least try installing it. When you succeed, document the exact steps here instead of assuming future agents "can't" do it. No lazy punts.
- If you skip scripted coverage, at least open the affected HTML files in a browser (or start `python -m http.server`) to confirm layout, theme switching, and keyboard interactions still work.
- If you adjust the asset observatory, regenerate its dataset snapshot with `node tools/generate-asset-report.js` so `apps/asset-observatory/asset-data.js` stays in sync.
- A new regression spec enforces Home buttons across apps—after tweaking navigation chrome, run `npx playwright test tests/home-navigation.spec.js`.
