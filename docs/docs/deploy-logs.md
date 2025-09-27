# Deploy log — 27 Sep 2025

## Log excerpt

```
2025-09-27T03:58:07Z  error   Run Playwright tests (exit code 1) — workflow 18054737285 / run-playwright job 51382917936
2025-09-27T03:58:17Z  error   Commit offline manifest update (exit code 1) — workflow 18054738379 / update-offline-manifest job 51382920581
```

## What went wrong

- **Playwright smoke tests** for PR #155 failed during the `Run Playwright tests` step. The job exited with code 1 before publishing logs, leaving only the workflow metadata to diagnose the failure remotely.【067ba0†L12-L23】【c028a5†L1-L21】【c78c2c†L1-L5】
- **Refresh offline manifest** for the same merge stalled while trying to push an updated manifest back to `main`. The `git push` in the "Commit offline manifest update" step returned exit code 1, which typically happens when another workflow updates the branch between checkout and push—the repo history shows earlier manifest commits for PRs #148–#153 landing within minutes of this failure.【49cbe0†L1-L34】【cd774a†L1-L24】

## Mitigation

- Re-run the Playwright suite locally (or re-trigger the workflow with full log access) to capture the failing spec details, then adjust selectors or copy expectations introduced in PR #155 so they line up with the new embedding explorer UI.
- Add a `git pull --rebase origin ${{ github.event.pull_request.base.ref }}` (or `git fetch` followed by `git reset --hard origin/...`) before committing the offline manifest so each run rebases onto the latest bot commit. Alternatively, push with `--force-with-lease` after confirming only the manifest file changed.

## Follow-up

1. Collect the Playwright trace bundle for run 18054737285 and document which specs broke so the tests can evolve alongside the UI changes.
2. Update `.github/workflows/update-offline-manifest.yml` to rebase or force-push safely, preventing manifest runs from racing each other on busy merge trains.

# Deploy log — 25 Sep 2025

## Log excerpt

```
2025-09-25T02:26:41Z  warn   Service worker returned /index.html for navigation request /docs/
2025-09-25T02:26:42Z  info   Retrying navigation without cache fallback
2025-09-25T02:26:42Z  info   Navigation succeeded after bypassing cached landing page
```

## What went wrong

The service worker treated every navigation as eligible for the cached landing page before attempting a network fetch. When the
homepage already lived in the cache, the `docs/` navigation surfaced the landing markup instead of the documentation shell.

## Mitigation

- Updated `handleNavigationRequest` to check direct cache hits first, then fall back to the network, reserving the landing page
  as a last resort for true offline scenarios.
- Added a GitHub Pages deployment workflow that rebuilds the static artifact on pushes to `main` and touches `.nojekyll` during
  the publish step so GitHub skips its default Jekyll pipeline.

## Follow-up

1. Monitor the production service worker console after merges to confirm navigation requests hit the network when new pages are
   introduced.
2. Extend Playwright coverage with a regression that exercises the docs link once the CI budget allows for another smoke check.

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
