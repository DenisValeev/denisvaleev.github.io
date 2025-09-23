const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadQuotesData() {
  const filePath = path.join(__dirname, '..', 'apps', 'quotes', 'quotes-data.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  new vm.Script(code, { filename: filePath }).runInContext(context);
  return context.window.quotesData;
}

test('quotes dataset exposes populated categories and entries', () => {
  const categories = loadQuotesData();
  expect(Array.isArray(categories)).toBe(true);
  expect(categories.length).toBeGreaterThan(0);

  const ids = new Set();

  for (const category of categories) {
    expect(category).toBeTruthy();
    expect(typeof category.id).toBe('string');
    expect(category.id.trim().length).toBeGreaterThan(0);
    expect(typeof category.label).toBe('string');
    expect(category.label.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(category.quotes)).toBe(true);
    expect(category.quotes.length).toBeGreaterThan(0);

    for (const quote of category.quotes) {
      expect(quote).toBeTruthy();
      expect(typeof quote.id).toBe('string');
      const trimmedId = quote.id.trim();
      expect(trimmedId.length).toBeGreaterThan(0);
      expect(ids.has(trimmedId)).toBe(false);
      ids.add(trimmedId);

      expect(typeof quote.text).toBe('string');
      expect(quote.text.trim().length).toBeGreaterThan(0);
      expect(typeof quote.author).toBe('string');
      expect(quote.author.trim().length).toBeGreaterThan(0);
    }
  }
});

test('newly onboarded quotes mirror the curated dataset', () => {
  const targetIds = [
    'growth-15',
    'growth-16',
    'curiosity-15',
    'curiosity-16',
    'kindness-15',
    'kindness-16',
    'gratitude-16',
    'gratitude-17',
    'purpose-16',
    'purpose-17',
  ];

  const categories = loadQuotesData();
  const curatedPath = path.join(__dirname, '..', 'data', 'curated-quotes.json');
  const curatedCategories = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));

  const normalize = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

  const curatedById = new Map();
  curatedCategories.forEach((category) => {
    curatedById.set(category.id, category);
  });

  const quotesById = new Map();
  categories.forEach((category) => {
    category.quotes.forEach((quote) => {
      quotesById.set(quote.id, {
        categoryId: category.id,
        text: quote.text,
        author: quote.author,
      });
    });
  });

  for (const id of targetIds) {
    expect(quotesById.has(id)).toBe(true);
    const quote = quotesById.get(id);
    const curatedCategory = curatedById.get(quote.categoryId);
    expect(curatedCategory).toBeTruthy();
    const curatedQuotes = Array.isArray(curatedCategory.quotes) ? curatedCategory.quotes : [];
    const match = curatedQuotes.find((entry) => {
      return normalize(entry.text) === normalize(quote.text) && normalize(entry.author) === normalize(quote.author);
    });
    expect(match).toBeTruthy();
  }
});
