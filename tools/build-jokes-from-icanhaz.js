#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jokesPreamble = '// Maintenance: run the commands in apps/jokes/AGENTS.md after editing this dataset to keep the syntax valid.';

function clean(text) {
  return text
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s([?!.,;:])/g, '$1')
    .trim();
}

function format(entries) {
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

function build() {
  const sourcePath = path.join(__dirname, '..', 'data', 'icanhazdadjokes-split.json');
  const outputPath = path.join(__dirname, '..', 'apps', 'jokes', 'jokes.js');
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const data = JSON.parse(raw);
  const entries = data
    .map((item) => ({
      joke: clean(item.setup),
      punchline: clean(item.punchline),
    }))
    .filter((item) => item.joke && item.punchline);

  const width = Math.max(4, String(entries.length).length);
  const prepared = entries.map((entry, index) => ({
    id: `j-${String(index + 1).padStart(width, '0')}`,
    joke: entry.joke,
    punchline: entry.punchline,
  }));

  fs.writeFileSync(outputPath, format(prepared));
  console.log(`Wrote ${prepared.length} jokes to ${path.relative(process.cwd(), outputPath)}`);
}

if (require.main === module) {
  build();
}
