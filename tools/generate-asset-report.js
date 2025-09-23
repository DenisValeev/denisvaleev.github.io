#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const datasetConfigs = [
  {
    id: 'jokes',
    label: 'Dad Jokes',
    datasetFile: 'apps/jokes/jokes.js',
    manifestFile: 'data/jokes-manifest.json',
    embeddings: [
      'data/jokes-embeddings.json',
      'data/jokes-embeddings-openai.json',
      'data/jokes-embeddings-cohere.json',
    ],
    similarityReports: [
      'data/similarity-report-jokes.json',
      'data/similarity-report-jokes-openai.json',
      'data/similarity-report-jokes-cohere.json',
    ],
    sources: [
      { path: 'data/icanhazdadjokes-split.json', label: 'I Can Haz Dad Jokes split' },
      { path: 'data/official-jokes-index.json', label: 'Official Jokes index' },
    ],
  },
  {
    id: 'quotes',
    label: 'Quotes',
    datasetFile: 'apps/quotes/quotes-data.js',
    manifestFile: 'data/quotes-manifest.json',
    embeddings: [
      'data/quotes-embeddings.json',
      'data/quotes-embeddings-openai.json',
      'data/quotes-embeddings-cohere.json',
    ],
    similarityReports: [
      'data/similarity-report-quotes.json',
      'data/similarity-report-quotes-openai.json',
      'data/similarity-report-quotes-cohere.json',
    ],
    sources: [
      { path: 'data/curated-quotes.json', label: 'Curated quotes source' },
    ],
  },
  {
    id: 'genalpha',
    label: 'Gen α Slang',
    datasetFile: 'apps/gen-alpha/slang.js',
    manifestFile: 'data/genalpha-manifest.json',
    embeddings: [
      'data/genalpha-embeddings.json',
      'data/genalpha-embeddings-hfspace.json',
      'data/genalpha-embeddings-synthetic128.json',
    ],
    similarityReports: [
      'data/similarity-report-genalpha.json',
      'data/similarity-report-genalpha-hfspace.json',
      'data/similarity-report-genalpha-s128.json',
    ],
    sources: [],
  },
];

const crossDeckReports = [
  'data/similarity-report-cross-deck.json',
  'data/similarity-report-cross-deck-openai.json',
  'data/similarity-report-cross-deck-cohere.json',
];

const safeStat = (relativePath) => {
  if (!relativePath) {
    return null;
  }
  try {
    return fs.statSync(path.join(rootDir, relativePath));
  } catch (error) {
    return null;
  }
};

