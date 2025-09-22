#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function loadJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const contents = fs.readFileSync(absolutePath, 'utf8');
  return { absolutePath, data: JSON.parse(contents) };
}

function writeJson(absolutePath, value) {
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeEmbeddingsMeta(relativePath) {
  const { absolutePath, data } = loadJson(relativePath);
  const records = data && data.records ? Object.values(data.records) : [];
  if (!records.length) {
    throw new Error(`Embeddings store at ${relativePath} does not contain any records.`);
  }
  const latest = records.reduce((max, record) => {
    if (!record || !record.updatedAt) {
      return max;
    }
    const timestamp = Date.parse(record.updatedAt);
    return Number.isNaN(timestamp) ? max : Math.max(max, timestamp);
  }, Number.NEGATIVE_INFINITY);
  if (!Number.isFinite(latest)) {
    throw new Error(`Embeddings store at ${relativePath} has no valid updatedAt timestamps.`);
  }
  const generatedAt = new Date(latest).toISOString();
  data.meta = data.meta || {};
  data.meta.generatedAt = generatedAt;
  data.meta.recordCount = records.length;
  writeJson(absolutePath, data);
  return generatedAt;
}

function updateReportTimestamp(relativePath, generatedAt) {
  const { absolutePath, data } = loadJson(relativePath);
  data.generatedAt = generatedAt;
  writeJson(absolutePath, data);
}

function main() {
  const embeddingsFiles = {
    jokes: 'data/jokes-embeddings-openai.json',
    quotes: 'data/quotes-embeddings-openai.json',
  };

  const generatedAtByDataset = Object.entries(embeddingsFiles).reduce((acc, [key, filePath]) => {
    const timestamp = normalizeEmbeddingsMeta(filePath);
    acc[key] = timestamp;
    console.log(`Updated ${filePath} → ${timestamp}`);
    return acc;
  }, {});

  const crossDeckGeneratedAt = ['jokes', 'quotes']
    .map((key) => Date.parse(generatedAtByDataset[key] || ''))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);
  if (!Number.isFinite(crossDeckGeneratedAt)) {
    throw new Error('Failed to resolve generatedAt timestamp for cross-deck report.');
  }
  const crossDeckTimestamp = new Date(crossDeckGeneratedAt).toISOString();

  updateReportTimestamp('data/similarity-report-jokes-openai.json', generatedAtByDataset.jokes);
  console.log(`Updated data/similarity-report-jokes-openai.json → ${generatedAtByDataset.jokes}`);

  updateReportTimestamp('data/similarity-report-quotes-openai.json', generatedAtByDataset.quotes);
  console.log(`Updated data/similarity-report-quotes-openai.json → ${generatedAtByDataset.quotes}`);

  updateReportTimestamp('data/similarity-report-cross-deck-openai.json', crossDeckTimestamp);
  console.log(`Updated data/similarity-report-cross-deck-openai.json → ${crossDeckTimestamp}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
