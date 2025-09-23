const { test, expect } = require('@playwright/test');

test.describe('Asset Observatory dashboard', () => {
  test('renders asset metrics, charts, and inventory details', async ({ page }) => {
    await page.goto('/apps/asset-observatory/');

    const homeLink = page.locator('.home-link');
    await expect(homeLink).toHaveAttribute('href', '../../');
    await expect(homeLink).toContainText('Home');

    const summaryCards = page.locator('.summary-card');
    await expect(summaryCards).toHaveCount(4);
    await expect(summaryCards.nth(0).locator('h3')).toHaveText('Curated entries');
    await expect(summaryCards.nth(1).locator('h3')).toHaveText('Embedding vectors');
    await expect(summaryCards.nth(2).locator('h3')).toHaveText('Similarity pairs monitored');
    await expect(summaryCards.nth(3).locator('h3')).toHaveText('Asset footprint');
    await expect(summaryCards.locator('strong').first()).not.toHaveText(/^0$/);

    const datasetChart = page.locator('[data-dataset-chart] svg');
    await expect(datasetChart).toBeVisible();
    await expect(datasetChart.locator('rect')).not.toHaveCount(0);

    const providerChart = page.locator('[data-provider-chart] svg');
    await expect(providerChart).toBeVisible();
    await expect(providerChart.locator('rect')).not.toHaveCount(0);

    const tableRows = page.locator('[data-dataset-table] tr');
    await expect(tableRows).toHaveCount(3);
    const deckNames = await tableRows.locator('td.dataset-name').allTextContents();
    expect(deckNames).toEqual(['Dad Jokes', 'Quotes', 'Slang']);

    const similarityCards = page.locator('.similarity-card');
    await expect(similarityCards).toHaveCount(4);
    await expect(similarityCards.first().locator('h3')).toHaveText('Dad Jokes');

    const sourceItems = page.locator('[data-source-list] li');
    await expect(sourceItems).toHaveCount(3);
    await expect(sourceItems.first().locator('code')).toHaveText(/data\//);
  });
});
