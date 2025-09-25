const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const { test, expect } = require('@playwright/test');

const datasetPath = path.join(__dirname, '..', 'apps/jokes/jokes.js');
const internetSources = [
  path.join(__dirname, '..', 'data/icanhazdadjokes-split.json'),
  path.join(__dirname, '..', 'data/official-jokes-index.json'),
  path.join(__dirname, '..', 'data/jokes-supplemental-sources.json'),
];

const loadJokes = async () => {
  const source = await fs.readFile(datasetPath, 'utf8');
  const context = { window: {} };
  const script = new vm.Script(source, { filename: 'jokes.js' });
  vm.createContext(context);
  script.runInContext(context);
  return context.window.jokes;
};

const normalize = (text) =>
  (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s([?!.,;:])/g, '$1')
    .trim();

const buildInternetIndex = async () => {
  const seen = new Set();
  for (const relativePath of internetSources) {
    const filePath = path.join(relativePath);
    const contents = await fs.readFile(filePath, 'utf8');
    const records = JSON.parse(contents);
    records.forEach((entry) => {
      const setup = normalize(entry.setup || entry.joke || '');
      const punchline = normalize(entry.punchline || entry.answer || '');
      if (!setup && !punchline) {
        return;
      }
      seen.add(`${setup}|${punchline}`);
    });
  }
  return seen;
};

test.describe('Jokes dataset', () => {
  test('attaches jokes array to window with unique IDs', async () => {
    const jokes = await loadJokes();

    expect(Array.isArray(jokes)).toBeTruthy();
    expect(jokes.length).toBeGreaterThan(0);

    const ids = new Set();

    for (const entry of jokes) {
      expect(entry).toBeTruthy();
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.joke).toBe('string');
      expect(entry.joke.length).toBeGreaterThan(0);
      expect(typeof entry.punchline).toBe('string');
      expect(entry.punchline.length).toBeGreaterThan(0);
      expect(ids.has(entry.id)).toBeFalsy();
      ids.add(entry.id);
    }
  });

  test('only includes jokes present in the internet sources', async () => {
    const jokes = await loadJokes();
    const internetIndex = await buildInternetIndex();

    for (const entry of jokes) {
      const key = `${normalize(entry.joke)}|${normalize(entry.punchline)}`;
      expect(internetIndex.has(key)).toBeTruthy();
    }
  });
});

