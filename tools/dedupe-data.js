#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalJoke(entry) {
  const setup = normalize(entry.joke || '');
  const punchline = normalize(entry.punchline || '');
  return `${setup}|${punchline}`.trim();
}

function canonicalQuote(entry) {
  const text = normalize(entry.text || '');
  const author = normalize(entry.author || '');
  return `${text}|${author}`.trim();
}

function levenshtein(a, b, maxDistance = Number.POSITIVE_INFINITY) {
  if (a === b) {
    return 0;
  }

  const aLength = a.length;
  const bLength = b.length;

  if (!aLength) {
    return bLength;
  }
  if (!bLength) {
    return aLength;
  }

  if (Number.isFinite(maxDistance) && Math.abs(aLength - bLength) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = new Array(bLength + 1);
  const current = new Array(bLength + 1);

  for (let i = 0; i <= bLength; i += 1) {
    previous[i] = i;
  }

  for (let i = 1; i <= aLength; i += 1) {
    current[0] = i;
    const charA = a.charCodeAt(i - 1);
    let rowMin = current[0];

    for (let j = 1; j <= bLength; j += 1) {
      const charB = b.charCodeAt(j - 1);
      const cost = charA === charB ? 0 : 1;
      const deletion = previous[j] + 1;
      const insertion = current[j - 1] + 1;
      const substitution = previous[j - 1] + cost;
      const value = Math.min(deletion, insertion, substitution);
      current[j] = value;
      if (value < rowMin) {
        rowMin = value;
      }
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    for (let j = 0; j <= bLength; j += 1) {
      previous[j] = current[j];
    }
  }

  return current[bLength];
}

function createTokenSet(baseText, fragments = [], options = {}) {
  const { minWordLength = 4, maxTokens = 12 } = options;
  const tokens = new Set();

  const words = (baseText.match(/[a-z0-9']+/g) || []);
  const uniqueWords = [];
  words.forEach((word) => {
    if (!uniqueWords.includes(word)) {
      uniqueWords.push(word);
    }
  });

  uniqueWords
    .filter((word) => word.length >= minWordLength)
    .sort((a, b) => b.length - a.length)
    .slice(0, maxTokens)
    .forEach((word) => tokens.add(word));

  fragments.forEach((fragment) => {
    if (!fragment) {
      return;
    }
    const normalized = normalize(fragment).slice(0, 12);
    if (normalized.length >= 4) {
      tokens.add(normalized);
    }
  });

  return tokens;
}

function hasTokenOverlap(tokensA, tokensB) {
  if (!tokensA.size || !tokensB.size) {
    return true;
  }
  const [smaller, larger] = tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  for (const token of smaller) {
    if (larger.has(token)) {
      return true;
    }
  }
  return false;
}

function createJokeMeta(entry, index) {
  const canonical = canonicalJoke(entry);
  if (!canonical) {
    return null;
  }

  const setupNormalized = normalize(entry.joke || '');
  const punchNormalized = normalize(entry.punchline || '');
  const setupPreview = setupNormalized.slice(0, 96);
  const punchPreview = punchNormalized.slice(0, 32);
  const comparison = `${setupPreview}|${punchPreview}`.trim();
  const tokenSource = `${setupNormalized} ${punchNormalized}`.trim();
  const tokens = createTokenSet(tokenSource, [
    punchPreview.slice(0, 24),
    punchPreview.slice(-24),
    setupPreview.slice(0, 24),
    setupPreview.slice(-24),
  ]);

  return {
    canonical,
    comparison,
    tokens,
    punchPreview,
    setupPreview,
    originalIndex: index,
  };
}

function shouldCompareJokes(a, b) {
  if (hasTokenOverlap(a.tokens, b.tokens)) {
    return true;
  }

  if (a.punchPreview && b.punchPreview) {
    const previewLength = Math.min(8, a.punchPreview.length, b.punchPreview.length);
    if (previewLength >= 4 && a.punchPreview.slice(0, previewLength) === b.punchPreview.slice(0, previewLength)) {
      return true;
    }
  }

  if (a.setupPreview && b.setupPreview) {
    const previewLength = Math.min(10, a.setupPreview.length, b.setupPreview.length);
    if (previewLength >= 6 && a.setupPreview.slice(0, previewLength) === b.setupPreview.slice(0, previewLength)) {
      return true;
    }
  }

  return false;
}

function createQuoteMeta(entry, index) {
  const canonical = canonicalQuote(entry);
  if (!canonical) {
    return null;
  }

  const textNormalized = normalize(entry.text || '');
  const authorNormalized = normalize(entry.author || '');
  const textPreview = textNormalized.slice(0, 120);
  const authorPreview = authorNormalized.slice(0, 40);
  const comparison = `${textPreview}|${authorPreview}`.trim();
  const tokenSource = `${textNormalized} ${authorNormalized}`.trim();
  const tokens = createTokenSet(tokenSource, [
    textPreview.slice(0, 36),
    textPreview.slice(-36),
    authorPreview,
  ]);

  return {
    canonical,
    comparison,
    tokens,
    authorPreview,
    textPreview,
    originalIndex: index,
  };
}

function shouldCompareQuotes(a, b) {
  if (hasTokenOverlap(a.tokens, b.tokens)) {
    return true;
  }

  if (a.authorPreview && b.authorPreview && a.authorPreview === b.authorPreview) {
    return true;
  }

  if (a.textPreview && b.textPreview) {
    const previewLength = Math.min(12, a.textPreview.length, b.textPreview.length);
    if (previewLength >= 6 && a.textPreview.slice(0, previewLength) === b.textPreview.slice(0, previewLength)) {
      return true;
    }
  }

  return false;
}

function distanceThreshold(metaA, metaB) {
  if (!metaA.comparison || !metaB.comparison) {
    return -1;
  }

  const minLength = Math.min(metaA.comparison.length, metaB.comparison.length);
  const maxLength = Math.max(metaA.comparison.length, metaB.comparison.length);
  const lengthDelta = Math.abs(metaA.comparison.length - metaB.comparison.length);

  if (lengthDelta > Math.max(6, Math.floor(maxLength * 0.35))) {
    return -1;
  }

  return Math.max(2, Math.floor(minLength * 0.08));
}

function logDuplicates(describe, duplicates, metas) {
  if (!duplicates.length) {
    console.log(`No duplicate ${describe} detected.`);
    return;
  }

  let exactCount = 0;
  duplicates.forEach((dup) => {
    if (dup.reason === 'exact') {
      exactCount += 1;
    }
  });
  const similarCount = duplicates.length - exactCount;
  const parts = [];
  if (exactCount) {
    parts.push(`${exactCount} exact`);
  }
  if (similarCount) {
    parts.push(`${similarCount} similar`);
  }
  const breakdown = parts.length ? ` (${parts.join(', ')})` : '';

  console.log(`Removed ${duplicates.length} duplicate ${describe}${breakdown}.`);

  duplicates.slice(0, 5).forEach((dup) => {
    const previewMeta = metas[dup.index];
    const preview = previewMeta && previewMeta.comparison ? previewMeta.comparison.slice(0, 80) : '';
    const distanceInfo = dup.reason === 'similar' ? ` (distance: ${dup.distance})` : '';
    console.log(`  - entry ${dup.index} matched ${dup.reason} duplicate of entry ${dup.against}${distanceInfo}`);
    if (preview) {
      console.log(`      preview: ${preview}`);
    }
  });

  if (duplicates.length > 5) {
    console.log(`  … ${duplicates.length - 5} more duplicates`);
  }
}

function dedupe(entries, options) {
  const {
    describe,
    createMeta,
    shouldCompare,
    distanceThresholdFn,
    fallbackWindow = 0,
  } = options;

  const metas = entries.map((entry, index) => createMeta(entry, index));
  const tokenIndex = new Map();

  metas.forEach((meta, index) => {
    if (!meta) {
      return;
    }
    meta.tokens.forEach((token) => {
      if (!tokenIndex.has(token)) {
        tokenIndex.set(token, []);
      }
      tokenIndex.get(token).push(index);
    });
  });

  const canonicalMap = new Map();
  const removed = new Set();
  const duplicates = [];
  const cleaned = [];

  for (let i = 0; i < metas.length; i += 1) {
    const meta = metas[i];
    if (!meta) {
      continue;
    }
    if (removed.has(i)) {
      continue;
    }

    const existingIndex = canonicalMap.get(meta.canonical);
    if (existingIndex !== undefined) {
      const originalMeta = metas[existingIndex];
      duplicates.push({
        index: meta.originalIndex,
        reason: 'exact',
        against: originalMeta ? originalMeta.originalIndex : existingIndex,
        distance: 0,
      });
      removed.add(i);
      continue;
    }

    canonicalMap.set(meta.canonical, i);
    cleaned.push(entries[i]);

    const candidateIndices = new Set();
    meta.tokens.forEach((token) => {
      const indices = tokenIndex.get(token);
      if (!indices) {
        return;
      }
      indices.forEach((candidateIndex) => {
        if (candidateIndex > i && !removed.has(candidateIndex)) {
          candidateIndices.add(candidateIndex);
        }
      });
    });

    if (!candidateIndices.size && fallbackWindow > 0) {
      const upperBound = Math.min(metas.length, i + 1 + fallbackWindow);
      for (let j = i + 1; j < upperBound; j += 1) {
        if (!removed.has(j) && metas[j]) {
          candidateIndices.add(j);
        }
      }
    }

    candidateIndices.forEach((candidateIndex) => {
      if (removed.has(candidateIndex)) {
        return;
      }
      const candidate = metas[candidateIndex];
      if (!candidate) {
        return;
      }

      if (candidate.canonical === meta.canonical) {
        duplicates.push({
          index: candidate.originalIndex,
          reason: 'exact',
          against: meta.originalIndex,
          distance: 0,
        });
        removed.add(candidateIndex);
        return;
      }

      if (!shouldCompare(meta, candidate)) {
        return;
      }

      const threshold = distanceThresholdFn(meta, candidate);
      if (threshold < 0) {
        return;
      }

      const distance = levenshtein(meta.comparison, candidate.comparison, threshold);
      if (distance <= threshold) {
        duplicates.push({
          index: candidate.originalIndex,
          reason: 'similar',
          against: meta.originalIndex,
          distance,
        });
        removed.add(candidateIndex);
      }
    });
  }

  logDuplicates(describe, duplicates, metas);
  return cleaned;
}

function loadWindowData(filePath, property) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  const script = new vm.Script(`${code}; window.${property};`);
  const result = script.runInContext(context);
  return Array.isArray(result) ? result : [];
}

function formatJokes(entries) {
  const lines = ['window.jokes = ['];
  entries.forEach((entry, index) => {
    if (index === 0) {
      lines.push('        {');
    }
    lines.push(`            "joke": ${JSON.stringify(entry.joke)},`);
    lines.push(`            "punchline": ${JSON.stringify(entry.punchline || '')}`);
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

function formatQuotes(entries) {
  const lines = ['window.quotesData = ['];
  entries.forEach((category, categoryIndex) => {
    lines.push('  {');
    lines.push(`    "id": ${JSON.stringify(category.id)},`);
    lines.push(`    "label": ${JSON.stringify(category.label)},`);
    lines.push('    "quotes": [');
    category.quotes.forEach((quote, quoteIndex) => {
      lines.push('      {');
      lines.push(`        "text": ${JSON.stringify(quote.text)},`);
      lines.push(`        "author": ${JSON.stringify(quote.author)}`);
      if (quoteIndex === category.quotes.length - 1) {
        lines.push('      }');
      } else {
        lines.push('      },');
      }
    });
    lines.push('    ]');
    if (categoryIndex === entries.length - 1) {
      lines.push('  }');
    } else {
      lines.push('  },');
    }
  });
  lines.push('];');
  return lines.join('\n');
}

function run() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');

  const jokesPath = path.join(__dirname, '..', 'apps', 'jokes', 'jokes.js');
  const quotesPath = path.join(__dirname, '..', 'apps', 'quotes', 'quotes-data.js');

  const jokes = loadWindowData(jokesPath, 'jokes');
  const quotes = loadWindowData(quotesPath, 'quotesData');

  const cleanedJokes = dedupe(jokes, {
    describe: 'jokes',
    createMeta: createJokeMeta,
    shouldCompare: shouldCompareJokes,
    distanceThresholdFn: distanceThreshold,
    fallbackWindow: 12,
  });

  const flatQuotes = [];
  quotes.forEach((category) => {
    (category.quotes || []).forEach((quote) => {
      flatQuotes.push({
        categoryId: category.id,
        text: quote.text,
        author: quote.author,
      });
    });
  });

  const cleanedQuotes = dedupe(flatQuotes, {
    describe: 'quotes',
    createMeta: createQuoteMeta,
    shouldCompare: shouldCompareQuotes,
    distanceThresholdFn: distanceThreshold,
    fallbackWindow: 8,
  });

  if (write) {
    const jokesForWrite = cleanedJokes.map((entry) => ({
      joke: entry.joke,
      punchline: entry.punchline,
    }));
    fs.writeFileSync(jokesPath, formatJokes(jokesForWrite));

    const categoryMap = new Map();
    quotes.forEach((category) => {
      categoryMap.set(category.id, { id: category.id, label: category.label, quotes: [] });
    });

    cleanedQuotes.forEach((entry) => {
      const category = categoryMap.get(entry.categoryId);
      if (category) {
        category.quotes.push({ text: entry.text, author: entry.author });
      }
    });

    const orderedCategories = quotes
      .map((category) => categoryMap.get(category.id))
      .filter(Boolean);

    fs.writeFileSync(quotesPath, formatQuotes(orderedCategories));
    console.log('Datasets updated without duplicates.');
  }
}

if (require.main === module) {
  run();
}
