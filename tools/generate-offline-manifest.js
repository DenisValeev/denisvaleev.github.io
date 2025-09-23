const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, 'offline-manifest.json');
const INCLUDE_DIRECTORIES = ['apps', 'data'];
const INCLUDE_FILES = ['index.html', 'service-worker.js'];
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.json']);

async function main() {
  const assets = [];
  const digest = crypto.createHash('sha256');

  for (const filePath of INCLUDE_FILES) {
    await addAsset(filePath, assets, digest);
  }

  for (const directory of INCLUDE_DIRECTORIES) {
    await walk(directory, assets, digest);
  }

  assets.sort((a, b) => a.path.localeCompare(b.path));

  const generatedAt = new Date().toISOString();
  const versionSuffix = digest.digest('hex').slice(0, 12);
  const version = `${generatedAt.slice(0, 10).replace(/-/g, '')}-${versionSuffix}`;
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);

  const manifest = {
    version,
    generatedAt,
    totalAssets: assets.length,
    totalBytes,
    assets
  };

  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  await fs.writeFile(OUTPUT_PATH, manifestJson);
  console.log(`Offline manifest ready: ${assets.length} assets, ${formatBytes(totalBytes)} total.`);
}

async function walk(directory, assets, digest) {
  const absoluteDir = path.join(ROOT, directory);
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
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, assets, digest);
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }

      await addAsset(entryPath, assets, digest);
    }
  }
}

async function addAsset(relativePath, assets, digest) {
  const absolutePath = path.join(ROOT, relativePath);
  let stats;

  try {
    stats = await fs.stat(absolutePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  if (!stats.isFile()) {
    return;
  }

  const content = await fs.readFile(absolutePath);
  const normalizedPath = toPosixPath(relativePath);

  digest.update(normalizedPath);
  digest.update(content);

  assets.push({
    path: normalizedPath,
    bytes: stats.size
  });
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${Number(value.toFixed(fractionDigits))} ${units[unitIndex]}`;
}

main().catch((error) => {
  console.error('Failed to generate offline manifest', error);
  process.exitCode = 1;
});
