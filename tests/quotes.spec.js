const { test, expect } = require('@playwright/test');

const deterministicRandomInitScript = () => {
  const values = [0.18, 0.6, 0.34, 0.82, 0.26];
  let index = 0;
  Math.random = () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

test.describe('Quotes app', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(deterministicRandomInitScript);
  });

  test('navigates shuffled decks and filters by category', async ({ page }) => {
    await page.goto('/apps/quotes/');

    const quote = page.locator('#quote-text');
    const author = page.locator('#quote-author');
    const meta = page.locator('#quote-meta');
    const nextButton = page.locator('#next-button');
    const prevButton = page.locator('#prev-button');
    const select = page.locator('#category-select');

    await expect(quote).not.toHaveText(/Loading quote…?/i);
    await expect(meta).toBeVisible();
    await expect(author).not.toHaveText('');
    await expect(nextButton).toBeEnabled();
    await expect(prevButton).toBeEnabled();

    const optionValues = await select.evaluate((node) =>
      Array.from(node.options).map((option) => option.value),
    );
    expect(optionValues).toContain('any');
    expect(optionValues).toContain('adventure');

    const firstQuote = (await quote.textContent())?.trim() || '';
    expect(firstQuote.length).toBeGreaterThan(0);

    await nextButton.click();
    const secondQuote = (await quote.textContent())?.trim() || '';
    expect(secondQuote.length).toBeGreaterThan(0);
    expect(secondQuote).not.toBe(firstQuote);

    await page.keyboard.press('ArrowLeft');
    await expect(quote).toHaveText(firstQuote);

    await select.selectOption('adventure');
    await expect(select).toHaveValue('adventure');
    await expect(meta).toBeVisible();

    const currentQuote = (await quote.textContent())?.trim() || '';
    const currentAuthor = (await author.textContent())?.trim() || '';
    expect(currentQuote.length).toBeGreaterThan(0);
    expect(currentAuthor.length).toBeGreaterThan(0);

    const adventureDeck = await page.evaluate(() => {
      const category = window.quotesData.find((entry) => entry.id === 'adventure');
      if (!category) {
        return { texts: [], authors: [] };
      }
      return {
        texts: category.quotes.map((entry) => entry.text),
        authors: category.quotes.map((entry) => entry.author),
      };
    });

    expect(adventureDeck.texts).toContain(currentQuote);
    expect(adventureDeck.authors).toContain(currentAuthor);

    await page.evaluate(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    });

    await page.keyboard.press('Space');
    const followUpQuote = (await quote.textContent())?.trim() || '';
    expect(adventureDeck.texts).toContain(followUpQuote);
  });
});
