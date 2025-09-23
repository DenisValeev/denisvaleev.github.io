#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
const jokesPreamble = '// Maintenance: run the commands in apps/jokes/AGENTS.md after editing this dataset to keep the syntax valid.';
const genAlphaPreamble = '// Maintenance: run the commands in apps/gen-alpha/AGENTS.md after editing this dataset to keep the syntax valid.';

const supportedDatasets = new Set(['jokes', 'quotes', 'genalpha']);

function parseDatasets(argv) {
  const datasetArg = argv.find((arg) => arg.startsWith('--dataset='));
  if (!datasetArg) {
    return new Set(['jokes', 'quotes', 'genalpha']);
  }
  const values = datasetArg
    .slice('--dataset='.length)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const selection = new Set();
  values.forEach((value) => {
    if (supportedDatasets.has(value)) {
      selection.add(value);
    } else {
      console.warn(`Ignoring unsupported dataset: ${value}`);
    }
  });
  if (!selection.size) {
    return new Set(['jokes', 'quotes', 'genalpha']);
  }
  return selection;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, `${contents}\n`);
}

function loadDataset(relativePath, globalKey) {
  const absolutePath = path.join(rootDir, relativePath);
  const code = readFile(absolutePath);
  const context = vm.createContext({ window: {} });
  const script = new vm.Script(code, { filename: absolutePath });
  script.runInContext(context);
  const data = context.window[globalKey];
  if (!Array.isArray(data)) {
    throw new Error(`Expected window.${globalKey} to be an array in ${relativePath}`);
  }
  return { absolutePath, data };
}

function padNumber(value, width) {
  return String(value).padStart(width, '0');
}

function ensureJokeIds(entries) {
  const width = Math.max(4, String(entries.length).length);
  const seen = new Set();
  return entries.map((entry, index) => {
    const base = entry && typeof entry.id === 'string' ? entry.id.trim() : '';
    const fallback = `j-${padNumber(index + 1, width)}`;
    const id = base && !seen.has(base) ? base : fallback;
    seen.add(id);
    return {
      id,
      joke: entry.joke,
      punchline: entry.punchline,
    };
  });
}

function ensureGenAlphaIds(entries) {
  const width = Math.max(4, String(entries.length).length);
  const seen = new Set();
  return entries.map((entry, index) => {
    const base = entry && typeof entry.id === 'string' ? entry.id.trim() : '';
    const fallback = `ga-${padNumber(index + 1, width)}`;
    const id = base && !seen.has(base) ? base : fallback;
    seen.add(id);
    return {
      id,
      term: entry.term,
      definition: entry.definition,
    };
  });
}

function ensureQuoteIds(categories) {
  return categories.map((category) => {
    const quotes = Array.isArray(category.quotes) ? category.quotes : [];
    const width = Math.max(2, String(quotes.length).length);
    const seen = new Set();
    const preparedQuotes = quotes.map((quote, index) => {
      const base = quote && typeof quote.id === 'string' ? quote.id.trim() : '';
      const fallback = `${category.id}-${padNumber(index + 1, width)}`;
      const id = base && !seen.has(base) ? base : fallback;
      seen.add(id);
      return {
        id,
        text: quote.text,
        author: quote.author,
      };
    });
    return {
      id: category.id,
      label: category.label,
      quotes: preparedQuotes,
    };
  });
}

function formatJokes(entries) {
  const lines = [jokesPreamble, '', 'window.jokes = ['];
  entries.forEach((entry, index) => {
    if (index === 0) {
      lines.push('        {');
    }
    lines.push(`            "id": ${JSON.stringify(entry.id)},`);
    lines.push(`            "joke": ${JSON.stringify(entry.joke)},`);
    lines.push(`            "punchline": ${JSON.stringify(entry.punchline)}`);
    if (index === entries.length - 1) {
      lines.push('        }');
    } else {
      lines.push('        }, {');
    }
  });
  lines.push('    ];');
  lines.push('');
  return lines.join('\n');
}

