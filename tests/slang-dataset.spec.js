const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const { test, expect } = require('@playwright/test');

const datasetPath = path.join(__dirname, '..', 'apps/slang/slang.js');

const loadSlang = async () => {
  const source = await fs.readFile(datasetPath, 'utf8');
  const context = { window: {} };
  const script = new vm.Script(source, { filename: 'slang.js' });
  vm.createContext(context);
  script.runInContext(context);
  return context.window.slangEntries;
};

test.describe('Slang dataset', () => {
  test('includes definitions, categories, examples, and hints for every entry', async () => {
    const slang = await loadSlang();

    expect(Array.isArray(slang)).toBeTruthy();
    expect(slang.length).toBeGreaterThan(0);

    const ids = new Set();
    const categoryIds = new Map();

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

      expect(typeof entry.category).toBe('string');
      expect(entry.category.trim().length).toBeGreaterThan(0);
      expect(typeof entry.categoryId).toBe('string');
      expect(entry.categoryId.trim().length).toBeGreaterThan(0);

      const categoryId = entry.categoryId.trim();
      const label = entry.category.trim();
      const existing = categoryIds.get(categoryId);
      if (!existing) {
        categoryIds.set(categoryId, label);
      } else {
        expect(existing).toBe(label);
      }
    }

    const normalizedCategories = Array.from(categoryIds.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    expect(normalizedCategories).toEqual([
      ['gen-alpha', 'Gen Alpha'],
      ['gen-z', 'Gen Z'],
    ]);
  });

  test('tracks updated Gen Z staples with categories', async () => {
    const slang = await loadSlang();
    const record = slang.find((entry) => entry.term === 'rizz');
    expect(record).toBeTruthy();
    expect(record.category).toBe('Gen Z');
    expect(record.hint).toBe('Use it to hype someone whose charm wins people over without trying.');
  });

  test('includes Gen Alpha standouts alongside Gen Z staples', async () => {
    const slang = await loadSlang();
    const record = slang.find((entry) => entry.term === 'fanum tax');
    expect(record).toBeTruthy();
    expect(record.category).toBe('Gen Alpha');
    expect(record.hint).toBe('Use it when you jokingly demand snacks from the squad.');
  });
});
