const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, 'offline-manifest.json');
const INCLUDE_DIRECTORIES = ['apps', 'data', path.join('ai_docs', 'docs')];
const INCLUDE_FILES = ['index.html', 'service-worker.js', path.join('ai_docs', 'index.html')];
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.json']);
const execFileAsync = promisify(execFile);

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
  const commitInfo = await readCommitInfo();
  const versionParts = [generatedAt.slice(0, 10).replace(/-/g, ''), versionSuffix];

  if (commitInfo.short) {
    versionParts.push(commitInfo.short + (commitInfo.dirty ? '-dirty' : ''));
  }

  const version = versionParts.join('-');
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);

  const manifest = {
    version,
    generatedAt,
    totalAssets: assets.length,
    totalBytes,
    assets
  };

  if (commitInfo.hash) {
    manifest.commit = commitInfo;
  } else if (commitInfo.dirty) {
    manifest.commit = { dirty: true };
  }

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
      const normalizedEntryPath = toPosixPath(entryPath);
      const isDocMarkdown = normalizedEntryPath.startsWith('ai_docs/docs/') && extension === '.md';
      if (!ALLOWED_EXTENSIONS.has(extension) && !isDocMarkdown) {
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

async function readCommitInfo() {
  const info = {
    hash: null,
    short: null,
    dirty: false
  };

  const envSha = typeof process.env.GITHUB_SHA === 'string' ? process.env.GITHUB_SHA.trim() : '';
  if (envSha) {
    info.hash = envSha;
  } else {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD']);
      info.hash = stdout.trim();
    } catch (error) {
      // Ignore failures when git metadata is unavailable (for example, in production archives).
    }
  }

  if (info.hash) {
    info.short = info.hash.slice(0, 12);
  }

  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
    info.dirty = Boolean(stdout.trim());
  } catch (error) {
    info.dirty = false;
  }

  return info;
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
