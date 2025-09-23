const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const { test, expect } = require('@playwright/test');

const datasetPath = path.join(__dirname, '..', 'apps/jokes/jokes.js');

const loadJokes = async () => {
  const source = await fs.readFile(datasetPath, 'utf8');
  const context = { window: {} };
  const script = new vm.Script(source, { filename: 'jokes.js' });
  vm.createContext(context);
  script.runInContext(context);
  return context.window.jokes;
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

  test('includes the onboarded jokes', async () => {
    const jokes = await loadJokes();

    const required = [
      { id: 'j-0911', punchline: 'It could always hit Escape.' },
      { id: 'j-0912', punchline: 'It wanted to improve its figures.' },
      { id: 'j-0913', punchline: 'They knew how to roll with it.' },
      { id: 'j-0914', punchline: 'Its days were numbered.' },
      { id: 'j-0915', punchline: 'In case there was a table of contents.' }
    ];

    for (const expectedEntry of required) {
      const record = jokes.find((entry) => entry.id === expectedEntry.id);
      expect(record).toBeTruthy();
      expect(record.punchline).toBe(expectedEntry.punchline);
    }
  });
});

