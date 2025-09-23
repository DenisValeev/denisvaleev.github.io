# Asset Observatory maintenance

- This dashboard is data-driven. After changing layouts, copy, or the asset report script, rerun
  `node tools/generate-asset-report.js` and commit the refreshed `asset-data.js` snapshot.
- Keep the inline markup and CSS at two spaces per level to match the rest of the toolbox.
- The focused regression lives at `tests/asset-observatory.spec.js`; run it with
  `npx playwright test tests/asset-observatory.spec.js` when tweaking the UI.
