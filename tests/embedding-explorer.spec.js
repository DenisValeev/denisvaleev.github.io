const { test, expect } = require('@playwright/test');

const SUMMARY_VALUES_SELECTOR = '[data-summary-grid] dd';

function summaryValue(locator, index) {
  return locator.nth(index);
}

test.describe('Embedding Explorer app', () => {
  test('computes insights for stored embeddings', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const summaryValues = page.locator(SUMMARY_VALUES_SELECTOR);
    const recordButton = page.locator('[data-record-list] .record-button').first();
    await recordButton.waitFor({ state: 'visible' });
    await recordButton.click();

    await expect(summaryValue(summaryValues, 0)).toHaveText('64');
    await expect(summaryValue(summaryValues, 4)).not.toHaveText('— / —');

    const positiveList = page.locator('[data-positive-list] li');
    await expect(positiveList.first()).not.toContainText('appear here');

    const negativeList = page.locator('[data-negative-list] li');
    await expect(negativeList.first()).not.toContainText('appear here');

    const tablePlaceholders = page.locator('[data-value-table] .placeholder');
    await expect(tablePlaceholders).toHaveCount(0);

    const tableFirstRow = page.locator('[data-value-table] tr').first();
    await expect(tableFirstRow.locator('td').first()).toHaveText('#1');
    await expect(page.locator('[data-record-status]')).toContainText('Showing');
    await expect(page.locator('[data-neighbor-status]')).toContainText('Top 10 matches');
  });

  test('lists the top ten neighbors for a dataset vector', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const datasetSelect = page.getByLabel('Embedding collection');
    const recordFilter = page.getByLabel('Filter by id or hash');
    await expect(recordFilter).toBeEnabled();

    const jokesOptions = await datasetSelect.locator('option').evaluateAll((options) =>
      options.map((option) => ({ value: option.value, label: option.label }))
    );

    for (const option of jokesOptions.filter((entry) => entry.value.startsWith('jokes-'))) {
      await datasetSelect.selectOption(option.value);
      await expect(recordFilter).toBeEnabled();

      await recordFilter.fill('j-0907');
      const recordButton = page
        .locator('[data-record-list] .record-button')
        .filter({ hasText: /^j-0907/ })
        .first();
      await expect(recordButton).toBeVisible();
      await recordButton.click();

      const neighborButtons = page.locator('[data-neighbor-list] .neighbor-button');
      await expect(neighborButtons).toHaveCount(10);
      await expect(neighborButtons.filter({ hasText: 'Selected vector' })).toHaveCount(0);
      await expect(page.locator('[data-neighbor-status]')).toContainText('Top 10 matches for j-0907.');

      if (option.value === 'jokes-synthetic') {
        const protectedPair = neighborButtons.filter({ hasText: 'j-0502' });
        await expect(protectedPair).toHaveCount(1);
        await expect(protectedPair.first()).toContainText('Keep both');
      }

      await recordFilter.fill('');
    }
  });
});
