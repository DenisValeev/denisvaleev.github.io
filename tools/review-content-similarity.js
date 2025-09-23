#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const dns = require('dns');
const { execFile } = require('child_process');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const rootDir = path.join(__dirname, '..');

function parseArgs(argv) {
  const options = {
    datasets: new Set(),
    candidateFiles: new Map(),
    provider: null,
    model: null,
    batchSize: 16,
    syntheticDimensions: 64,
    threshold: {
      jokes: 0.88,
      quotes: 0.92,
      slang: 0.88,
    },
    write: false,
    updateManifest: false,
    reportPath: null,
    dryRun: false,
    force: false,
    limit: null,
    fullScan: false,
    storeSuffix: '',
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--dataset=')) {
      const value = arg.slice('--dataset='.length).split(',');
      value.forEach((name) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) {
          return;
        }
        if (!supportedDatasets.has(trimmed)) {
          console.warn(`Skipping unsupported dataset: ${trimmed}`);
          return;
        }
        options.datasets.add(trimmed);
      });
      return;
    }
    if (arg.startsWith('--provider=')) {
      options.provider = arg.slice('--provider='.length).trim().toLowerCase();
      return;
    }
    if (arg.startsWith('--candidates=')) {
      const value = arg.slice('--candidates='.length).trim();
      if (value) {
        value.split(',').forEach((segment) => {
          const trimmed = segment.trim();
          if (!trimmed) {
            return;
          }
          const separator = trimmed.indexOf(':');
          if (separator === -1) {
            console.warn(`Ignoring --candidates entry without dataset prefix: ${trimmed}`);
            return;
          }
          const dataset = trimmed.slice(0, separator).trim().toLowerCase();
          const filePath = trimmed.slice(separator + 1).trim();
          if (!dataset || !filePath) {
            return;
          }
          if (!supportedDatasets.has(dataset)) {
            console.warn(`Ignoring unsupported dataset for --candidates: ${dataset}`);
            return;
          }
          options.candidateFiles.set(dataset, filePath);
        });
      }
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
    if (arg.startsWith('--synthetic-dimensions=')) {
      const parsed = parseInt(arg.slice('--synthetic-dimensions='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.syntheticDimensions = parsed;
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
    if (arg.startsWith('--threshold-slang=')) {
      const parsed = parseFloat(arg.slice('--threshold-slang='.length));
      if (!Number.isNaN(parsed)) {
        options.threshold.slang = parsed;
      }
      return;
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length).trim();
      return;
    }
    if (arg.startsWith('--store-suffix=')) {
      options.storeSuffix = arg.slice('--store-suffix='.length).trim();
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

const supportedDatasets = new Set(['jokes', 'quotes', 'slang']);

function normalizeStoreSuffix(value) {
  if (!value) {
    return '';
  }
  if (value.startsWith('-') || value.startsWith('_')) {
    return value;
  }
  return `-${value}`;
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

  if (name === 'slang') {
    const datasetPath = path.join(rootDir, 'apps', 'slang', 'slang.js');
    const raw = loadWindowData(datasetPath, 'slangEntries');
    const entries = raw
      .filter((entry) => entry && typeof entry.id === 'string')
      .map((entry) => {
        const term = entry.term || '';
        const definition = entry.definition || '';
        const hint = entry.hint || '';
        const category = entry.category || '';
        const combined = [term, definition, hint, category].filter(Boolean).join(' \u2022 ');
        return {
          id: entry.id,
          term,
          definition,
          hint,
          category,
          categoryId: entry.categoryId || null,
          textHash: sha256(combined),
          normalized: normalizeText(`${term} ${definition} ${hint} ${category}`),
          embeddingInput: combined,
        };
      });
    return { datasetPath, entries };
  }

  throw new Error(`Unsupported dataset: ${name}`);
}

function toStringOrEmpty(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function prepareJokeCandidate(entry, index) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const idBase = typeof entry.id === 'string' ? entry.id.trim() : '';
  const id = idBase || `candidate-${String(index + 1).padStart(3, '0')}`;
  const labelBase = typeof entry.label === 'string' ? entry.label.trim() : '';
  const label = labelBase || id;
  const setup = toStringOrEmpty(entry.joke || entry.setup || '').trim();
  const punchline = toStringOrEmpty(entry.punchline || entry.answer || '').trim();
  if (!setup && !punchline) {
    return null;
  }
  const embeddingInput = [setup, punchline].filter(Boolean).join(' \u2022 ');
  return {
    id,
    label,
    joke: setup,
    punchline,
    embeddingInput,
    normalized: normalizeText(`${setup} ${punchline}`),
    textHash: sha256(embeddingInput),
    source: entry,
  };
}

function prepareSlangCandidate(entry, index) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const idBase = typeof entry.id === 'string' ? entry.id.trim() : '';
  const id = idBase || `candidate-${String(index + 1).padStart(3, '0')}`;
  const labelBase = typeof entry.label === 'string' ? entry.label.trim() : '';
  const label = labelBase || id;
  const term = toStringOrEmpty(entry.term).trim();
  const definition = toStringOrEmpty(entry.definition).trim();
  const hint = toStringOrEmpty(entry.hint).trim();
  const category = toStringOrEmpty(entry.category).trim();
  if (!term) {
    return null;
  }
  const embeddingInput = [term, definition, hint, category].filter(Boolean).join(' \u2022 ');
  return {
    id,
    label,
    term,
    definition,
    hint,
    category,
    embeddingInput,
    normalized: normalizeText(`${term} ${definition} ${hint} ${category}`),
    textHash: sha256(embeddingInput),
    source: entry,
  };
}

function prepareQuoteCandidate(entry, index) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const idBase = typeof entry.id === 'string' ? entry.id.trim() : '';
  const id = idBase || `candidate-${String(index + 1).padStart(3, '0')}`;
  const labelBase = typeof entry.label === 'string' ? entry.label.trim() : '';
  const label = labelBase || id;
  const text = toStringOrEmpty(entry.text).trim();
  const author = toStringOrEmpty(entry.author).trim();
  if (!text) {
    return null;
  }
  const embeddingInput = author ? `${text} — ${author}` : text;
  return {
    id,
    label,
    text,
    author,
    embeddingInput,
    normalized: normalizeText(`${text} ${author}`),
    textHash: sha256(embeddingInput),
    source: entry,
  };
}

function loadCandidateFile(datasetName, filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`[${datasetName}] Candidate file not found: ${filePath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`[${datasetName}] Failed to parse candidate file ${filePath}: ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`[${datasetName}] Candidate file ${filePath} must contain an array of entries.`);
  }
  const prepared = [];
  parsed.forEach((entry, index) => {
    let candidate = null;
    if (datasetName === 'jokes') {
      candidate = prepareJokeCandidate(entry, index);
    } else if (datasetName === 'quotes') {
      candidate = prepareQuoteCandidate(entry, index);
    } else if (datasetName === 'slang') {
      candidate = prepareSlangCandidate(entry, index);
    }
    if (candidate) {
      prepared.push(candidate);
    }
  });
  return {
    absolutePath,
    originalLength: parsed.length,
    entries: prepared,
  };
}

