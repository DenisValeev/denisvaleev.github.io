#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');

function parseArgs(argv) {
  const options = {
    datasets: new Set(),
    provider: null,
    model: null,
    batchSize: 16,
    fakeDimensions: 64,
    threshold: {
      jokes: 0.88,
      quotes: 0.92,
    },
    write: false,
    updateManifest: false,
    reportPath: null,
    dryRun: false,
    force: false,
    limit: null,
    fullScan: false,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--dataset=')) {
      const value = arg.slice('--dataset='.length).split(',');
      value.forEach((name) => {
        const trimmed = name.trim().toLowerCase();
        if (trimmed) {
          options.datasets.add(trimmed);
        }
      });
      return;
    }
    if (arg.startsWith('--provider=')) {
      options.provider = arg.slice('--provider='.length).trim().toLowerCase();
      return;
    }
    if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length).trim();
      return;
    }
    if (arg.startsWith('--batch-size=')) {
      const parsed = parseInt(arg.slice('--batch-size='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.batchSize = parsed;
      }
      return;
    }
    if (arg.startsWith('--fake-dimensions=')) {
      const parsed = parseInt(arg.slice('--fake-dimensions='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.fakeDimensions = parsed;
      }
      return;
    }
    if (arg.startsWith('--threshold-jokes=')) {
      const parsed = parseFloat(arg.slice('--threshold-jokes='.length));
      if (!Number.isNaN(parsed)) {
        options.threshold.jokes = parsed;
      }
      return;
    }
    if (arg.startsWith('--threshold-quotes=')) {
      const parsed = parseFloat(arg.slice('--threshold-quotes='.length));
      if (!Number.isNaN(parsed)) {
        options.threshold.quotes = parsed;
      }
      return;
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length).trim();
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      return;
    }
    switch (arg) {
      case '--write':
        options.write = true;
        break;
      case '--update-manifest':
        options.updateManifest = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--full-scan':
        options.fullScan = true;
        break;
      default:
        break;
    }
  });

  if (!options.provider && options.model) {
    console.warn('Model specified without a provider; ignoring model override.');
  }

  return options;
}

function loadWindowData(filePath, property) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = vm.createContext({ window: {} });
  const script = new vm.Script(`${code}; window.${property};`, { filename: filePath });
  const result = script.runInContext(context);
  if (!Array.isArray(result)) {
    throw new Error(`Expected window.${property} to be an array in ${filePath}`);
  }
  return result;
}

function normalizeQuotes(text) {
  return (text || '')
    .normalize('NFKC')
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚‛‹›]/g, "'");
}

function normalizeText(text) {
  return normalizeQuotes(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1')
    .trim();
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function loadDataset(name) {
  if (name === 'jokes') {
    const datasetPath = path.join(rootDir, 'apps', 'jokes', 'jokes.js');
    const raw = loadWindowData(datasetPath, 'jokes');
    const entries = raw
      .filter((entry) => entry && typeof entry.id === 'string')
      .map((entry) => {
        const setup = entry.joke || '';
        const punchline = entry.punchline || '';
        const combined = [setup, punchline].filter(Boolean).join(' \u2022 ');
        return {
          id: entry.id,
          joke: setup,
          punchline,
          textHash: sha256(combined),
          normalized: normalizeText(`${setup} ${punchline}`),
          embeddingInput: combined,
        };
      });
    return { datasetPath, entries };
  }

  if (name === 'quotes') {
    const datasetPath = path.join(rootDir, 'apps', 'quotes', 'quotes-data.js');
    const raw = loadWindowData(datasetPath, 'quotesData');
    const entries = [];
    raw.forEach((category) => {
      const quotes = Array.isArray(category.quotes) ? category.quotes : [];
      quotes.forEach((quote) => {
        if (!quote || typeof quote.id !== 'string') {
          return;
        }
        const text = quote.text || '';
        const author = quote.author || '';
        const combined = author ? `${text} — ${author}` : text;
        entries.push({
          id: quote.id,
          text,
          author,
          categoryId: category.id,
          textHash: sha256(combined),
          normalized: normalizeText(`${text} ${author}`),
          embeddingInput: combined,
        });
      });
    });
    return { datasetPath, entries };
  }

  throw new Error(`Unsupported dataset: ${name}`);
}

function loadManifest(name) {
  const manifestPath = path.join(rootDir, 'data', `${name}-manifest.json`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || !manifest.records) {
    throw new Error(`Invalid manifest structure in ${manifestPath}`);
  }
  return { manifestPath, manifest };
}

function loadEmbeddingsStore(name) {
  const filePath = path.join(rootDir, 'data', `${name}-embeddings.json`);
  if (!fs.existsSync(filePath)) {
    return { filePath, store: { meta: null, records: {} } };
  }
  const store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!store.records) {
    store.records = {};
  }
  return { filePath, store };
}

function writeEmbeddingsStore(filePath, store) {
  const contents = `${JSON.stringify(store, null, 2)}\n`;
  fs.writeFileSync(filePath, contents);
}

function vectorToBase64(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let i = 0; i < vector.length; i += 1) {
    buffer.writeFloatLE(vector[i], i * 4);
  }
  return buffer.toString('base64');
}

