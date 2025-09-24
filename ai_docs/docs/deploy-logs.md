# Deploy log — 24 Sep 2025

## Log excerpt

```
2025-09-24T02:14:12Z  build    Starting pages-build-deployment
2025-09-24T02:14:13Z  info     Restoring cached bundle for offline-manifest.json
2025-09-24T02:14:13Z  warning  offline-manifest.json served from service-worker cache (x-service-worker-cache-hit=true)
2025-09-24T02:14:13Z  warning  Received digest 5a1c4e6d… but expected 9c37df90…
2025-09-24T02:14:13Z  error    Asset upload aborted: cached manifest did not match freshly built site
2025-09-24T02:14:13Z  build    Exiting with status 1 — manual cache invalidation required
```

## What went wrong

GitHub Pages pulled a fresh build but requested `offline-manifest.json` through the running service worker. Because the worker treats identical version strings as a cache hit, it responded with the stale manifest stored on disk. The deployment pipeline compared the cached digest against the freshly generated bundle, saw the mismatch above, and bailed out.

## Mitigation

- Bumped the manifest version repeatedly (`03aead0`, `ab41b23`, `87bedf5`, …) so every merge forces a new cache bucket.
- Regenerated the asset observatory snapshots in tandem (`d2a5aa9`, `cf6f099`, `d34657b`, `0efb297`) to keep dashboards aligned with the refreshed bundle.
- Documented the Jekyll-style article workflow so the wiki no longer depends on split JSON/Markdown files that invite stale fetches.

## Follow-up

1. Continue running `node tools/generate-offline-manifest.js` after adding or removing any article or dataset asset.
2. Consider short-circuiting service-worker responses for GitHub Pages build user agents if we see the warning reappear.
3. Keep this log updated with future deployments so we can spot cache regressions early.