function loadManifest(name) {
  const manifestPath = path.join(rootDir, 'data', `${name}-manifest.json`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || !manifest.records) {
    throw new Error(`Invalid manifest structure in ${manifestPath}`);
  }
  return { manifestPath, manifest };
}

function loadEmbeddingsStore(name, suffix) {
  const filePath = path.join(rootDir, 'data', `${name}-embeddings${suffix || ''}.json`);
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

async function curlRequest(url, options = {}, retries = 2, retryDelayMs = 2000) {
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

async function curlJson(url, options = {}, retries = 2, retryDelayMs = 2000) {
  const body = await curlRequest(url, options, retries, retryDelayMs);
  if (!body) {
    return {};
  }
  return JSON.parse(body);
}

function curlText(url, options = {}, retries = 2, retryDelayMs = 2000) {
  return curlRequest(url, options, retries, retryDelayMs);
}

const hfSpaces = {
  'bienkieu/sentence-embedding': {
    spaceId: 'bienkieu/sentence-embedding',
    baseUrl: 'https://bienkieu-sentence-embedding.hf.space',
    apiPath: 'predict',
    modelLabel: 'sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)',
  },
};

async function fetchHfSpaceEmbeddings(spaceConfig, inputs) {
  const callUrl = `${spaceConfig.baseUrl}/gradio_api/call/${spaceConfig.apiPath}`;
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

  const pollUrl = `${spaceConfig.baseUrl}/gradio_api/call/${spaceConfig.apiPath}/${eventId}`;
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
    model: spaceConfig.modelLabel || spaceConfig.spaceId,
    dimensions: Array.isArray(vectors[0]) ? vectors[0].length : 0,
  };
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

function createSyntheticEmbedding(text, dimensions) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = new Array(dimensions);
  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length];
    vector[i] = (byte / 127.5) - 1;
  }
  return vector;
}