const readJson = (relativePath) => {
  if (!relativePath) {
    return null;
  }
  try {
    const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

const result = {
  generatedAt: new Date().toISOString(),
  datasets: [],
  providers: [],
  crossDeck: [],
  sources: [],
  totals: {
    datasets: 0,
    entries: 0,
    datasetBytes: 0,
    manifestBytes: 0,
    embeddingVectors: 0,
    embeddingBytes: 0,
    embeddingStores: 0,
    similarityPairs: 0,
    similarityBytes: 0,
    similarityReports: 0,
    totalFiles: 0,
    totalBytes: 0,
    providerCount: 0,
  },
};

const providerMap = new Map();

datasetConfigs.forEach((config) => {
  const datasetStat = safeStat(config.datasetFile);
  const manifestStat = safeStat(config.manifestFile);
  const manifestJson = readJson(config.manifestFile);

  const entriesFromMeta = Number(manifestJson?.meta?.total);
  const entriesFallback = manifestJson && manifestJson.records ? Object.keys(manifestJson.records).length : 0;
  const entries = Number.isFinite(entriesFromMeta) && entriesFromMeta > 0 ? entriesFromMeta : entriesFallback;

  const datasetInfo = {
    id: config.id,
    label: config.label,
    dataset: {
      path: config.datasetFile,
      bytes: datasetStat?.size || 0,
    },
    manifest: {
      path: config.manifestFile,
      bytes: manifestStat?.size || 0,
      generatedAt: manifestJson?.meta?.generatedAt || null,
    },
    entries,
    embeddings: [],
    similarityReports: [],
    sources: [],
    totals: {
      embeddingBytes: 0,
      embeddingVectors: 0,
      similarityBytes: 0,
      similarityPairs: 0,
    },
  };

  if (Array.isArray(config.sources) && config.sources.length > 0) {
    datasetInfo.sources = config.sources
      .map((source) => {
        const stats = safeStat(source.path);
        if (!stats) {
          return null;
        }
        return {
          path: source.path,
          label: source.label || source.path,
          bytes: stats.size,
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(config.embeddings)) {
    config.embeddings.forEach((embeddingPath) => {
      const stats = safeStat(embeddingPath);
      const json = readJson(embeddingPath);
      if (!stats || !json) {
        return;
      }
      const meta = json.meta || {};
      const recordsFromMeta = Number(meta.recordCount);
      const recordsFallback = json.records ? Object.keys(json.records).length : 0;
      const records = Number.isFinite(recordsFromMeta) && recordsFromMeta > 0 ? recordsFromMeta : recordsFallback;
      const dimensions = Number(meta.dimensions);
      const provider = meta.provider || 'unknown';

      datasetInfo.embeddings.push({
        path: embeddingPath,
        provider,
        model: meta.model || null,
        dimensions: Number.isFinite(dimensions) ? dimensions : null,
        records,
        bytes: stats.size,
        generatedAt: meta.generatedAt || null,
      });

      datasetInfo.totals.embeddingBytes += stats.size;
      datasetInfo.totals.embeddingVectors += records;

      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          id: provider,
          stores: 0,
          bytes: 0,
          vectorCount: 0,
          dimensions: new Set(),
        });
      }

      const providerStats = providerMap.get(provider);
      providerStats.stores += 1;
      providerStats.bytes += stats.size;
      providerStats.vectorCount += records;
      if (Number.isFinite(dimensions)) {
        providerStats.dimensions.add(dimensions);
      }
    });
  }

  if (Array.isArray(config.similarityReports)) {
    config.similarityReports.forEach((reportPath) => {
      const stats = safeStat(reportPath);
      const json = readJson(reportPath);
      if (!stats || !json) {
        return;
      }
      const matches = Array.isArray(json.matches) ? json.matches.length : 0;

      datasetInfo.similarityReports.push({
        path: reportPath,
        provider: json.provider || 'unknown',
        model: json.model || null,
        threshold: typeof json.threshold === 'number' ? json.threshold : null,
        pairs: matches,
        bytes: stats.size,
        generatedAt: json.generatedAt || null,
      });

      datasetInfo.totals.similarityBytes += stats.size;
      datasetInfo.totals.similarityPairs += matches;
    });
  }

  result.datasets.push(datasetInfo);

  result.totals.datasets += 1;
  result.totals.entries += entries;
  result.totals.datasetBytes += datasetInfo.dataset.bytes;
  result.totals.manifestBytes += datasetInfo.manifest.bytes;
  result.totals.embeddingBytes += datasetInfo.totals.embeddingBytes;
  result.totals.embeddingVectors += datasetInfo.totals.embeddingVectors;
  result.totals.embeddingStores += datasetInfo.embeddings.length;
  result.totals.similarityBytes += datasetInfo.totals.similarityBytes;
  result.totals.similarityPairs += datasetInfo.totals.similarityPairs;
  result.totals.similarityReports += datasetInfo.similarityReports.length;
  result.totals.totalFiles += 2 + datasetInfo.embeddings.length + datasetInfo.similarityReports.length;
  result.totals.totalBytes +=
    datasetInfo.dataset.bytes +
    datasetInfo.manifest.bytes +
    datasetInfo.totals.embeddingBytes +
    datasetInfo.totals.similarityBytes;

  datasetInfo.sources.forEach((source) => {
    result.sources.push({
      datasetId: config.id,
      label: source.label,
      path: source.path,
      bytes: source.bytes,
    });
    result.totals.totalFiles += 1;
    result.totals.totalBytes += source.bytes;
  });
});

crossDeckReports.forEach((reportPath) => {
  const stats = safeStat(reportPath);
  const json = readJson(reportPath);
  if (!stats || !json) {
    return;
  }
  const matches = Array.isArray(json.matches) ? json.matches.length : 0;

  result.crossDeck.push({
    scope: 'cross-deck',
    path: reportPath,
    provider: json.provider || 'unknown',
    model: json.model || null,
    threshold: typeof json.threshold === 'number' ? json.threshold : null,
    pairs: matches,
    bytes: stats.size,
    generatedAt: json.generatedAt || null,
  });

  result.totals.similarityBytes += stats.size;
  result.totals.similarityPairs += matches;
  result.totals.similarityReports += 1;
  result.totals.totalFiles += 1;
  result.totals.totalBytes += stats.size;
});

result.datasets.sort((a, b) => a.label.localeCompare(b.label, 'en'));

result.providers = Array.from(providerMap.values()).map((provider) => ({
  id: provider.id,
  stores: provider.stores,
  bytes: provider.bytes,
  vectorCount: provider.vectorCount,
  dimensions: Array.from(provider.dimensions).sort((a, b) => a - b),
}));

result.providers.sort((a, b) => b.vectorCount - a.vectorCount);
result.totals.providerCount = result.providers.length;

result.sources.sort((a, b) => {
  if (a.datasetId === b.datasetId) {
    return a.label.localeCompare(b.label, 'en');
  }
  return a.datasetId.localeCompare(b.datasetId, 'en');
});

const outputPath = path.join(rootDir, 'apps', 'asset-observatory', 'asset-data.js');
const payload = `window.assetObservatoryData = ${JSON.stringify(result, null, 2)};\n`;
fs.writeFileSync(outputPath, payload, 'utf8');

console.log(`Asset report generated at ${outputPath}`);
