#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function clean(text) {
  return text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

function format(entries) {
  const lines = ['window.quotesData = ['];
  entries.forEach((category, categoryIndex) => {
    lines.push('  {');
    lines.push(`    "id": ${JSON.stringify(category.id)},`);
    lines.push(`    "label": ${JSON.stringify(category.label)},`);
    lines.push('    "quotes": [');
    category.quotes.forEach((quote, quoteIndex) => {
      lines.push('      {');
      lines.push(`        "id": ${JSON.stringify(quote.id)},`);
      lines.push(`        "text": ${JSON.stringify(clean(quote.text))},`);
      lines.push(`        "author": ${JSON.stringify(clean(quote.author))}`);
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
  lines.push('');
  return lines.join('\n');
}

function build() {
  const sourcePath = path.join(__dirname, '..', 'data', 'curated-quotes.json');
  const outputPath = path.join(__dirname, '..', 'apps', 'quotes', 'quotes-data.js');
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const data = JSON.parse(raw);
  const prepared = data.map((category) => ({
    id: category.id,
    label: category.label,
    quotes: (() => {
      const cleanedQuotes = category.quotes.map((quote) => ({
        text: clean(quote.text),
        author: clean(quote.author),
      }));
      const width = Math.max(2, String(cleanedQuotes.length).length);
      return cleanedQuotes.map((quote, index) => ({
        id: `${category.id}-${String(index + 1).padStart(width, '0')}`,
        text: quote.text,
        author: quote.author,
      }));
    })(),
  }));
  fs.writeFileSync(outputPath, format(prepared));
  console.log(`Wrote ${prepared.reduce((total, category) => total + category.quotes.length, 0)} quotes across ${prepared.length} categories.`);
}

if (require.main === module) {
  build();
}
