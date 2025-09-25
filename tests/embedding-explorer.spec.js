const { test, expect } = require('@playwright/test');

test.describe('Embedding Explorer app', () => {
  test('renders dataset metadata and comparison panes for stored embeddings', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const leftDatasetSelect = page.locator('[data-left-dataset-select]');
    await leftDatasetSelect.locator('option').first().waitFor({ state: 'attached' });
    await leftDatasetSelect.selectOption('jokes-synthetic');

    const leftRecordStatus = page.locator('[data-left-record-status]');
    await expect(leftRecordStatus).toContainText('Showing');

    const leftDatasetInfo = page.locator('[data-left-dataset-info]');
    await expect(leftDatasetInfo).toContainText('Records');

    const recordButton = page
      .locator('[data-left-record-list] .record-button')
      .locator(':visible')
      .first();
    await recordButton.waitFor({ state: 'visible' });
    await recordButton.click();

    await expect(page.locator('[data-left-record-status]')).toContainText('Showing');
    await expect(page.locator('[data-primary-meta]')).not.toContainText('Select a vector to inspect its details.');
    await expect(page.locator('[data-primary-text]')).not.toContainText('Choose a vector to load its source text.');

    const primaryVectorId = (await page.locator('[data-primary-meta] dd').first().textContent())?.trim() || '';

    if (primaryVectorId) {
      await expect(page.locator('[data-primary-caption]')).toContainText(primaryVectorId);
    }

    await expect(page.locator('[data-secondary-caption]')).toContainText('Comparing');
  });

  test('filters dataset vectors and populates comparison panes', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const datasetSelect = page.locator('[data-left-dataset-select]');
    const recordFilter = page.locator('[data-left-record-filter]');
    const primaryVectorId = page.locator('[data-primary-meta] dd').first();
    const primaryCaption = page.locator('[data-primary-caption]');
    await expect(recordFilter).toBeEnabled();

    const jokesOptions = await datasetSelect.locator('option').evaluateAll((options) =>
      options.map((option) => ({ value: option.value, label: option.label }))
    );

    for (const option of jokesOptions.filter((entry) => entry.value.startsWith('jokes-'))) {
      await datasetSelect.selectOption(option.value);
      await expect(recordFilter).toBeEnabled();

      await recordFilter.fill('j-0907');
      const recordButton = page
        .locator('[data-left-record-list] .record-button')
        .filter({ hasText: /^j-0907/ })
        .first();
      await expect(recordButton).toBeVisible();
      await recordButton.click();

      await expect(page.locator('[data-left-record-status]')).toContainText('Showing 1');
      await expect(primaryVectorId).toHaveText('j-0907');
      await expect(primaryCaption).toContainText('j-0907');

      if (option.value === 'jokes-synthetic') {
        await expect(primaryCaption).toContainText('Binary fingerprint');
      }

      await recordFilter.fill('');
    }
  });

  test('loads curated cosine pairs including comparison text', async ({ page }) => {
    await page.goto('/apps/embedding-explorer/');

    const pairSelect = page.locator('[data-pair-select]');
    await pairSelect.locator('option').first().waitFor({ state: 'attached' });
    await expect(pairSelect).toBeEnabled();

    const optionValues = await pairSelect.locator('option:not([disabled])').evaluateAll((options) =>
      options.map((option) => option.value)
    );

    const targetValue = optionValues.find((value) => value !== '');
    expect(targetValue, 'expected at least one selectable pair').toBeDefined();

    if (targetValue) {
      await pairSelect.selectOption(targetValue);
    }

    const primaryText = page.locator('[data-primary-text]');
    const secondaryText = page.locator('[data-secondary-text]');

    await expect(primaryText.locator('.text-record__heading')).toBeVisible();
    await expect(secondaryText.locator('.text-record__heading')).toBeVisible();

    await expect(secondaryText).not.toContainText('Choose a right-side vector to view its source text.');
  });
});
