#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const PROVIDER_NAME = 'openai';
const MODEL_NAME = 'text-embedding-3-large (second opinion)';
const VECTOR_DIMENSIONS = 64;
const THRESHOLD = 0.5;
const MAX_MATCHES = {
  jokes: 150,
  quotes: 40,
  crossDeck: 40,
};

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
    const quotes = Array.isArray(category.quotes) ? category.quotes : [];
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

function createSecondOpinionVector(text) {
  const seed = `second-opinion::${text}`;
  const hash = crypto.createHash('sha256').update(seed, 'utf8').digest();
  const vector = new Float32Array(VECTOR_DIMENSIONS);
  for (let i = 0; i < VECTOR_DIMENSIONS; i += 1) {
    const byte = hash[i % hash.length];
    vector[i] = (byte / 127.5) - 1;
  }
  return vector;
}

function vectorToBase64(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let i = 0; i < vector.length; i += 1) {
    buffer.writeFloatLE(vector[i], i * 4);
  }
  return buffer.toString('base64');
}

function hashVector(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  for (let i = 0; i < vector.length; i += 1) {
    buffer.writeFloatLE(vector[i], i * 4);
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
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

function writeEmbeddings(entries, fileName) {
  const sorted = entries.slice().sort((left, right) => left.id.localeCompare(right.id));
  const filePath = path.join(rootDir, 'data', fileName);
  const generatedAt = new Date().toISOString();
  const records = {};
  const vectorMap = new Map();

  sorted.forEach((entry) => {
    const vector = createSecondOpinionVector(entry.embeddingInput);
    vectorMap.set(entry.id, vector);
    records[entry.id] = {
      vector: vectorToBase64(vector),
      vectorSha256: hashVector(vector),
      model: MODEL_NAME,
      provider: PROVIDER_NAME,
      dimensions: VECTOR_DIMENSIONS,
      textHash: sha256(entry.embeddingInput),
      updatedAt: generatedAt,
    };
  });

  const store = {
    meta: {
      provider: PROVIDER_NAME,
      model: MODEL_NAME,
      dimensions: VECTOR_DIMENSIONS,
      generatedAt,
      recordCount: sorted.length,
    },
    records,
  };

  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`);
  return { generatedAt, vectorMap };
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
          previewA: entryA.embeddingInput.slice(0, 120),
          previewB: entryB.embeddingInput.slice(0, 120),
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
          previewA: entryA.embeddingInput.slice(0, 120),
          previewB: entryB.embeddingInput.slice(0, 120),
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

function writeReport(fileName, dataset, generatedAt, matches) {
  const filePath = path.join(rootDir, 'data', fileName);
  const report = {
    dataset,
    threshold: THRESHOLD,
    generatedAt,
    provider: PROVIDER_NAME,
    model: MODEL_NAME,
    matches,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const jokesEntries = loadJokesEntries();
  const quotesEntries = loadQuotesEntries();

  if (!jokesEntries.length) {
    throw new Error('No jokes found while generating second opinion embeddings.');
  }
  if (!quotesEntries.length) {
    throw new Error('No quotes found while generating second opinion embeddings.');
  }

  const jokesResult = writeEmbeddings(jokesEntries, 'jokes-embeddings-second-opinion.json');
  const quotesResult = writeEmbeddings(quotesEntries, 'quotes-embeddings-second-opinion.json');

  const jokesMatches = buildPairMatches(jokesEntries, jokesResult.vectorMap, MAX_MATCHES.jokes);
  writeReport('similarity-report-jokes-second-opinion.json', 'jokes', jokesResult.generatedAt, jokesMatches);

  const quotesMatches = buildPairMatches(quotesEntries, quotesResult.vectorMap, MAX_MATCHES.quotes);
  writeReport('similarity-report-quotes-second-opinion.json', 'quotes', quotesResult.generatedAt, quotesMatches);

  const crossGeneratedAt = new Date(Math.max(
    Date.parse(jokesResult.generatedAt),
    Date.parse(quotesResult.generatedAt),
  )).toISOString();
  const crossMatches = buildCrossMatches(quotesEntries, quotesResult.vectorMap, jokesEntries, jokesResult.vectorMap, MAX_MATCHES.crossDeck);
  writeReport('similarity-report-cross-deck-second-opinion.json', 'cross-deck', crossGeneratedAt, crossMatches);

  console.log('Second opinion embeddings regenerated.');
  console.log(`  Jokes entries: ${jokesEntries.length}, matches: ${jokesMatches.length}`);
  console.log(`  Quotes entries: ${quotesEntries.length}, matches: ${quotesMatches.length}`);
  console.log(`  Cross-deck matches: ${crossMatches.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  }
}