function formatGenAlpha(entries) {
  const lines = [genAlphaPreamble, '', 'window.genAlphaSlang = ['];
  entries.forEach((entry, index) => {
    if (index === 0) {
      lines.push('        {');
    }
    lines.push(`            "id": ${JSON.stringify(entry.id)},`);
    lines.push(`            "term": ${JSON.stringify(entry.term)},`);
    lines.push(`            "definition": ${JSON.stringify(entry.definition)}`);
    if (index === entries.length - 1) {
      lines.push('        }');
    } else {
      lines.push('        }, {');
    }
  });
  lines.push('    ];');
  lines.push('');
  return lines.join('\n');
}

function formatQuotes(categories) {
  const lines = ['window.quotesData = ['];
  categories.forEach((category, categoryIndex) => {
    lines.push('  {');
    lines.push(`    "id": ${JSON.stringify(category.id)},`);
    lines.push(`    "label": ${JSON.stringify(category.label)},`);
    lines.push('    "quotes": [');
    category.quotes.forEach((quote, quoteIndex) => {
      lines.push('      {');
      lines.push(`        "id": ${JSON.stringify(quote.id)},`);
      lines.push(`        "text": ${JSON.stringify(quote.text)},`);
      lines.push(`        "author": ${JSON.stringify(quote.author)}`);
      if (quoteIndex === category.quotes.length - 1) {
        lines.push('      }');
      } else {
        lines.push('      },');
      }
    });
    lines.push('    ]');
    if (categoryIndex === categories.length - 1) {
      lines.push('  }');
    } else {
      lines.push('  },');
    }
  });
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function normalizeQuotes(text) {
  return (text || '')
    .normalize('NFKC')
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚‛‹›]/g, "'")
    .toLowerCase();
}

function normalizeText(text) {
  return normalizeQuotes(text)
    .replace(/\s+/g, ' ')
    .replace(/\s+([?!.,;:])/g, '$1')
    .trim();
}

function tokenSignature(...parts) {
  const tokens = new Set();
  parts.forEach((part) => {
    const normalized = normalizeQuotes(part)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!normalized) {
      return;
    }
    normalized.split(' ').forEach((token) => {
      if (token) {
        tokens.add(token);
      }
    });
  });
  return Array.from(tokens).sort().join('-');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function buildJokesManifest(jokes) {
  const records = {};
  jokes.forEach((entry, index) => {
    const setupNormalized = normalizeText(entry.joke || '');
    const punchlineNormalized = normalizeText(entry.punchline || '');
    const combinedParts = [];
    if (setupNormalized) {
      combinedParts.push(setupNormalized);
    }
    if (punchlineNormalized) {
      combinedParts.push(punchlineNormalized);
    }
    const combinedNormalized = combinedParts.join('|');
    records[entry.id] = {
      hashes: {
        setup: sha256(setupNormalized),
        punchline: sha256(punchlineNormalized),
        combined: sha256(combinedNormalized),
        tokenSignature: tokenSignature(entry.joke, entry.punchline),
      },
      lengths: {
        joke: typeof entry.joke === 'string' ? entry.joke.length : 0,
        punchline: typeof entry.punchline === 'string' ? entry.punchline.length : 0,
      },
      source: {
        sequence: index + 1,
      },
      embedding: {
        status: 'pending',
        model: null,
        vectorSha256: null,
        updatedAt: null,
      },
    };
  });
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      total: jokes.length,
      hashAlgorithm: 'sha256',
      tokenSignature: 'unique-words-v1',
      fields: ['joke', 'punchline'],
    },
    records,
  };
}

function buildGenAlphaManifest(entries) {
  const records = {};
  entries.forEach((entry, index) => {
    const termNormalized = normalizeText(entry.term || '');
    const definitionNormalized = normalizeText(entry.definition || '');
    const combinedParts = [];
    if (termNormalized) {
      combinedParts.push(termNormalized);
    }
    if (definitionNormalized) {
      combinedParts.push(definitionNormalized);
    }
    const combinedNormalized = combinedParts.join('|');
    records[entry.id] = {
      hashes: {
        term: sha256(termNormalized),
        definition: sha256(definitionNormalized),
        combined: sha256(combinedNormalized),
        tokenSignature: tokenSignature(entry.term, entry.definition),
      },
      lengths: {
        term: typeof entry.term === 'string' ? entry.term.length : 0,
        definition: typeof entry.definition === 'string' ? entry.definition.length : 0,
      },
      source: {
        sequence: index + 1,
      },
      embedding: {
        status: 'pending',
        model: null,
        vectorSha256: null,
        updatedAt: null,
      },
    };
  });
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      total: entries.length,
      hashAlgorithm: 'sha256',
      tokenSignature: 'unique-words-v1',
      fields: ['term', 'definition'],
    },
    records,
  };
}

