const { test, expect } = require('@playwright/test');

const SAMPLE_BUTTON_SELECTOR = '[data-sample-list] .sample-button';
const SUMMARY_VALUES_SELECTOR = '[data-summary-grid] dd';

function summaryValue(locator, index) {
  return locator.nth(index);
}

test.describe('Embedding Explorer app', () => {
  test('loads samples and recomputes vector insights', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const sampleButtons = page.locator(SAMPLE_BUTTON_SELECTOR);
    await expect(sampleButtons).toHaveCount(3);

    const sampleMeta = page.locator('[data-sample-meta]');
    await expect(sampleMeta).toContainText('A sunny stroll through a park lined with trees and warm light.');

    const summaryValues = page.locator(SUMMARY_VALUES_SELECTOR);
    await expect(summaryValue(summaryValues, 0)).toHaveText('64');
    await expect(summaryValue(summaryValues, 1)).toHaveText('4.105');
    await expect(summaryValue(summaryValues, 2)).toHaveText('0.100');

    await page.getByRole('button', { name: /Neon-lit crosswalk/ }).click();
    await expect(sampleMeta).toContainText('Busy urban crossing at night with bright signage and a fast tempo.');

    const input = page.locator('[data-embedding-input]');
    await input.fill('1, -2, 3');
    await page.getByRole('button', { name: 'Update visualizations' }).click();

    await expect(summaryValue(summaryValues, 0)).toHaveText('3');
    await expect(summaryValue(summaryValues, 1)).toHaveText('3.742');
    await expect(summaryValue(summaryValues, 2)).toHaveText('0.667');
    await expect(summaryValue(summaryValues, 4)).toHaveText('-2.000 / 3.000');
    await expect(summaryValue(summaryValues, 5)).toHaveText('0%');

    const positiveList = page.locator('[data-positive-list] li');
    await expect(positiveList.first()).toHaveText('#33.000');
    await expect(positiveList.nth(1)).toHaveText('#11.000');

    const negativeList = page.locator('[data-negative-list] li');
    await expect(negativeList.first()).toHaveText('#2-2.000');

    const firstRow = page.locator('[data-value-table] tr').first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('#1');
    await expect(firstRow.locator('td').nth(1).locator('span')).toHaveText('1.000');
    await expect(firstRow.locator('td').nth(2).locator('span')).toHaveText('0.333');
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
      await expect(neighborButtons).toHaveCount(11);
      await expect(neighborButtons.first()).toContainText('Selected vector');
      await expect(page.locator('[data-neighbor-status]')).toContainText('Selected vector and top 10 matches for j-0907.');

      await recordFilter.fill('');
    }
  });
});