function base64ToVector(base64) {
  const buffer = Buffer.from(base64, 'base64');
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Float32Array(arrayBuffer);
}

function hashVector(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let i = 0; i < vector.length; i += 1) {
    buffer.writeFloatLE(vector[i], i * 4);
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestJson(url, init, retries = 2, retryDelayMs = 2000) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    const response = await fetch(url, init);
    if (response.ok) {
      return response.json();
    }

    const status = response.status;
    if (status === 429 || (status >= 500 && status < 600)) {
      const delay = retryDelayMs * (attempt + 1);
      await wait(delay);
      attempt += 1;
      continue;
    }

    const text = await response.text();
    lastError = new Error(`Request failed with status ${status}: ${text}`);
    break;
  }

  if (!lastError) {
    lastError = new Error('Request failed after retries.');
  }
  throw lastError;
}

function createFakeEmbedding(text, dimensions) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = new Array(dimensions);
  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length];
    vector[i] = (byte / 127.5) - 1;
  }
  return vector;
}

async function fetchEmbeddings(provider, model, inputs, options) {
  if (provider === 'fake') {
    const dims = options.fakeDimensions || 64;
    return {
      vectors: inputs.map((input) => createFakeEmbedding(input, dims)),
      model: model || `fake-${dims}`,
      dimensions: dims,
    };
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required to fetch embeddings from OpenAI.');
    }
    const body = {
      model: model || 'text-embedding-3-small',
      input: inputs,
    };
    const json = await requestJson('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const vectors = (json.data || []).map((item) => item.embedding || []);
    if (!vectors.length) {
      throw new Error('OpenAI response did not contain embeddings.');
    }
    const dimensions = vectors[0].length;
    return { vectors, model: json.model || body.model, dimensions };
  }

  if (provider === 'cohere') {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY is required to fetch embeddings from Cohere.');
    }
    const body = {
      model: model || 'embed-english-v3.0',
      texts: inputs,
      input_type: 'search_document',
    };
    const json = await requestJson('https://api.cohere.com/v1/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const vectors = json.embeddings || [];
    if (!vectors.length) {
      throw new Error('Cohere response did not contain embeddings.');
    }
    const dimensions = vectors[0].length;
    return { vectors, model: json.model || body.model, dimensions };
  }

  if (provider === 'huggingface') {
    const apiKey = process.env.HUGGINGFACEHUB_API_TOKEN;
    if (!apiKey) {
      throw new Error('HUGGINGFACEHUB_API_TOKEN is required to fetch embeddings from Hugging Face.');
    }
    const targetModel = model || 'sentence-transformers/all-MiniLM-L6-v2';
    const body = {
      inputs,
    };
    const json = await requestJson(`https://api-inference.huggingface.co/embeddings/${targetModel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!Array.isArray(json) || !json.length) {
      throw new Error('Hugging Face response did not contain embeddings.');
    }
    const vectors = Array.isArray(json[0]) ? json : [json];
    const dimensions = vectors[0].length;
    return { vectors, model: targetModel, dimensions };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vectorA.length; i += 1) {
    const a = vectorA[i];
    const b = vectorB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (!normA || !normB) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function addPair(pairs, idA, idB) {
  if (!idA || !idB || idA === idB) {
    return;
  }
  const [first, second] = idA < idB ? [idA, idB] : [idB, idA];
  pairs.add(`${first}|${second}`);
}

function buildCandidatePairs(entries, manifest, options) {
  const pairs = new Set();
  const groups = new Map();

  const records = manifest.records || {};

  function pushToGroup(key, id) {
    if (!key) {
      return;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(id);
  }

  entries.forEach((entry) => {
    const record = records[entry.id] || {};
    const signature = record.hashes ? record.hashes.tokenSignature : null;
    const prefix = entry.normalized ? entry.normalized.slice(0, 48) : null;
    const lengthBucket = entry.normalized ? Math.floor(entry.normalized.length / 12) : null;

    if (signature) {
      pushToGroup(`sig:${signature}`, entry.id);
    }
    if (prefix && prefix.length >= 6) {
      pushToGroup(`prefix:${prefix}`, entry.id);
    }
    if (lengthBucket !== null) {
      pushToGroup(`len:${lengthBucket}`, entry.id);
    }
  });

  groups.forEach((ids) => {
    if (!Array.isArray(ids) || ids.length < 2) {
      return;
    }
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        addPair(pairs, ids[i], ids[j]);
      }
    }
  });

  if (options.fullScan) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        addPair(pairs, entries[i].id, entries[j].id);
      }
    }
  }

  return Array.from(pairs).map((key) => {
    const [a, b] = key.split('|');
    return { a, b };
  });
}

function findSimilarPairs(datasetName, entries, manifest, store, threshold, options) {
  const vectors = new Map();
  Object.entries(store.records || {}).forEach(([id, record]) => {
    if (!record || !record.vector) {
      return;
    }
    vectors.set(id, base64ToVector(record.vector));
  });

  const entryMap = new Map();
  entries.forEach((entry) => {
    entryMap.set(entry.id, entry);
  });

  const candidatePairs = buildCandidatePairs(entries, manifest, options);

  const matches = [];
  candidatePairs.forEach((pair) => {
    const vectorA = vectors.get(pair.a);
    const vectorB = vectors.get(pair.b);
    if (!vectorA || !vectorB) {
      return;
    }
    const similarity = cosineSimilarity(vectorA, vectorB);
    if (similarity >= threshold) {
      const entryA = entryMap.get(pair.a);
      const entryB = entryMap.get(pair.b);
      matches.push({
        a: pair.a,
        b: pair.b,
        similarity,
        previewA: entryA ? entryA.embeddingInput.slice(0, 120) : '',
        previewB: entryB ? entryB.embeddingInput.slice(0, 120) : '',
      });
    }
  });

  matches.sort((left, right) => right.similarity - left.similarity);
  return matches;
}

function updateManifestEmbedding(manifest, id, update) {
  if (!manifest.records || !manifest.records[id]) {
    return;
  }
  const existing = manifest.records[id].embedding || {};
  manifest.records[id].embedding = {
    status: 'ready',
    model: update.model,
    vectorSha256: update.vectorSha256,
    updatedAt: update.updatedAt,
  };
  if (existing && existing.notes) {
    manifest.records[id].embedding.notes = existing.notes;
  }
}

async function ensureEmbeddingsForDataset(datasetName, entries, manifest, store, options) {
  if (!entries.length) {
    console.log(`[${datasetName}] No entries to process.`);
    return { store, updated: false };
  }

  const pending = [];
  entries.forEach((entry) => {
    const record = store.records[entry.id];
    if (options.force || !record) {
      pending.push({ entry, reason: record ? 'forced' : 'missing' });
      return;
    }
    if (record.textHash !== entry.textHash) {
      pending.push({ entry, reason: 'text-changed' });
      return;
    }
    if (options.model && record.model !== options.model) {
      pending.push({ entry, reason: 'model-mismatch' });
    }
  });

  if (!pending.length) {
    return { store, updated: false };
  }

  if (!options.provider) {
    console.log(`[${datasetName}] ${pending.length} entries need embeddings but no provider was specified.`);
    return { store, updated: false };
  }

  if (options.dryRun) {
    console.log(`[${datasetName}] Dry run: would fetch ${pending.length} embeddings from ${options.provider}.`);
    return { store, updated: false };
  }

  const limited = options.limit ? pending.slice(0, options.limit) : pending;
  const batches = chunkArray(limited, options.batchSize);
  console.log(`[${datasetName}] Fetching ${limited.length} embeddings in ${batches.length} batches of up to ${options.batchSize}.`);

  let lastDimensions = null;
  let usedModel = null;
  const providerLabel = options.provider;
  const updates = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const texts = batch.map((item) => item.entry.embeddingInput);
    const { vectors, model, dimensions } = await fetchEmbeddings(options.provider, options.model, texts, options);
    if (!lastDimensions) {
      lastDimensions = dimensions;
    }
    if (!usedModel) {
      usedModel = model;
    }
    batch.forEach((item, index) => {
      const vector = vectors[index];
      const base64 = vectorToBase64(vector);
      const vectorSha = hashVector(vector);
      const updatedAt = new Date().toISOString();
      store.records[item.entry.id] = {
        vector: base64,
        vectorSha256: vectorSha,
        model: usedModel,
        provider: providerLabel,
        dimensions: vector.length,
        textHash: item.entry.textHash,
        updatedAt,
      };
      updateManifestEmbedding(manifest, item.entry.id, {
        model: usedModel,
        vectorSha256: vectorSha,
        updatedAt,
      });
      updates.push({ id: item.entry.id, reason: item.reason });
    });
  }

  store.meta = {
    provider: providerLabel,
    model: usedModel,
    dimensions: lastDimensions,
    generatedAt: new Date().toISOString(),
    recordCount: Object.keys(store.records).length,
  };

  return { store, updated: updates.length > 0, updates };
}

function writeReport(reportPath, datasetName, matches, threshold, storeMeta) {
  const report = {
    dataset: datasetName,
    threshold,
    generatedAt: new Date().toISOString(),
    provider: storeMeta ? storeMeta.provider : null,
    model: storeMeta ? storeMeta.model : null,
    matches: matches.map((match) => ({
      idA: match.a,
      idB: match.b,
      similarity: match.similarity,
      previewA: match.previewA,
      previewB: match.previewB,
    })),
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote report to ${path.relative(rootDir, reportPath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasets = options.datasets.size ? Array.from(options.datasets) : ['jokes', 'quotes'];

  for (const datasetName of datasets) {
    if (datasetName !== 'jokes' && datasetName !== 'quotes') {
      console.warn(`Skipping unsupported dataset: ${datasetName}`);
      continue;
    }

    const { entries } = loadDataset(datasetName);
    const { manifestPath, manifest } = loadManifest(datasetName);
    const { filePath, store } = loadEmbeddingsStore(datasetName);

    const result = await ensureEmbeddingsForDataset(datasetName, entries, manifest, store, options);

    if (result.updated && options.write) {
      writeEmbeddingsStore(filePath, store);
      console.log(`[${datasetName}] Wrote embeddings to ${path.relative(rootDir, filePath)}.`);
    } else if (result.updated) {
      console.log(`[${datasetName}] Embeddings updated in memory; rerun with --write to persist changes.`);
    }

    if (result.updated && options.write && options.updateManifest) {
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`[${datasetName}] Updated manifest ${path.relative(rootDir, manifestPath)}.`);
    }

    const threshold = datasetName === 'jokes' ? options.threshold.jokes : options.threshold.quotes;
    const matches = findSimilarPairs(datasetName, entries, manifest, store, threshold, options);

    if (!matches.length) {
      console.log(`[${datasetName}] No embedding-similar pairs found above ${threshold}.`);
    } else {
      console.log(`[${datasetName}] Found ${matches.length} pairs with cosine similarity ≥ ${threshold}.`);
      matches.slice(0, 10).forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.a} ↔ ${match.b} (similarity: ${match.similarity.toFixed(4)})`);
        if (match.previewA) {
          console.log(`     • A: ${match.previewA}`);
        }
        if (match.previewB) {
          console.log(`     • B: ${match.previewB}`);
        }
      });
      if (matches.length > 10) {
        console.log(`  … ${matches.length - 10} more pairs`);
      }
    }

    if (options.reportPath) {
      const absoluteReportPath = path.isAbsolute(options.reportPath)
        ? options.reportPath
        : path.join(rootDir, options.reportPath.replace(/\{dataset\}/g, datasetName));
      writeReport(absoluteReportPath, datasetName, matches, threshold, store.meta);
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