async function fetchEmbeddings(provider, model, inputs, options) {
  if (provider === 'synthetic') {
    const dims = options.syntheticDimensions || 64;
    return {
      vectors: inputs.map((input) => createSyntheticEmbedding(input, dims)),
      model: model || `synthetic-${dims}`,
      dimensions: dims,
    };
  }

  if (provider === 'hfspace') {
    const spaceKey = (model || 'bienkieu/sentence-embedding').toLowerCase();
    const spaceConfig = hfSpaces[spaceKey];
    if (!spaceConfig) {
      const available = Object.keys(hfSpaces).join(', ');
      throw new Error(`Unsupported hfspace model: ${spaceKey}. Available options: ${available || 'none'}.`);
    }
    return fetchHfSpaceEmbeddings(spaceConfig, inputs);
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

async function embedCandidateEntries(datasetName, candidates, options) {
  if (!candidates.length) {
    return null;
  }
  if (!options.provider) {
    throw new Error(`[${datasetName}] --provider is required when using --candidates.`);
  }
  if (options.dryRun) {
    console.log(`[${datasetName}] Dry run: would fetch embeddings for ${candidates.length} candidate entr${candidates.length === 1 ? 'y' : 'ies'} from ${options.provider}.`);
    return null;
  }
  const batches = chunkArray(candidates, options.batchSize);
  console.log(`[${datasetName}] Fetching embeddings for ${candidates.length} candidate entr${candidates.length === 1 ? 'y' : 'ies'} in ${batches.length} batch${batches.length === 1 ? '' : 'es'}.`);
  const vectors = [];
  let usedModel = null;
  let dimensions = null;
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const texts = batch.map((candidate) => candidate.embeddingInput);
    const { vectors: batchVectors, model, dimensions: batchDimensions } = await fetchEmbeddings(options.provider, options.model, texts, options);
    if (!usedModel) {
      usedModel = model;
    }
    if (!dimensions) {
      dimensions = batchDimensions;
    }
    batchVectors.forEach((vector) => {
      vectors.push(vector);
    });
  }
  return { vectors, model: usedModel, dimensions };
}

function compareCandidateVectors(entries, store, candidates, candidateVectors, threshold) {
  const datasetVectors = new Map();
  Object.entries(store.records || {}).forEach(([id, record]) => {
    if (!record || !record.vector) {
      return;
    }
    datasetVectors.set(id, base64ToVector(record.vector));
  });

  const entryMap = new Map();
  entries.forEach((entry) => {
    entryMap.set(entry.id, entry);
  });

  const datasetMatches = [];
  candidates.forEach((candidate, index) => {
    const vectorA = candidateVectors[index];
    if (!vectorA || !vectorA.length) {
      return;
    }
    datasetVectors.forEach((vectorB, id) => {
      if (!vectorB || vectorB.length !== vectorA.length) {
        return;
      }
      const similarity = cosineSimilarity(vectorA, vectorB);
      if (similarity >= threshold) {
        const entry = entryMap.get(id);
        datasetMatches.push({
          candidateId: candidate.id,
          candidateLabel: candidate.label,
          datasetId: id,
          similarity,
          candidatePreview: candidate.embeddingInput.slice(0, 120),
          datasetPreview: entry ? entry.embeddingInput.slice(0, 120) : '',
        });
      }
    });
  });

  const candidateMatches = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const vectorA = candidateVectors[i];
    if (!vectorA || !vectorA.length) {
      continue;
    }
    for (let j = i + 1; j < candidates.length; j += 1) {
      const vectorB = candidateVectors[j];
      if (!vectorB || vectorB.length !== vectorA.length) {
        continue;
      }
      const similarity = cosineSimilarity(vectorA, vectorB);
      if (similarity >= threshold) {
        candidateMatches.push({
          aId: candidates[i].id,
          aLabel: candidates[i].label,
          bId: candidates[j].id,
          bLabel: candidates[j].label,
          similarity,
          aPreview: candidates[i].embeddingInput.slice(0, 120),
          bPreview: candidates[j].embeddingInput.slice(0, 120),
        });
      }
    }
  }

  datasetMatches.sort((left, right) => right.similarity - left.similarity);
  candidateMatches.sort((left, right) => right.similarity - left.similarity);

  return { datasetMatches, candidateMatches };
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

function writeReport(reportPath, datasetName, matches, threshold, storeMeta, candidateSummary) {
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
  if (candidateSummary) {
    report.candidates = {
      sourcePath: candidateSummary.sourcePath,
      totalProvided: candidateSummary.totalProvided,
      totalPrepared: candidateSummary.totalPrepared,
      provider: candidateSummary.provider || null,
      model: candidateSummary.model || null,
      datasetMatches: candidateSummary.datasetMatches.map((match) => ({
        candidateId: match.candidateId,
        candidateLabel: match.candidateLabel,
        datasetId: match.datasetId,
        similarity: match.similarity,
        candidatePreview: match.candidatePreview,
        datasetPreview: match.datasetPreview,
      })),
      candidateMatches: candidateSummary.candidateMatches.map((match) => ({
        candidateA: match.aId,
        candidateALabel: match.aLabel,
        candidateB: match.bId,
        candidateBLabel: match.bLabel,
        similarity: match.similarity,
        previewA: match.aPreview,
        previewB: match.bPreview,
      })),
    };
  }
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote report to ${path.relative(rootDir, reportPath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasets = options.datasets.size ? Array.from(options.datasets) : Array.from(supportedDatasets);

  const suffix = normalizeStoreSuffix(options.storeSuffix);

  for (const datasetName of datasets) {
    if (!supportedDatasets.has(datasetName)) {
      console.warn(`Skipping unsupported dataset: ${datasetName}`);
      continue;
    }

    const { entries } = loadDataset(datasetName);
    const { manifestPath, manifest } = loadManifest(datasetName);
    const { filePath, store } = loadEmbeddingsStore(datasetName, suffix);

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

    let threshold = options.threshold.jokes;
    if (datasetName === 'quotes') {
      threshold = options.threshold.quotes;
    } else if (datasetName === 'slang') {
      threshold = options.threshold.slang;
    }
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

    let candidateSummary = null;
    const candidatePath = options.candidateFiles.get(datasetName);
    if (candidatePath) {
      const candidateData = loadCandidateFile(datasetName, candidatePath);
      const relativeCandidatePath = path.relative(rootDir, candidateData.absolutePath);
      console.log(`[${datasetName}] Loaded ${candidateData.entries.length} candidate entr${candidateData.entries.length === 1 ? 'y' : 'ies'} from ${relativeCandidatePath} (provided ${candidateData.originalLength}).`);
      if (!candidateData.entries.length) {
        console.log(`[${datasetName}] Candidate file did not contain any usable entries.`);
      } else {
        const candidateEmbeddings = await embedCandidateEntries(datasetName, candidateData.entries, options);
        if (!candidateEmbeddings) {
          console.log(`[${datasetName}] Candidate embeddings were not generated; rerun without --dry-run to evaluate overlaps.`);
        } else if (!Array.isArray(candidateEmbeddings.vectors)
          || candidateEmbeddings.vectors.length !== candidateData.entries.length) {
          const received = Array.isArray(candidateEmbeddings.vectors) ? candidateEmbeddings.vectors.length : 0;
          console.warn(`[${datasetName}] Candidate embedding count mismatch (${received} vs ${candidateData.entries.length}); skipping candidate comparison.`);
        } else {
          const comparison = compareCandidateVectors(entries, store, candidateData.entries, candidateEmbeddings.vectors, threshold);
          candidateSummary = {
            sourcePath: relativeCandidatePath,
            totalProvided: candidateData.originalLength,
            totalPrepared: candidateData.entries.length,
            provider: options.provider,
            model: candidateEmbeddings.model,
            datasetMatches: comparison.datasetMatches,
            candidateMatches: comparison.candidateMatches,
          };

          if (!comparison.datasetMatches.length) {
            console.log(`[${datasetName}] No candidate overlaps with existing records above ${threshold}.`);
          } else {
            console.log(`[${datasetName}] ${comparison.datasetMatches.length} candidate entr${comparison.datasetMatches.length === 1 ? 'y' : 'ies'} overlap existing records ≥ ${threshold}.`);
            comparison.datasetMatches.slice(0, 10).forEach((match, index) => {
              console.log(`  ${index + 1}. ${match.candidateLabel} ↔ ${match.datasetId} (similarity: ${match.similarity.toFixed(4)})`);
              if (match.candidatePreview) {
                console.log(`     • candidate: ${match.candidatePreview}`);
              }
              if (match.datasetPreview) {
                console.log(`     • existing: ${match.datasetPreview}`);
              }
            });
            if (comparison.datasetMatches.length > 10) {
              console.log(`  … ${comparison.datasetMatches.length - 10} more matches`);
            }
          }

          if (!comparison.candidateMatches.length) {
            console.log(`[${datasetName}] No duplicates detected among candidate entries above ${threshold}.`);
          } else {
            console.log(`[${datasetName}] ${comparison.candidateMatches.length} candidate pair${comparison.candidateMatches.length === 1 ? '' : 's'} exceed the ${threshold} similarity threshold.`);
            comparison.candidateMatches.slice(0, 10).forEach((match, index) => {
              console.log(`  ${index + 1}. ${match.aLabel} ↔ ${match.bLabel} (similarity: ${match.similarity.toFixed(4)})`);
              if (match.aPreview) {
                console.log(`     • A: ${match.aPreview}`);
              }
              if (match.bPreview) {
                console.log(`     • B: ${match.bPreview}`);
              }
            });
            if (comparison.candidateMatches.length > 10) {
              console.log(`  … ${comparison.candidateMatches.length - 10} more candidate overlaps`);
            }
          }
        }
      }
    }

    if (options.reportPath) {
      const absoluteReportPath = path.isAbsolute(options.reportPath)
        ? options.reportPath
        : path.join(rootDir, options.reportPath.replace(/\{dataset\}/g, datasetName));
      writeReport(absoluteReportPath, datasetName, matches, threshold, store.meta, candidateSummary);
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
