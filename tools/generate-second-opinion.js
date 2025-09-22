#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execFile } = require('child_process');

const rootDir = path.join(__dirname, '..');
const PROVIDER_NAME = 'hfspace';
const HF_SPACE = {
  baseUrl: 'https://bienkieu-sentence-embedding.hf.space',
  apiPath: 'predict',
  modelLabel: 'sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)',
};
const THRESHOLD = 0.5;
const BATCH_SIZE = 24;
const MAX_MATCHES = {
  jokes: Infinity,
  quotes: Infinity,
  crossDeck: Infinity,
};
const REQUEST_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function loadWindowArray(relativePath, property) {
  const absolutePath = path.join(rootDir, relativePath);
  const code = fs.readFileSync(absolutePath, 'utf8');
  const context = vm.createContext({ window: {} });
  const script = new vm.Script(`${code}; window.${property};`, { filename: absolutePath });
  const result = script.runInContext(context);
  if (!Array.isArray(result)) {
    throw new Error(`Expected window.${property} to be an array in ${relativePath}`);
  }
  return result;
}

function loadJokesEntries() {
  const raw = loadWindowArray('apps/jokes/jokes.js', 'jokes');
  return raw
    .filter((entry) => entry && typeof entry.id === 'string')
    .map((entry) => {
      const setup = typeof entry.joke === 'string' ? entry.joke.trim() : '';
      const punchline = typeof entry.punchline === 'string' ? entry.punchline.trim() : '';
      const embeddingInput = [setup, punchline].filter(Boolean).join(' • ');
      return {
        id: entry.id,
        embeddingInput,
      };
    })
    .filter((entry) => entry.embeddingInput);
}

function loadQuotesEntries() {
  const categories = loadWindowArray('apps/quotes/quotes-data.js', 'quotesData');
  const entries = [];
  categories.forEach((category) => {
    const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
    quotes.forEach((quote) => {
      if (!quote || typeof quote.id !== 'string') {
        return;
      }
      const text = typeof quote.text === 'string' ? quote.text.trim() : '';
      const author = typeof quote.author === 'string' ? quote.author.trim() : '';
      const embeddingInput = author ? `${text} — ${author}` : text;
      if (!embeddingInput) {
        return;
      }
      entries.push({
        id: quote.id,
        embeddingInput,
      });
    });
  });
  return entries;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function parseSseEvents(raw) {
  const events = [];
  let current = null;
  const lines = raw.split(/\r?\n/);
  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      if (current) {
        events.push(current);
      }
      current = { event: line.slice('event:'.length).trim(), data: '' };
      return;
    }
    if (line.startsWith('data:')) {
      if (!current) {
        current = { event: 'message', data: '' };
      }
      const chunk = line.slice('data:'.length).trimStart();
      current.data += current.data ? `\n${chunk}` : chunk;
      return;
    }
    if (!line.trim()) {
      if (current) {
        events.push(current);
        current = null;
      }
    }
  });
  if (current) {
    events.push(current);
  }
  return events;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runCurl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-sS', '-w', '\n%{http_code}', url];
    const method = options.method ? options.method.toUpperCase() : 'GET';
    if (method !== 'GET') {
      args.push('-X', method);
    }

    const headers = options.headers || {};
    Object.entries(headers).forEach(([key, value]) => {
      args.push('-H', `${key}: ${value}`);
    });

    if (options.body !== undefined && options.body !== null) {
      args.push('-d', options.body);
    }

    execFile('curl', args, { maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr && stderr.length ? stderr.toString().trim() : error.message;
        reject(new Error(`curl failed: ${message}`));
        return;
      }

      const output = stdout.toString();
      const lastNewline = output.lastIndexOf('\n');
      if (lastNewline === -1) {
        reject(new Error('curl output missing status code.'));
        return;
      }
      const body = output.slice(0, lastNewline);
      const statusLine = output.slice(lastNewline + 1).trim();
      const statusCode = parseInt(statusLine, 10);
      if (Number.isNaN(statusCode)) {
        reject(new Error(`Failed to parse status code from curl output: ${statusLine}`));
        return;
      }
      resolve({ statusCode, body });
    });
  });
}

async function curlRequest(url, options = {}, retries = REQUEST_RETRIES, retryDelayMs = RETRY_DELAY_MS) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    try {
      const result = await runCurl(url, options);
      if (result.statusCode >= 200 && result.statusCode < 300) {
        return result.body;
      }
      const error = new Error(`Request failed with status ${result.statusCode}: ${result.body.trim() || '(no body)'}`);
      error.statusCode = result.statusCode;
      error.body = result.body;
      lastError = error;
    } catch (error) {
      lastError = error;
    }

    attempt += 1;
    if (attempt > retries) {
      break;
    }
    const shouldRetry = lastError && lastError.statusCode && (lastError.statusCode === 429 || (lastError.statusCode >= 500 && lastError.statusCode < 600));
    if (!shouldRetry) {
      break;
    }
    await wait(retryDelayMs * attempt);
  }

  throw lastError || new Error('curl request failed after retries.');
}

