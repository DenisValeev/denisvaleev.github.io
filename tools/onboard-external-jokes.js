#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..');

function parseArgs(argv) {
  const options = {
    inputPath: null,
    threshold: 0.8,
    providers: null,
    existingPaths: new Map(),
    candidatePaths: new Map(),
    outputPath: null,
    acceptedOutputPath: null,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--input=')) {
      options.inputPath = arg.slice('--input='.length).trim();
      return;
    }
    if (arg.startsWith('--candidates=')) {
      options.inputPath = arg.slice('--candidates='.length).trim();
      return;
    }
    if (arg.startsWith('--threshold=')) {
      const parsed = parseFloat(arg.slice('--threshold='.length));
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        options.threshold = parsed;
      }
      return;
    }
    if (arg.startsWith('--providers=')) {
      const value = arg.slice('--providers='.length).trim();
      if (value) {
        const list = value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
        if (list.length) {
          options.providers = list;
        }
      }
      return;
    }
    if (arg.startsWith('--existing-embeddings=')) {
      const value = arg.slice('--existing-embeddings='.length).trim();
      if (value) {
        value.split(',').forEach((segment) => {
          const trimmed = segment.trim();
          if (!trimmed) {
            return;
          }
          const separator = trimmed.indexOf(':');
          if (separator === -1) {
            return;
          }
          const provider = trimmed.slice(0, separator).trim().toLowerCase();
          const filePath = trimmed.slice(separator + 1).trim();
          if (!provider || !filePath) {
            return;
          }
          options.existingPaths.set(provider, filePath);
        });
      }
      return;
    }
    if (arg.startsWith('--candidate-embeddings=')) {
      const value = arg.slice('--candidate-embeddings='.length).trim();
      if (value) {
        value.split(',').forEach((segment) => {
          const trimmed = segment.trim();
          if (!trimmed) {
            return;
          }
          const separator = trimmed.indexOf(':');
          if (separator === -1) {
            return;
          }
          const provider = trimmed.slice(0, separator).trim().toLowerCase();
          const filePath = trimmed.slice(separator + 1).trim();
          if (!provider || !filePath) {
            return;
          }
          options.candidatePaths.set(provider, filePath);
        });
      }
      return;
    }
    if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice('--output='.length).trim();
      return;
    }
    if (arg.startsWith('--accepted-output=')) {
      options.acceptedOutputPath = arg.slice('--accepted-output='.length).trim();
      return;
    }
  });

  return options;
}

function relativeToRoot(absolutePath) {
  if (!absolutePath) {
    return null;
  }
  return path.relative(rootDir, absolutePath) || path.basename(absolutePath);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function toStringOrEmpty(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function prepareCandidate(entry, index, seenIds) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const rawId = toStringOrEmpty(entry.id).trim();
  let id = rawId;
  if (!id || seenIds.has(id)) {
    const width = Math.max(3, String(index + 1).length);
    let counter = index + 1;
    do {
      id = `candidate-${String(counter).padStart(width, '0')}`;
      counter += 1;
    } while (seenIds.has(id));
  }
  seenIds.add(id);
  const labelBase = toStringOrEmpty(entry.label).trim();
  const label = labelBase || id;
  const setup = toStringOrEmpty(entry.joke || entry.setup).trim();
  const punchline = toStringOrEmpty(entry.punchline || entry.answer).trim();
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
    source: entry,
  };
}

function loadCandidates(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Candidate file not found: ${filePath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFile(absolutePath));
  } catch (error) {
    throw new Error(`Failed to parse candidate file ${filePath}: ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Candidate file ${filePath} must contain an array.`);
  }
  const seen = new Set();
  const candidates = [];
  parsed.forEach((entry, index) => {
    const prepared = prepareCandidate(entry, index, seen);
    if (prepared) {
      candidates.push(prepared);
    }
  });
  return {
    absolutePath,
    totalProvided: parsed.length,
    candidates,
  };
}

function base64ToVector(base64String) {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    if (buffer.length % 4 !== 0) {
      return null;
    }
    const vector = new Float32Array(buffer.length / 4);
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] = buffer.readFloatLE(i * 4);
    }
    return vector;
  } catch (error) {
    return null;
  }
}

function createDeterministicVector(text, dims, salt) {
  const hash = crypto.createHash('sha256').update(`${salt}||${text}`).digest();
  const vector = new Float32Array(dims);
  for (let i = 0; i < dims; i += 1) {
    const byte = hash[i % hash.length];
    vector[i] = (byte / 127.5) - 1;
  }
  return vector;
}

