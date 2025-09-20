#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const {
  loadDataset,
  ensureJokeIds,
  ensureQuoteIds,
  formatJokes,
  formatQuotes,
} = require('./update-content-metadata');

const rootDir = path.join(__dirname, '..');

const removalPlan = {
  jokes: [
    'j-0818',
    'j-0830',
    'j-0831',
    'j-0832',
    'j-0833',
    'j-0834',
    'j-0835',
    'j-0836',
    'j-0837',
    'j-0838',
    'j-0839',
    'j-0840',
    'j-0841',
    'j-0842',
    'j-0843',
    'j-0844',
    'j-0845',
    'j-0846',
    'j-0847',
    'j-0848',
    'j-0849',
    'j-0850',
    'j-0851',
    'j-0852',
    'j-0853',
    'j-0854',
    'j-0855',
    'j-0856',
    'j-0857',
    'j-0858',
    'j-0859',
    'j-0860',
    'j-0861',
    'j-0862',
    'j-0863',
    'j-0864',
    'j-0865',
  ],
  quotes: [
    'humor-19',
    'humor-47',
    'humor-50',
    'love-38',
    'love-44',
    'money-36',
    'motivation-28',
    'positive-03',
    'travel-04',
    'travel-06',
    'travel-10',
    'travel-18',
    'travel-28',
    'travel-30',
    'travel-34',
    'travel-38',
    'travel-42',
  ],
};

function parseArgs(argv) {
  const options = {
    datasets: new Set(),
    dryRun: false,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--dataset=')) {
      arg
        .slice('--dataset='.length)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .forEach((value) => options.datasets.add(value));
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, `${contents}\n`);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function pruneEmbeddings(datasetName, removalSet, dryRun) {
  const embeddingsPath = path.join(rootDir, 'data', `${datasetName}-embeddings.json`);
  if (!fs.existsSync(embeddingsPath)) {
    console.warn(`[${datasetName}] Embeddings store not found at ${path.relative(rootDir, embeddingsPath)}.`);
    return;
  }

  const store = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
  const records = store.records || {};
  let removed = 0;
  removalSet.forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(records, id)) {
      removed += 1;
      if (!dryRun) {
        delete records[id];
      }
    }
  });

  if (!removed) {
    console.log(`[${datasetName}] No embeddings matched the removal list.`);
    return;
  }

  if (dryRun) {
    console.log(`[${datasetName}] Would prune ${removed} embedding${removed === 1 ? '' : 's'}.`);
    return;
  }

  const remaining = Object.keys(records).length;
  store.records = records;
  store.meta = store.meta || {};
  store.meta.recordCount = remaining;
  store.meta.generatedAt = new Date().toISOString();

  writeJson(embeddingsPath, store);
  console.log(`[${datasetName}] Pruned ${removed} embedding${removed === 1 ? '' : 's'}; ${remaining} remain.`);
}

function pruneJokes(removalIds, dryRun) {
  if (!removalIds.length) {
    return;
  }

  const dataset = loadDataset(path.join('apps', 'jokes', 'jokes.js'), 'jokes');
  const removalSet = new Set(removalIds);
  const original = Array.isArray(dataset.data) ? dataset.data : [];
  const filtered = original.filter((entry) => entry && !removalSet.has(entry.id));
  const removed = original.length - filtered.length;

  if (!removed) {
    console.log('[jokes] No entries matched the removal list.');
    return;
  }

  console.log(`[jokes] ${dryRun ? 'Would remove' : 'Removing'} ${removed} entr${removed === 1 ? 'y' : 'ies'} from dataset.`);

  const sanitized = ensureJokeIds(filtered);
  if (!dryRun) {
    writeFile(dataset.absolutePath, formatJokes(sanitized));
  }

  const manifestPath = path.join(rootDir, 'data', 'jokes-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const records = manifest.records || {};
  const originalTotal = manifest.meta && typeof manifest.meta.total === 'number'
    ? manifest.meta.total
    : Object.keys(records).length;
  let manifestRemovals = 0;
  removalSet.forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(records, id)) {
      manifestRemovals += 1;
      if (!dryRun) {
        delete records[id];
      }
    }
  });
  manifest.meta = manifest.meta || {};
  manifest.meta.total = dryRun ? originalTotal - manifestRemovals : Object.keys(records).length;
  manifest.meta.generatedAt = new Date().toISOString();

  if (!dryRun) {
    writeJson(manifestPath, manifest);
  }
  console.log(`[jokes] ${dryRun ? 'Would update' : 'Updated'} manifest; ${manifest.meta.total} records remain.`);

  pruneEmbeddings('jokes', removalSet, dryRun);
}

function pruneQuotes(removalIds, dryRun) {
  if (!removalIds.length) {
    return;
  }

  const dataset = loadDataset(path.join('apps', 'quotes', 'quotes-data.js'), 'quotesData');
  const removalSet = new Set(removalIds);
  const categories = Array.isArray(dataset.data) ? dataset.data : [];

  let originalTotal = 0;
  let newTotal = 0;
  const filteredCategories = categories.map((category) => {
    const quotes = Array.isArray(category.quotes) ? category.quotes : [];
    originalTotal += quotes.length;
    const filteredQuotes = quotes.filter((quote) => quote && !removalSet.has(quote.id));
    newTotal += filteredQuotes.length;
    return {
      id: category.id,
      label: category.label,
      quotes: filteredQuotes,
    };
  });

  const removed = originalTotal - newTotal;
  if (!removed) {
    console.log('[quotes] No entries matched the removal list.');
    return;
  }

  console.log(`[quotes] ${dryRun ? 'Would remove' : 'Removing'} ${removed} entr${removed === 1 ? 'y' : 'ies'} from dataset.`);

  const sanitized = ensureQuoteIds(filteredCategories);
  if (!dryRun) {
    writeFile(dataset.absolutePath, formatQuotes(sanitized));
  }

  const manifestPath = path.join(rootDir, 'data', 'quotes-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const records = manifest.records || {};
  const manifestOriginalTotal = manifest.meta && typeof manifest.meta.total === 'number'
    ? manifest.meta.total
    : Object.keys(records).length;
  let manifestRemovals = 0;
  removalSet.forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(records, id)) {
      manifestRemovals += 1;
      if (!dryRun) {
        delete records[id];
      }
    }
  });
  manifest.meta = manifest.meta || {};
  manifest.meta.total = dryRun ? manifestOriginalTotal - manifestRemovals : newTotal;
  manifest.meta.generatedAt = new Date().toISOString();

  if (!dryRun) {
    writeJson(manifestPath, manifest);
  }
  console.log(`[quotes] ${dryRun ? 'Would update' : 'Updated'} manifest; ${manifest.meta.total} records remain.`);

  pruneEmbeddings('quotes', removalSet, dryRun);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasets = options.datasets.size ? Array.from(options.datasets) : Object.keys(removalPlan);

  datasets.forEach((datasetName) => {
    if (!removalPlan[datasetName]) {
      console.warn(`Skipping unsupported dataset: ${datasetName}`);
      return;
    }
    if (datasetName === 'jokes') {
      pruneJokes(removalPlan.jokes, options.dryRun);
    } else if (datasetName === 'quotes') {
      pruneQuotes(removalPlan.quotes, options.dryRun);
    }
  });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  }
}
