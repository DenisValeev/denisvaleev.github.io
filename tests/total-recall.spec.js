const { test, expect } = require('@playwright/test');

test.describe('Total Recall app', () => {
  test('loads the SparkNotes SAT vocabulary deck by default', async ({ page }) => {
    await page.goto('/apps/total-recall/');

    await expect(page.locator('[data-active-deck-name]')).toHaveText('SparkNotes SAT Vocabulary');
    await expect(page.locator('[data-counter]')).toHaveText('1 of 990');
    await expect(page.locator('[data-current-text]')).toHaveText('abase (v.) to humiliate, degrade');

    await page.locator('.editor__summary').click();
    await expect(page.locator('[data-deck-stats]')).toHaveText('1 deck · 990 cards total');
    await expect(page.locator('[data-notes-input]')).toHaveValue(/zephyr \(n\.\) a gentle breeze/);
  });
});
