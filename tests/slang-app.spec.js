const { test, expect } = require('@playwright/test');

const deterministicRandomInitScript = () => {
  const values = [0.14, 0.68, 0.32, 0.84, 0.26];
  let index = 0;
  Math.random = () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

test.describe('Slang app', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(deterministicRandomInitScript);
  });

  test('supports category filtering, shuffling, and reveals with examples', async ({ page }) => {
    await page.goto('/apps/slang/');

    const term = page.locator('#slang-term');
    const category = page.locator('#slang-category');
    const meaning = page.locator('#slang-meaning');
    const exampleWrapper = page.locator('#slang-example-wrapper');
    const example = page.locator('#slang-example');
    const hintWrapper = page.locator('#slang-hint-wrapper');
    const hint = page.locator('#slang-hint');
    const revealButton = page.locator('#reveal-button');
    const nextButton = page.locator('#next-button');
    const prevButton = page.locator('#prev-button');
    const categorySelect = page.locator('#category-select');

    await expect(categorySelect).toHaveValue('all');
    const categoryOptions = await categorySelect.evaluate((select) =>
      Array.from(select.options).map((option) => ({
        value: option.value,
        label: ((option.textContent || '')).trim(),
      }))
    );
    expect(categoryOptions).toEqual([
      { value: 'all', label: 'All categories' },
      { value: 'gen-alpha', label: 'Gen Alpha' },
      { value: 'gen-z', label: 'Gen Z' },
    ]);
    await expect(category).not.toHaveText(/Loading/i);
    await expect(term).not.toHaveText(/Loading slang…?/i);
    await expect(meaning).not.toHaveClass(/is-visible/);
    await expect(meaning).toHaveAttribute('aria-hidden', 'true');
    await expect(exampleWrapper).not.toHaveClass(/is-visible/);
    await expect(exampleWrapper).toHaveAttribute('aria-hidden', 'true');
    await expect(hintWrapper).toHaveAttribute('aria-hidden', 'true');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'false');
    await expect(revealButton).toBeEnabled();
    await expect(nextButton).toBeEnabled();
    await expect(prevButton).toBeEnabled();

    const firstTerm = ((await term.textContent()) || '').trim();
    const firstCategory = ((await category.textContent()) || '').trim();
    expect(firstTerm.length).toBeGreaterThan(0);
    expect(firstCategory.length).toBeGreaterThan(0);

    await revealButton.click();

    await expect(meaning).toHaveClass(/is-visible/);
    await expect(meaning).toHaveAttribute('aria-hidden', 'false');
    const definitionText = ((await meaning.textContent()) || '').trim();
    expect(definitionText.length).toBeGreaterThan(0);

    await expect(exampleWrapper).toHaveClass(/is-visible/);
    await expect(exampleWrapper).toHaveAttribute('aria-hidden', 'false');
    const exampleText = ((await example.textContent()) || '').trim();
    expect(exampleText.length).toBeGreaterThan(0);
    await expect(hintWrapper).toHaveAttribute('aria-hidden', 'false');
    const hintText = ((await hint.textContent()) || '').trim();
    expect(hintText.length).toBeGreaterThan(0);

    await nextButton.click();

    await expect(meaning).not.toHaveClass(/is-visible/);
    await expect(meaning).toHaveAttribute('aria-hidden', 'true');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'false');
    await expect(exampleWrapper).not.toHaveClass(/is-visible/);
    await expect(hintWrapper).toHaveAttribute('aria-hidden', 'true');

    const secondTerm = ((await term.textContent()) || '').trim();
    expect(secondTerm.length).toBeGreaterThan(0);
    expect(secondTerm).not.toBe(firstTerm);

    const categoryOption = await categorySelect.evaluate((select) => {
      const option = Array.from(select.options).find((item) => item.value !== 'all');
      return option ? { value: option.value, label: option.textContent || '' } : null;
    });
    expect(categoryOption).toBeTruthy();

    await categorySelect.selectOption(categoryOption.value);
    await expect(categorySelect).toHaveValue(categoryOption.value);

    const filteredCategory = ((await category.textContent()) || '').trim();
    expect(filteredCategory).toBe(categoryOption.label.trim());

    await prevButton.click();
    await page.keyboard.press('ArrowRight');

    await page.evaluate(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    });

    await page.keyboard.press('Space');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'true');
    await expect(meaning).toHaveClass(/is-visible/);
    await expect(exampleWrapper).toHaveClass(/is-visible/);
  });
});