function loadEmbeddingVectors(label, filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`[${label}] Embeddings file not found: ${relativeToRoot(absolutePath)}.`);
    return null;
  }
  let raw;
  try {
    raw = JSON.parse(readFile(absolutePath));
  } catch (error) {
    console.warn(`[${label}] Failed to parse ${relativeToRoot(absolutePath)}: ${error.message}`);
    return null;
  }
  if (!raw || typeof raw !== 'object' || typeof raw.records !== 'object') {
    console.warn(`[${label}] Invalid embeddings structure in ${relativeToRoot(absolutePath)}.`);
    return null;
  }
  const vectors = new Map();
  Object.entries(raw.records).forEach(([id, record]) => {
    if (!record || typeof record.vector !== 'string') {
      return;
    }
    const vector = base64ToVector(record.vector);
    if (!vector) {
      return;
    }
    vectors.set(id, vector);
  });
  if (!vectors.size) {
    console.warn(`[${label}] No embeddings loaded from ${relativeToRoot(absolutePath)}.`);
    return null;
  }
  const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  const dimensions = typeof meta.dimensions === 'number' && meta.dimensions > 0
    ? meta.dimensions
    : vectors.values().next().value.length;
  return {
    meta,
    vectors,
    dimensions,
    sourcePath: absolutePath,
  };
}

function buildDeterministicEmbeddings(provider, entries, dims, salt) {
  const vectors = new Map();
  entries.forEach((entry) => {
    if (!entry || !entry.embeddingInput) {
      return;
    }
    vectors.set(entry.id, createDeterministicVector(entry.embeddingInput, dims, salt));
  });
  return {
    provider,
    model: `deterministic-${provider}-${dims}`,
    dimensions: dims,
    vectors,
    source: 'deterministic',
  };
}

function loadExistingJokes() {
  const datasetPath = path.join(rootDir, 'apps', 'jokes', 'jokes.js');
  const code = readFile(datasetPath);
  const context = vm.createContext({ window: {} });
  const script = new vm.Script(code, { filename: datasetPath });
  script.runInContext(context);
  const raw = Array.isArray(context.window.jokes) ? context.window.jokes : [];
  const entries = [];
  const map = new Map();
  raw.forEach((entry) => {
    if (!entry || typeof entry.id !== 'string') {
      return;
    }
    const id = entry.id.trim();
    if (!id) {
      return;
    }
    const joke = toStringOrEmpty(entry.joke).trim();
    const punchline = toStringOrEmpty(entry.punchline).trim();
    const embeddingInput = [joke, punchline].filter(Boolean).join(' \u2022 ');
    const prepared = {
      id,
      joke,
      punchline,
      embeddingInput,
    };
    entries.push(prepared);
    map.set(id, prepared);
  });
  return {
    entries,
    map,
    datasetPath,
  };
}

function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length || !vectorA.length) {
    return null;
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
    return null;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findBestMatch(vector, existingVectors) {
  let bestId = null;
  let bestSimilarity = -Infinity;
  existingVectors.forEach((candidate, id) => {
    if (!candidate || candidate.length !== vector.length) {
      return;
    }
    const similarity = cosineSimilarity(vector, candidate);
    if (similarity === null) {
      return;
    }
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestId = id;
    }
  });
  if (bestSimilarity === -Infinity) {
    return { bestId: null, similarity: null };
  }
  return { bestId, similarity: bestSimilarity };
}

function truncate(text, maxLength) {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function evaluateCandidates(candidates, providers, existingEmbeddings, candidateEmbeddings, existingLookup, threshold) {
  const accepted = [];
  const rejected = [];
  const providerStats = new Map();
  providers.forEach((provider) => {
    providerStats.set(provider, {
      evaluated: 0,
      missing: 0,
      rejections: 0,
    });
  });

  candidates.forEach((candidate) => {
    const perProvider = [];
    const rejectionReasons = [];
    providers.forEach((provider) => {
      const existing = existingEmbeddings.get(provider);
      const candidateStore = candidateEmbeddings.get(provider);
      if (!existing || !candidateStore) {
        return;
      }
      const stats = providerStats.get(provider);
      const vector = candidateStore.vectors.get(candidate.id);
      if (!vector) {
        stats.missing += 1;
        perProvider.push({ provider, status: 'missing' });
        return;
      }
      stats.evaluated += 1;
      if (vector.length !== existing.dimensions) {
        perProvider.push({ provider, status: 'dimension-mismatch' });
        return;
      }
      const { bestId, similarity } = findBestMatch(vector, existing.vectors);
      const normalizedSimilarity = typeof similarity === 'number' ? similarity : null;
      let matchPreview = null;
      if (bestId && existingLookup.has(bestId)) {
        const entry = existingLookup.get(bestId);
        matchPreview = truncate(entry.embeddingInput, 120);
      }
      perProvider.push({ provider, similarity: normalizedSimilarity, matchId: bestId, matchPreview });
      if (normalizedSimilarity !== null && normalizedSimilarity >= threshold && bestId) {
        stats.rejections += 1;
        rejectionReasons.push({ provider, matchId: bestId, similarity: normalizedSimilarity, matchPreview });
      }
    });
    const baseInfo = {
      id: candidate.id,
      label: candidate.label,
      joke: candidate.joke,
      punchline: candidate.punchline,
      providers: perProvider,
      source: candidate.source,
    };
    if (rejectionReasons.length) {
      rejected.push(Object.assign({}, baseInfo, { reasons: rejectionReasons }));
    } else {
      accepted.push(baseInfo);
    }
  });

  return {
    accepted,
    rejected,
    providerStats,
  };
}

function formatProviderSummary(provider, existingInfo, candidateInfo) {
  return {
    provider,
    dimensions: existingInfo ? existingInfo.dimensions : null,
    existingSource: existingInfo ? existingInfo.source : null,
    existingPath: existingInfo && existingInfo.sourcePath ? relativeToRoot(existingInfo.sourcePath) : null,
    candidateSource: candidateInfo ? candidateInfo.source : null,
    candidatePath: candidateInfo && candidateInfo.sourcePath ? relativeToRoot(candidateInfo.sourcePath) : null,
  };
}

function writeJson(filePath, payload) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return absolutePath;
}

