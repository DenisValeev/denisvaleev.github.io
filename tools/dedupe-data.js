#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function normalize(text) {
  return text
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

function salientKeyword(text) {
  const words = (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter((word) => word.length > 2);
  if (!words.length) {
    return '';
  }
  const unique = Array.from(new Set(words));
  unique.sort((a, b) => b.length - a.length);
  const candidate = unique.find((word) => word.length >= 6);
  return (candidate || unique[0]).toLowerCase();
}

function levenshtein(a, b) {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }
  const previous = new Array(b.length + 1);
  const current = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i += 1) {
    previous[i] = i;
  }
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    const charA = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j += 1) {
      const charB = b.charCodeAt(j - 1);
      const cost = charA === charB ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }
  return current[b.length];
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

function dedupe(entries, options) {
  const { canonicalFn, describe, keywordSource } = options;
  const canonicalSet = new Map();
  const keywordMap = new Map();
  const duplicates = [];
  const cleaned = [];

  entries.forEach((entry, index) => {
    const canonical = canonicalFn(entry);
    const sourceText = keywordSource(entry);
    const keyword = salientKeyword(sourceText);
    if (!canonical) {
      return;
    }
    if (canonicalSet.has(canonical)) {
      duplicates.push({
        index,
        reason: 'exact',
        keyword,
        against: canonicalSet.get(canonical).index,
      });
      return;
    }

    let isDuplicate = false;
    const related = keywordMap.get(keyword) || [];
    for (const candidate of related) {
      const threshold = Math.max(2, Math.floor(Math.min(canonical.length, candidate.canonical.length) * 0.08));
      const distance = levenshtein(canonical, candidate.canonical);
      if (distance <= threshold) {
        duplicates.push({
          index,
          reason: 'similar',
          keyword,
          against: candidate.index,
          distance,
        });
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      return;
    }

    const record = { canonical, index: cleaned.length };
    if (!keywordMap.has(keyword)) {
      keywordMap.set(keyword, []);
    }
    keywordMap.get(keyword).push(record);
    canonicalSet.set(canonical, record);
    cleaned.push(entry);
  });

  if (duplicates.length) {
    console.log(`Removed ${duplicates.length} duplicate ${describe}.`);
    duplicates.slice(0, 5).forEach((dup) => {
      console.log(`  - entry ${dup.index} matched ${dup.reason} duplicate (keyword: ${dup.keyword || 'n/a'})`);
    });
    if (duplicates.length > 5) {
      console.log(`  … ${duplicates.length - 5} more duplicates`);
    }
  } else {
    console.log(`No duplicate ${describe} detected.`);
  }

  return cleaned;
}

function run() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');

  const jokesPath = path.join(__dirname, '..', 'apps', 'jokes', 'jokes.js');
  const quotesPath = path.join(__dirname, '..', 'apps', 'quotes', 'quotes-data.js');

  const jokes = loadWindowData(jokesPath, 'jokes');
  const quotes = loadWindowData(quotesPath, 'quotesData');

  const cleanedJokes = dedupe(jokes, {
    canonicalFn: canonicalJoke,
    describe: 'jokes',
    keywordSource: (entry) => `${entry.joke || ''} ${entry.punchline || ''}`,
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
    canonicalFn: canonicalQuote,
    describe: 'quotes',
    keywordSource: (entry) => `${entry.text || ''} ${entry.author || ''}`,
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

    const orderedCategories = quotes.map((category) => categoryMap.get(category.id)).filter(Boolean);

    fs.writeFileSync(quotesPath, formatQuotes(orderedCategories));
    console.log('Datasets updated without duplicates.');
  }
}

if (require.main === module) {
  run();
}
