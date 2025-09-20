#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function canonical(setup, punchline) {
  return `${normalize(setup)}|${normalize(punchline)}`;
}

function clean(text) {
  return text
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s([?!.,;:])/g, '$1')
    .trim();
}

function readJson(filePath) {
  const absolute = path.join(__dirname, '..', filePath);
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function writeJson(filePath, data) {
  const absolute = path.join(__dirname, '..', filePath);
  fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`);
}

function merge() {
  const basePath = path.join('data', 'icanhazdadjokes-split.json');
  const officialPath = path.join('data', 'official-jokes-index.json');
  const base = readJson(basePath);
  const official = readJson(officialPath);

  const combined = [];
  const seen = new Set();

  base.forEach((entry) => {
    const setup = clean(entry.setup || '');
    const punchline = clean(entry.punchline || '');
    const id = entry.id || '';
    if (!setup || !punchline) {
      return;
    }
    const key = canonical(setup, punchline);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    combined.push({ id, setup, punchline });
  });

  official.forEach((entry, index) => {
    const setup = clean(entry.setup || '');
    const punchline = clean(entry.punchline || '');
    if (!setup || !punchline) {
      return;
    }
    const key = canonical(setup, punchline);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const id = `official-${entry.type || 'general'}-${String(index + 1).padStart(3, '0')}`;
    combined.push({ id, setup, punchline });
  });

  writeJson(basePath, combined);
  console.log(`Merged ${combined.length} jokes into ${basePath}`);
}

if (require.main === module) {
  merge();
}
