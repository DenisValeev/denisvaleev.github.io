const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const { test, expect } = require('@playwright/test');

const datasetPath = path.join(__dirname, '..', 'apps/gen-alpha/slang.js');

const loadSlang = async () => {
  const source = await fs.readFile(datasetPath, 'utf8');
  const context = { window: {} };
  const script = new vm.Script(source, { filename: 'slang.js' });
  vm.createContext(context);
  script.runInContext(context);
  return context.window.genAlphaSlang;
};

test.describe('Gen Alpha slang dataset', () => {
  test('includes definitions, example sentences, and usage hints for every entry', async () => {
    const slang = await loadSlang();

    expect(Array.isArray(slang)).toBeTruthy();
    expect(slang.length).toBeGreaterThan(0);

    const ids = new Set();

    for (const entry of slang) {
      expect(entry).toBeTruthy();
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(ids.has(entry.id)).toBeFalsy();
      ids.add(entry.id);

      expect(typeof entry.term).toBe('string');
      expect(entry.term.trim().length).toBeGreaterThan(0);

      expect(typeof entry.definition).toBe('string');
      expect(entry.definition.trim().length).toBeGreaterThan(0);

      expect(typeof entry.example).toBe('string');
      const trimmedExample = entry.example.trim();
      expect(trimmedExample.length).toBeGreaterThan(0);
      const trailingChar = trimmedExample.replace(/["']+$/gu, '').slice(-1);
      expect(['.', '!', '?'].includes(trailingChar)).toBeTruthy();
      expect(trimmedExample).not.toBe(entry.definition.trim());
      expect(trimmedExample.includes('Use it')).toBeFalsy();

      expect(typeof entry.hint).toBe('string');
      const trimmedHint = entry.hint.trim();
      expect(trimmedHint.length).toBeGreaterThan(0);
      expect(trimmedHint).toMatch(/^Use it/);
    }
  });

  test('keeps the new usage example and hint for cookin’', async () => {
    const slang = await loadSlang();

    const record = slang.find((entry) => entry.id === 'ga-0044');
    expect(record).toBeTruthy();
    expect(record.example).toBe("Our coder has been cookin’ all night on that new feature.");
    expect(record.hint).toBe('Use it when someone is actively producing great results.');
  });
});
