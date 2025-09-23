const { test, expect } = require('@playwright/test');
const fs = require('fs/promises');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'offline-manifest.json');
const INCLUDE_DIRECTORIES = ['apps', 'data'];
const INCLUDE_FILES = ['index.html', 'service-worker.js'];
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.json']);

async function readManifest() {
  const content = await fs.readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(content);
}

async function collectExpectedAssets() {
  const assets = new Set(INCLUDE_FILES);

  for (const directory of INCLUDE_DIRECTORIES) {
    await walk(directory, assets);
  }

  return assets;
}

async function walk(relativeDir, assets) {
  const absoluteDir = path.join(ROOT, relativeDir);
  let entries;

  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, assets);
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }
      assets.add(toPosixPath(entryPath));
    }
  }
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

test.describe('Offline manifest', () => {
  test('includes the Embedding Explorer bundle', async () => {
    const manifest = await readManifest();
    const assetPaths = manifest.assets.map((asset) => asset.path);

    const required = [
      'apps/embedding-explorer/index.html',
      'apps/embedding-explorer/app.js',
      'apps/embedding-explorer/sample-embeddings.js',
    ];

    for (const file of required) {
      expect(assetPaths).toContain(file);
    }
  });

  test('stays in sync with shipped HTML, JS, and JSON assets', async () => {
    const manifest = await readManifest();
    const manifestPaths = new Set(manifest.assets.map((asset) => asset.path));
    const expectedPaths = await collectExpectedAssets();

    const missing = [...expectedPaths].filter((pathName) => !manifestPaths.has(pathName));
    const unexpected = [...manifestPaths].filter((pathName) => !expectedPaths.has(pathName));

    expect(missing).toEqual([]);
    expect(unexpected).toEqual([]);
    expect(manifest.totalAssets).toBe(manifest.assets.length);
  });
});