function buildQuotesManifest(categories) {
  const records = {};
  categories.forEach((category) => {
    category.quotes.forEach((quote, index) => {
      const textNormalized = normalizeText(quote.text || '');
      const authorNormalized = normalizeText(quote.author || '');
      const combinedParts = [];
      if (textNormalized) {
        combinedParts.push(textNormalized);
      }
      if (authorNormalized) {
        combinedParts.push(authorNormalized);
      }
      const combinedNormalized = combinedParts.join('|');
      records[quote.id] = {
        hashes: {
          text: sha256(textNormalized),
          author: sha256(authorNormalized),
          combined: sha256(combinedNormalized),
          tokenSignature: tokenSignature(quote.text, quote.author),
        },
        lengths: {
          text: typeof quote.text === 'string' ? quote.text.length : 0,
          author: typeof quote.author === 'string' ? quote.author.length : 0,
        },
        source: {
          categoryId: category.id,
          sequence: index + 1,
        },
        embedding: {
          status: 'pending',
          model: null,
          vectorSha256: null,
          updatedAt: null,
        },
      };
    });
  });
  const totalQuotes = Object.keys(records).length;
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      total: totalQuotes,
      categories: categories.length,
      hashAlgorithm: 'sha256',
      tokenSignature: 'unique-words-v1',
      fields: ['text', 'author'],
    },
    records,
  };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  const datasets = parseDatasets(process.argv.slice(2));

  if (datasets.has('jokes')) {
    const jokesData = loadDataset(path.join('apps', 'jokes', 'jokes.js'), 'jokes');
    const jokesWithIds = ensureJokeIds(jokesData.data);
    writeFile(jokesData.absolutePath, formatJokes(jokesWithIds));
    const jokesManifestPath = path.join(rootDir, 'data', 'jokes-manifest.json');
    writeJson(jokesManifestPath, buildJokesManifest(jokesWithIds));
    console.log(`Updated ${jokesWithIds.length} jokes and wrote ${path.relative(rootDir, jokesManifestPath)}`);
  }

  if (datasets.has('quotes')) {
    const quotesData = loadDataset(path.join('apps', 'quotes', 'quotes-data.js'), 'quotesData');
    const quotesWithIds = ensureQuoteIds(quotesData.data);
    writeFile(quotesData.absolutePath, formatQuotes(quotesWithIds));
    const quotesManifestPath = path.join(rootDir, 'data', 'quotes-manifest.json');
    writeJson(quotesManifestPath, buildQuotesManifest(quotesWithIds));
    const totalQuotes = quotesWithIds.reduce((total, category) => total + category.quotes.length, 0);
    console.log(`Updated ${totalQuotes} quotes and wrote ${path.relative(rootDir, quotesManifestPath)}`);
  }

  if (datasets.has('genalpha')) {
    const genAlphaData = loadDataset(path.join('apps', 'gen-alpha', 'slang.js'), 'genAlphaSlang');
    const genAlphaWithIds = ensureGenAlphaIds(genAlphaData.data);
    writeFile(genAlphaData.absolutePath, formatGenAlpha(genAlphaWithIds));
    const genAlphaManifestPath = path.join(rootDir, 'data', 'genalpha-manifest.json');
    writeJson(genAlphaManifestPath, buildGenAlphaManifest(genAlphaWithIds));
    console.log(`Updated ${genAlphaWithIds.length} slang terms and wrote ${path.relative(rootDir, genAlphaManifestPath)}`);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    loadDataset,
    ensureJokeIds,
    ensureQuoteIds,
    ensureGenAlphaIds,
    formatJokes,
    formatGenAlpha,
    formatQuotes,
    buildJokesManifest,
    buildGenAlphaManifest,
    buildQuotesManifest,
    jokesPreamble,
    genAlphaPreamble,
    parseDatasets,
  };
}
