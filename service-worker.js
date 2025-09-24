const CACHE_PREFIX = 'toolbox-offline-v';
const METADATA_CACHE = 'toolbox-offline-metadata';
const METADATA_REQUEST = new Request(new URL('__toolbox-offline-manifest__', self.location).toString());
const SERVICE_WORKER_PATH = new URL('service-worker.js', self.location.origin).pathname;
const OFFLINE_MANIFEST_PATH = new URL('offline-manifest.json', self.location.origin).pathname;

let activeCacheName = null;
let pendingUpdate = null;
let cachedManifest = null;
let activeCacheLookupPromise = null;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const stored = await readStoredManifest();
    if (stored && typeof stored.version === 'string' && stored.version) {
      activeCacheName = getCacheName(stored.version);
    }

    await cleanupCaches(activeCacheName);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') {
    return;
  }

  if (data.type === 'apply-manifest' && data.manifest) {
    event.waitUntil(queueManifestUpdate(data.manifest));
  } else if (data.type === 'reset-offline-cache') {
    event.waitUntil(resetOfflineCache(data.manifest || null));
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === SERVICE_WORKER_PATH) {
    return;
  }

  if (url.pathname === OFFLINE_MANIFEST_PATH) {
    event.respondWith((async () => {
      await ensureActiveCacheName();
      return handleManifestRequest(event.request);
    })());
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      await ensureActiveCacheName();
      return handleNavigationRequest(event.request);
    })());
    return;
  }

  event.respondWith((async () => {
    await ensureActiveCacheName();
    return handleAssetRequest(event.request);
  })());
});

function getCacheName(version) {
  return `${CACHE_PREFIX}${version}`;
}

async function ensureActiveCacheName() {
  if (activeCacheName) {
    return activeCacheName;
  }

  if (!activeCacheLookupPromise) {
    activeCacheLookupPromise = (async () => {
      let stored = null;
      try {
        stored = await readStoredManifest();
      } catch (error) {
        console.warn('Failed to read stored manifest while determining active cache', error);
      }

      if (stored && typeof stored.version === 'string' && stored.version) {
        activeCacheName = getCacheName(stored.version);
        return activeCacheName;
      }

      try {
        const keys = await caches.keys();
        const fallback = keys.find((key) => key.startsWith(CACHE_PREFIX));
        if (fallback) {
          activeCacheName = fallback;
        }
      } catch (error) {
        console.warn('Failed to inspect caches for active cache name', error);
      }

      return activeCacheName;
    })();
  }

  try {
    return await activeCacheLookupPromise;
  } finally {
    activeCacheLookupPromise = null;
  }
}

async function queueManifestUpdate(manifest, options = {}) {
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.assets)) {
    return;
  }

  const force = options.force === true;

  if (pendingUpdate) {
    return pendingUpdate;
  }

  pendingUpdate = (async () => {
    try {
      await applyManifest(manifest, { force });
    } catch (error) {
      console.error('Offline cache update failed', error);
    } finally {
      pendingUpdate = null;
    }
  })();

  return pendingUpdate;
}

async function applyManifest(manifest, options = {}) {
  const force = options.force === true;
  const version = manifest.version;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const totalAssets = assets.length;
  const totalBytes = Number.isFinite(manifest.totalBytes)
    ? manifest.totalBytes
    : assets.reduce((sum, asset) => sum + (Number(asset.bytes) || 0), 0);
  const cacheName = getCacheName(version);
  await ensureActiveCacheName();
  const existingManifest = await readStoredManifest();
  const cacheKeys = await caches.keys();
  const cacheExists = cacheKeys.includes(cacheName);
  const commitInfo = getCommitInfo(manifest.commit);

  if (!force && existingManifest && existingManifest.version === version && cacheExists) {
    activeCacheName = cacheName;
    await broadcast({
      type: 'offline-cache',
      state: 'complete',
      detail: {
        version,
        totalAssets,
        totalBytes,
        alreadyCached: true,
        commit: commitInfo
      }
    });
    return;
  }

  await broadcast({
    type: 'offline-cache',
    state: 'start',
    detail: {
      version,
      totalAssets,
      totalBytes,
      commit: commitInfo
    }
  });

  const cache = await caches.open(cacheName);
  let loadedBytes = 0;
  let completed = 0;

  try {
    for (const item of assets) {
      const assetPath = item && typeof item.path === 'string' ? item.path : null;
      if (!assetPath) {
        continue;
      }

      const assetUrl = new URL(assetPath, self.location.origin).toString();
      const request = new Request(assetUrl, { cache: 'reload' });
      let response;

      try {
        response = await fetch(request);
      } catch (error) {
      await broadcast({
        type: 'offline-cache',
        state: 'error',
        detail: {
          version,
          message: `Failed to fetch ${assetPath}`,
          commit: commitInfo
        }
      });
      throw error;
    }

    if (!response.ok) {
      await broadcast({
        type: 'offline-cache',
        state: 'error',
        detail: {
          version,
          message: `Unexpected response (${response.status}) for ${assetPath}`,
          commit: commitInfo
        }
      });
      throw new Error(`Failed to cache ${assetPath}`);
    }

      await cache.put(request, response.clone());

      const assetBytes = Number(item.bytes) || 0;
      loadedBytes += assetBytes;
      completed += 1;

      await broadcast({
        type: 'offline-cache',
        state: 'progress',
        detail: {
          version,
          asset: {
            path: assetPath,
            bytes: assetBytes
          },
          completed,
          totalAssets,
          loadedBytes,
          totalBytes,
          commit: commitInfo
        }
      });
    }
  } catch (error) {
    await caches.delete(cacheName).catch(() => {});
    throw error;
  }

  const storedManifest = {
    version,
    generatedAt: manifest.generatedAt || new Date().toISOString(),
    totalAssets,
    totalBytes,
    assets
  };

  if (commitInfo) {
    storedManifest.commit = commitInfo;
  }

  await writeStoredManifest(storedManifest);
  activeCacheName = cacheName;
  await cleanupCaches(cacheName);

  await broadcast({
    type: 'offline-cache',
    state: 'complete',
    detail: {
      version,
      totalAssets,
      totalBytes,
      alreadyCached: false,
      commit: commitInfo
    }
  });
}