function formatSimilarity(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(4);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.inputPath) {
    console.error('Usage: node tools/onboard-external-jokes.js --input=path/to/candidates.json [--providers=fake,openai,cohere]');
    process.exitCode = 1;
    return;
  }

  const { entries: existingEntries, map: existingLookup } = loadExistingJokes();
  const candidateData = loadCandidates(options.inputPath);
  const candidatePath = relativeToRoot(candidateData.absolutePath);
  if (!candidateData.candidates.length) {
    console.log(`[candidates] Loaded 0 usable entries from ${candidatePath} (provided ${candidateData.totalProvided}). Nothing to evaluate.`);
    return;
  }

  const providers = Array.isArray(options.providers) && options.providers.length
    ? options.providers
    : ['fake', 'openai', 'cohere'];
  const defaultExistingPaths = new Map([
    ['fake', path.join('data', 'jokes-embeddings.json')],
    ['openai', path.join('data', 'jokes-embeddings-openai.json')],
    ['cohere', path.join('data', 'jokes-embeddings-cohere.json')],
  ]);

  const existingEmbeddings = new Map();
  const candidateEmbeddings = new Map();
  const evaluatedProviders = [];

  providers.forEach((provider) => {
    const label = provider;
    const existingPath = options.existingPaths.has(provider)
      ? options.existingPaths.get(provider)
      : defaultExistingPaths.get(provider);
    let existingInfo = null;
    if (existingPath) {
      existingInfo = loadEmbeddingVectors(`existing:${label}`, existingPath);
      if (existingInfo) {
        existingInfo.provider = provider;
        existingInfo.model = existingInfo.meta && existingInfo.meta.model ? existingInfo.meta.model : null;
        existingInfo.source = 'file';
      }
    }
    if (!existingInfo) {
      const fallbackDimMap = new Map([
        ['fake', 64],
        ['openai', 64],
        ['cohere', 64],
      ]);
      const dims = fallbackDimMap.get(provider) || 64;
      const fallback = buildDeterministicEmbeddings(provider, existingEntries, dims, provider);
      existingInfo = Object.assign({ source: 'deterministic', provider }, fallback);
      console.warn(`[existing:${label}] Using deterministic fallback embeddings (dimensions: ${dims}).`);
    }
    existingEmbeddings.set(provider, existingInfo);

    const candidatePathOverride = options.candidatePaths.get(provider);
    let candidateInfo = null;
    if (candidatePathOverride) {
      candidateInfo = loadEmbeddingVectors(`candidate:${label}`, candidatePathOverride);
      if (candidateInfo) {
        if (candidateInfo.dimensions !== existingInfo.dimensions) {
          console.warn(`[candidate:${label}] Dimension mismatch (${candidateInfo.dimensions} vs ${existingInfo.dimensions}); embeddings will be regenerated deterministically.`);
          candidateInfo = null;
        } else {
          candidateInfo.provider = provider;
          candidateInfo.model = candidateInfo.meta && candidateInfo.meta.model ? candidateInfo.meta.model : null;
          candidateInfo.source = 'file';
        }
      }
    }
    if (!candidateInfo) {
      const vectors = new Map();
      candidateData.candidates.forEach((candidate) => {
        if (!candidate.embeddingInput) {
          return;
        }
        vectors.set(candidate.id, createDeterministicVector(candidate.embeddingInput, existingInfo.dimensions, provider));
      });
      candidateInfo = {
        provider,
        model: `deterministic-${provider}-${existingInfo.dimensions}`,
        dimensions: existingInfo.dimensions,
        vectors,
        source: 'deterministic',
      };
      console.warn(`[candidate:${label}] Using deterministic fallback embeddings for candidates.`);
    }

    existingEmbeddings.set(provider, existingInfo);
    candidateEmbeddings.set(provider, candidateInfo);
    evaluatedProviders.push(provider);
  });

  if (!evaluatedProviders.length) {
    console.log('No providers available for evaluation.');
    return;
  }

  const evaluation = evaluateCandidates(
    candidateData.candidates,
    evaluatedProviders,
    existingEmbeddings,
    candidateEmbeddings,
    existingLookup,
    options.threshold,
  );

  const providerSummaries = evaluatedProviders.map((provider) => (
    formatProviderSummary(provider, existingEmbeddings.get(provider), candidateEmbeddings.get(provider))
  ));

  const summary = {
    meta: {
      generatedAt: new Date().toISOString(),
      threshold: options.threshold,
      candidateFile: candidatePath,
      totalCandidates: candidateData.candidates.length,
      totalProvided: candidateData.totalProvided,
      accepted: evaluation.accepted.length,
      rejected: evaluation.rejected.length,
      providers: providerSummaries,
    },
    accepted: evaluation.accepted,
    rejected: evaluation.rejected,
  };

  console.log(`[candidates] Loaded ${candidateData.candidates.length} entr${candidateData.candidates.length === 1 ? 'y' : 'ies'} from ${candidatePath} (provided ${candidateData.totalProvided}).`);
  console.log(`[providers] Evaluated ${evaluatedProviders.join(', ')} at threshold ${options.threshold}.`);
  providerSummaries.forEach((info) => {
    const existingLabel = info.existingSource === 'file'
      ? `store:${info.existingPath}`
      : info.existingSource || 'unknown';
    const candidateLabel = info.candidateSource === 'file'
      ? `store:${info.candidatePath}`
      : info.candidateSource || 'unknown';
    console.log(`  - ${info.provider}: ${existingLabel} → ${candidateLabel} (dims: ${info.dimensions || 'n/a'})`);
  });
  console.log(`[result] Accepted ${evaluation.accepted.length}, rejected ${evaluation.rejected.length}.`);

  if (evaluation.rejected.length) {
    console.log('[rejected] Top overlaps:');
    evaluation.rejected.slice(0, 10).forEach((item, index) => {
      const strongest = item.reasons.reduce((acc, reason) => {
        if (!acc || (reason.similarity !== null && reason.similarity > acc.similarity)) {
          return reason;
        }
        return acc;
      }, null);
      const headline = strongest
        ? `${strongest.provider} ↔ ${strongest.matchId} (${formatSimilarity(strongest.similarity)})`
        : 'no match available';
      console.log(`  ${index + 1}. ${item.id}: ${headline}`);
      if (strongest && strongest.matchPreview) {
        console.log(`     • existing: ${strongest.matchPreview}`);
      }
      if (item.joke || item.punchline) {
        const preview = [item.joke, item.punchline].filter(Boolean).join(' • ');
        console.log(`     • candidate: ${truncate(preview, 120)}`);
      }
    });
  }

  if (evaluation.accepted.length) {
    console.log('[accepted] Highest cosine matches across providers (below threshold):');
    const scored = evaluation.accepted.map((item) => {
      const best = item.providers.reduce((acc, providerInfo) => {
        if (!providerInfo || providerInfo.similarity === null || providerInfo.similarity === undefined) {
          return acc;
        }
        if (!acc || providerInfo.similarity > acc.similarity) {
          return providerInfo;
        }
        return acc;
      }, null);
      return { item, best };
    });
    scored
      .filter((entry) => entry.best)
      .sort((a, b) => b.best.similarity - a.best.similarity)
      .slice(0, 10)
      .forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.item.id}: ${entry.best.provider} → ${entry.best.matchId || 'n/a'} (${formatSimilarity(entry.best.similarity)})`);
      });
  }

  if (options.outputPath) {
    const written = writeJson(options.outputPath, summary);
    console.log(`[output] Wrote summary to ${relativeToRoot(written)}.`);
  }

  if (options.acceptedOutputPath) {
    const acceptedPayload = evaluation.accepted.map((item) => ({
      id: item.id,
      label: item.label,
      joke: item.joke,
      punchline: item.punchline,
      source: item.source,
      providers: item.providers,
    }));
    const written = writeJson(options.acceptedOutputPath, acceptedPayload);
    console.log(`[output] Wrote accepted entries to ${relativeToRoot(written)}.`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  }
}
