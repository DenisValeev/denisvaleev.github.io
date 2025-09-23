const { test, expect } = require('@playwright/test');

test.describe('All quotes view', () => {
  test('supports category filtering alongside search', async ({ page }) => {
    await page.goto('/apps/quotes/all-quotes.html');

    const categorySelect = page.locator('[data-category-select]');
    const quoteRows = page.locator('tbody tr.quote-row');

    await expect(categorySelect).toBeVisible();
    await expect(quoteRows.first()).toBeVisible();

    const categoryOption = await categorySelect.evaluate((select) => {
      const option = Array.from(select.options).find((item) => item.value !== 'all');
      return option ? { value: option.value, label: option.textContent || '' } : null;
    });
    expect(categoryOption).toBeTruthy();

    await categorySelect.selectOption(categoryOption.value);
    await expect(categorySelect).toHaveValue(categoryOption.value);

    await expect.poll(async () => {
      const texts = await page.locator('.meta-category').allTextContents();
      return Array.from(new Set(texts.map((text) => text.trim())));
    }).toEqual([categoryOption.label.trim()]);

    const filterInput = page.locator('[data-filter-input]');
    await filterInput.fill('nope nope nope');
    await expect(page.locator('tbody td')).toContainText('No quotes in this category match');

    await filterInput.fill('');
    await expect(quoteRows.first()).toBeVisible();
  });
});