async function curlJson(url, options = {}, retries = REQUEST_RETRIES, retryDelayMs = RETRY_DELAY_MS) {
  const body = await curlRequest(url, options, retries, retryDelayMs);
  if (!body) {
    return {};
  }
  return JSON.parse(body);
}

function curlText(url, options = {}, retries = REQUEST_RETRIES, retryDelayMs = RETRY_DELAY_MS) {
  return curlRequest(url, options, retries, retryDelayMs);
}

async function fetchHfSpaceEmbeddings(inputs) {
  if (!Array.isArray(inputs) || !inputs.length) {
    return { vectors: [], model: HF_SPACE.modelLabel, dimensions: 0 };
  }
  const callUrl = `${HF_SPACE.baseUrl}/gradio_api/call/${HF_SPACE.apiPath}`;
  const callPayload = { data: [inputs] };
  const callResponse = await curlJson(callUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callPayload),
  });

  const eventId = callResponse && callResponse.event_id;
  if (!eventId) {
    throw new Error('HF Space call did not return an event_id.');
  }

  const pollUrl = `${HF_SPACE.baseUrl}/gradio_api/call/${HF_SPACE.apiPath}/${eventId}`;
  const raw = await curlText(pollUrl, {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
  });
  const events = parseSseEvents(raw);
  const completeEvent = events.reverse().find((event) => event.event === 'complete' && event.data);
  if (!completeEvent) {
    throw new Error('HF Space did not emit a completion event.');
  }

  let payload;
  try {
    payload = JSON.parse(completeEvent.data);
  } catch (error) {
    throw new Error(`HF Space returned invalid JSON payload: ${error.message}`);
  }

  let vectors = null;
  if (Array.isArray(payload)) {
    if (payload.length === 1 && Array.isArray(payload[0])) {
      vectors = payload[0];
    } else if (payload.every((item) => Array.isArray(item))) {
      vectors = payload;
    }
  }

  if (!Array.isArray(vectors) || !vectors.length) {
    throw new Error('HF Space did not return any embeddings.');
  }

  if (vectors.length !== inputs.length) {
    throw new Error(`HF Space returned ${vectors.length} embeddings for ${inputs.length} inputs.`);
  }

  return {
    vectors,
    model: HF_SPACE.modelLabel,
    dimensions: Array.isArray(vectors[0]) ? vectors[0].length : 0,
  };
}

function vectorToBase64(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let index = 0; index < vector.length; index += 1) {
    buffer.writeFloatLE(vector[index], index * 4);
  }
  return buffer.toString('base64');
}

