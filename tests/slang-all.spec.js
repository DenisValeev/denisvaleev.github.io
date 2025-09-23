const { test, expect } = require('@playwright/test');

test.describe('All slang view', () => {
  test('filters by category and search term', async ({ page }) => {
    await page.goto('/apps/slang/all-slang.html');

    const categorySelect = page.locator('[data-category-select]');
    const termCells = page.locator('th.term-cell');

    await expect(categorySelect).toBeVisible();
    await expect(termCells.first()).not.toHaveText(/Loading slang…?/i);

    const initialBadgeTexts = await page.locator('.category-badge').allTextContents();
    expect(initialBadgeTexts.length).toBeGreaterThan(0);

    const categoryOption = await categorySelect.evaluate((select) => {
      const option = Array.from(select.options).find((item) => item.value !== 'all');
      return option ? { value: option.value, label: option.textContent || '' } : null;
    });
    expect(categoryOption).toBeTruthy();
    expect(['Gen Alpha', 'Gen Z']).toContain(categoryOption.label.trim());

    await categorySelect.selectOption(categoryOption.value);
    await expect(categorySelect).toHaveValue(categoryOption.value);

    await expect.poll(async () => {
      const texts = await page.locator('.category-badge').allTextContents();
      return Array.from(new Set(texts.map((text) => text.trim())));
    }).toEqual([categoryOption.label.trim()]);

    const filterInput = page.locator('[data-filter-input]');
    await filterInput.fill('zzzwillnotmatch');
    await expect(page.locator('tbody td')).toContainText('No slang in this category matches');

    await filterInput.fill('');
    await expect(termCells.first()).toBeVisible();
  });
});
