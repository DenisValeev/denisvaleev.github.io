#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function clean(text) {
  return text
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s([?!.,;:])/g, '$1')
    .trim();
}

function format(entries) {
  const lines = ['window.jokes = ['];
  entries.forEach((entry, index) => {
    if (index === 0) {
      lines.push('        {');
    }
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

  fs.writeFileSync(outputPath, format(entries));
  console.log(`Wrote ${entries.length} jokes to ${path.relative(process.cwd(), outputPath)}`);
}

if (require.main === module) {
  build();
}