function hashVector(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let index = 0; index < vector.length; index += 1) {
    buffer.writeFloatLE(vector[index], index * 4);
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function arrayToFloat32(values) {
  if (!Array.isArray(values)) {
    return new Float32Array();
  }
  const vector = new Float32Array(values.length);
  values.forEach((value, index) => {
    const numeric = Number.parseFloat(value);
    vector[index] = Number.isFinite(numeric) ? numeric : 0;
  });
  return vector;
}

async function buildEmbeddingStore(entries, fileName) {
  const sorted = entries.slice().sort((a, b) => a.id.localeCompare(b.id));
  if (!sorted.length) {
    throw new Error(`No entries provided for ${fileName}.`);
  }
  const batches = chunkArray(sorted, BATCH_SIZE);
  const records = {};
  const vectorMap = new Map();
  let usedModel = HF_SPACE.modelLabel;
  let dimensions = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const texts = batch.map((entry) => entry.embeddingInput);
    const { vectors, model, dimensions: reportedDimensions } = await fetchHfSpaceEmbeddings(texts);
    if (!vectors.length) {
      continue;
    }
    usedModel = model || usedModel;
    if (!dimensions && reportedDimensions) {
      dimensions = reportedDimensions;
    }
    vectors.forEach((values, index) => {
      const entry = batch[index];
      const vector = arrayToFloat32(values);
      vectorMap.set(entry.id, vector);
      records[entry.id] = {
        vector: vectorToBase64(vector),
        vectorSha256: hashVector(vector),
        model: usedModel,
        provider: PROVIDER_NAME,
        dimensions: vector.length,
        textHash: sha256(entry.embeddingInput),
        updatedAt: null,
      };
    });
    console.log(`Embedded batch ${batchIndex + 1}/${batches.length} for ${fileName}`);
  }

  if (!vectorMap.size) {
    throw new Error(`Failed to generate embeddings for ${fileName}`);
  }

  const generatedAt = new Date().toISOString();
  Object.values(records).forEach((record) => {
    record.updatedAt = generatedAt;
  });

  const store = {
    meta: {
      provider: PROVIDER_NAME,
      model: usedModel,
      dimensions: dimensions || Array.from(vectorMap.values())[0].length,
      generatedAt,
      recordCount: sorted.length,
    },
    records,
  };

  const filePath = path.join(rootDir, 'data', fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`);
  return { meta: store.meta, vectorMap };
}

function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < vectorA.length; index += 1) {
    const a = vectorA[index];
    const b = vectorB[index];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (!normA || !normB) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildPairMatches(entries, vectorMap, limit) {
  const matches = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entryA = entries[i];
    const vectorA = vectorMap.get(entryA.id);
    if (!vectorA) {
      continue;
    }
    for (let j = i + 1; j < entries.length; j += 1) {
      const entryB = entries[j];
      const vectorB = vectorMap.get(entryB.id);
      if (!vectorB) {
        continue;
      }
      const similarity = cosineSimilarity(vectorA, vectorB);
      if (similarity >= THRESHOLD) {
        matches.push({
          idA: entryA.id,
          idB: entryB.id,
          similarity,
          previewA: entryA.embeddingInput.slice(0, 160),
          previewB: entryB.embeddingInput.slice(0, 160),
        });
      }
    }
  }
  matches.sort((left, right) => right.similarity - left.similarity);
  if (Number.isFinite(limit) && matches.length > limit) {
    matches.length = limit;
  }
  return matches.map((match) => ({
    idA: match.idA,
    idB: match.idB,
    similarity: Number(match.similarity.toFixed(12)),
    previewA: match.previewA,
    previewB: match.previewB,
  }));
}

function buildCrossMatches(entriesA, vectorsA, entriesB, vectorsB, limit) {
  const matches = [];
  entriesA.forEach((entryA) => {
    const vectorA = vectorsA.get(entryA.id);
    if (!vectorA) {
      return;
    }
    entriesB.forEach((entryB) => {
      const vectorB = vectorsB.get(entryB.id);
      if (!vectorB) {
        return;
      }
      const similarity = cosineSimilarity(vectorA, vectorB);
      if (similarity >= THRESHOLD) {
        matches.push({
          idA: entryA.id,
          idB: entryB.id,
          similarity,
          previewA: entryA.embeddingInput.slice(0, 160),
          previewB: entryB.embeddingInput.slice(0, 160),
        });
      }
    });
  });
  matches.sort((left, right) => right.similarity - left.similarity);
  if (Number.isFinite(limit) && matches.length > limit) {
    matches.length = limit;
  }
  return matches.map((match) => ({
    idA: match.idA,
    idB: match.idB,
    similarity: Number(match.similarity.toFixed(12)),
    previewA: match.previewA,
    previewB: match.previewB,
  }));
}

function writeReport(fileName, dataset, meta, matches) {
  const filePath = path.join(rootDir, 'data', fileName);
  const report = {
    dataset,
    threshold: THRESHOLD,
    generatedAt: meta.generatedAt,
    provider: meta.provider,
    model: meta.model,
    matches,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  const jokesEntries = loadJokesEntries();
  const quotesEntries = loadQuotesEntries();

  if (!jokesEntries.length) {
    throw new Error('No jokes found while generating second opinion embeddings.');
  }
  if (!quotesEntries.length) {
    throw new Error('No quotes found while generating second opinion embeddings.');
  }

  console.log(`Embedding ${jokesEntries.length} jokes and ${quotesEntries.length} quotes with ${HF_SPACE.modelLabel}.`);
  const jokesResult = await buildEmbeddingStore(jokesEntries, 'jokes-embeddings-second-opinion.json');
  const quotesResult = await buildEmbeddingStore(quotesEntries, 'quotes-embeddings-second-opinion.json');

  const jokesMatches = buildPairMatches(jokesEntries, jokesResult.vectorMap, MAX_MATCHES.jokes);
  writeReport('similarity-report-jokes-second-opinion.json', 'jokes', jokesResult.meta, jokesMatches);

  const quotesMatches = buildPairMatches(quotesEntries, quotesResult.vectorMap, MAX_MATCHES.quotes);
  writeReport('similarity-report-quotes-second-opinion.json', 'quotes', quotesResult.meta, quotesMatches);

  const crossGeneratedAt = new Date(Math.max(
    Date.parse(jokesResult.meta.generatedAt),
    Date.parse(quotesResult.meta.generatedAt),
  )).toISOString();
  const crossMatches = buildCrossMatches(quotesEntries, quotesResult.vectorMap, jokesEntries, jokesResult.vectorMap, MAX_MATCHES.crossDeck);
  writeReport('similarity-report-cross-deck-second-opinion.json', 'cross-deck', {
    provider: PROVIDER_NAME,
    model: jokesResult.meta.model,
    generatedAt: crossGeneratedAt,
  }, crossMatches);

  console.log('Second opinion embeddings regenerated.');
  console.log(`  Jokes entries: ${jokesEntries.length}, matches ≥ ${THRESHOLD}: ${jokesMatches.length}`);
  console.log(`  Quotes entries: ${quotesEntries.length}, matches ≥ ${THRESHOLD}: ${quotesMatches.length}`);
  console.log(`  Cross-deck matches ≥ ${THRESHOLD}: ${crossMatches.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