async function resetOfflineCache(manifest) {
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.assets)) {
    await broadcast({
      type: 'offline-cache',
      state: 'reset-error',
      detail: {
        message: 'Missing offline manifest data.'
      }
    });
    return;
  }

  const currentUpdate = pendingUpdate;
  if (currentUpdate) {
    try {
      await currentUpdate;
    } catch (error) {
      // Ignore errors from prior updates while resetting.
    }
  }

  const totalAssets = manifest.assets.length;
  const totalBytes = Number.isFinite(manifest.totalBytes)
    ? manifest.totalBytes
    : manifest.assets.reduce((sum, asset) => sum + (Number(asset.bytes) || 0), 0);
  const commitInfo = getCommitInfo(manifest.commit);

  await broadcast({
    type: 'offline-cache',
    state: 'resetting',
    detail: {
      version: manifest.version,
      totalAssets,
      totalBytes,
      commit: commitInfo
    }
  });

  try {
    await clearOfflineCaches();
    activeCacheName = null;
    await queueManifestUpdate(manifest, { force: true });
  } catch (error) {
    console.error('Offline cache reset failed', error);
    await broadcast({
      type: 'offline-cache',
      state: 'reset-error',
      detail: {
        version: manifest.version,
        message: error && error.message ? error.message : 'Failed to reset offline cache.',
        commit: commitInfo
      }
    });
    throw error;
  }
}

async function handleManifestRequest(request) {
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse && networkResponse.ok) {
      return networkResponse;
    }
  } catch (error) {
    // Intentionally fall back to the stored manifest when offline.
  }

  const stored = await readStoredManifest();
  if (stored) {
    return new Response(JSON.stringify(stored), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  return fetch(request);
}

async function handleNavigationRequest(request) {
  if (!activeCacheName) {
    return fetch(request);
  }

  const cache = await caches.open(activeCacheName);
  const url = new URL(request.url);
  const candidates = [];

  candidates.push(url.href);
  if (url.pathname.endsWith('/')) {
    candidates.push(new URL(`${url.pathname}index.html`, url.origin).href);
  } else {
    candidates.push(new URL(`${url.pathname}/index.html`, url.origin).href);
  }
  candidates.push(new URL('/index.html', url.origin).href);

  for (const candidate of candidates) {
    const cached = await cache.match(candidate);
    if (cached) {
      return cached;
    }
  }

  try {
    return await fetch(request);
  } catch (error) {
    const fallback = await cache.match(new URL('/index.html', url.origin).href);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

async function handleAssetRequest(request) {
  if (!activeCacheName) {
    return fetch(request);
  }

  const cache = await caches.open(activeCacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(request);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => {
    try {
      client.postMessage(message);
    } catch (error) {
      console.warn('Failed to post message to client', error);
    }
  });
}

async function readStoredManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }

  let cache;
  try {
    cache = await caches.open(METADATA_CACHE);
  } catch (error) {
    console.warn('Failed to open offline metadata cache', error);
    return null;
  }

  const response = await cache.match(METADATA_REQUEST);
  if (!response) {
    return null;
  }

  try {
    cachedManifest = await response.json();
    return cachedManifest;
  } catch (error) {
    console.warn('Failed to parse stored offline manifest', error);
    cachedManifest = null;
    return null;
  }
}

async function writeStoredManifest(manifest) {
  const cache = await caches.open(METADATA_CACHE);
  const response = new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  await cache.put(METADATA_REQUEST, response);
  cachedManifest = manifest;
}

async function cleanupCaches(currentName) {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => {
    if (key === METADATA_CACHE) {
      return Promise.resolve(false);
    }

    if (!key.startsWith(CACHE_PREFIX)) {
      return Promise.resolve(false);
    }

    if (currentName && key === currentName) {
      return Promise.resolve(false);
    }

    return caches.delete(key);
  }));
}

async function clearOfflineCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => {
    if (key === METADATA_CACHE || key.startsWith(CACHE_PREFIX)) {
      return caches.delete(key);
    }

    return Promise.resolve(false);
  }));
  cachedManifest = null;
}

function getCommitInfo(rawCommit) {
  if (!rawCommit || typeof rawCommit !== 'object') {
    return null;
  }

  const info = {};
  if (typeof rawCommit.hash === 'string') {
    info.hash = rawCommit.hash;
  }
  if (typeof rawCommit.short === 'string') {
    info.short = rawCommit.short;
  }
  if (typeof rawCommit.dirty === 'boolean') {
    info.dirty = rawCommit.dirty;
  }

  return Object.keys(info).length > 0 ? info : null;
}
