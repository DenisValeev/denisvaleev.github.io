const { test, expect } = require('@playwright/test');

const parseLocaleNumber = (text) => {
  if (!text) {
    return NaN;
  }
  const normalized = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
  return Number.parseFloat(normalized);
};

test.describe('Cosine Similarity Lab', () => {
  test('loads similarity data with Levenshtein metrics and range controls', async ({ page }) => {
    await page.goto('/apps/similarity-report/');

    await page.waitForSelector('[data-results-body] tr:not(.empty-row)');

    const minSlider = page.locator('[data-min-similarity]');
    const maxSlider = page.locator('[data-max-similarity]');
    const minLabel = page.locator('[data-threshold-min-label]');
    const maxLabel = page.locator('[data-threshold-max-label]');
    const minDisplay = page.locator('[data-threshold-min-display]');
    const maxDisplay = page.locator('[data-threshold-max-display]');

    const minAttr = await minSlider.getAttribute('min');
    const minBound = Number.parseFloat(minAttr || '0');
    expect(minBound).toBeGreaterThanOrEqual(0.5);
    expect(minBound).toBeLessThanOrEqual(0.95);

    const maxAttr = await maxSlider.getAttribute('max');
    const maxBound = Number.parseFloat(maxAttr || '1');
    expect(maxBound).toBeGreaterThanOrEqual(minBound);
    expect(maxBound).toBeLessThanOrEqual(1);

    const minSliderValue = Number.parseFloat(await minSlider.evaluate((node) => node.value));
    const maxSliderValue = Number.parseFloat(await maxSlider.evaluate((node) => node.value));

    const minLabelValue = parseLocaleNumber(await minLabel.textContent());
    const maxLabelValue = parseLocaleNumber(await maxLabel.textContent());
    const minDisplayValue = parseLocaleNumber(await minDisplay.textContent());
    const maxDisplayValue = parseLocaleNumber(await maxDisplay.textContent());

    expect(minLabelValue).toBeCloseTo(minSliderValue, 4);
    expect(minDisplayValue).toBeCloseTo(minSliderValue, 4);
    expect(maxLabelValue).toBeCloseTo(maxSliderValue, 3);
    expect(maxDisplayValue).toBeCloseTo(maxSliderValue, 3);
    expect(maxSliderValue).toBeGreaterThanOrEqual(minSliderValue);

    await expect(page.locator('[data-dataset]')).toHaveCount(3);

    const pairMetric = page.locator('.pair-metric', { hasText: 'Levenshtein' }).first();
    await expect(pairMetric).toBeVisible();

    const crossDeckButton = page.locator('[data-dataset="cross-deck"]');
    await crossDeckButton.click();
    await expect(page.locator('body')).toHaveAttribute('data-active-dataset', 'cross-deck');
    await expect(page.locator('[data-search]')).toHaveAttribute('placeholder', /humor-08/);

    const crossFirstRow = page.locator('[data-results-body] tr').first();
    await expect(crossFirstRow.locator('.id-badge').first()).toHaveText(/[a-z-]+-\d+/i);
    await crossFirstRow.click();

    const detailMetric = page.locator('[data-detail-levenshtein]');
    await expect(detailMetric).toContainText('overlap');
  });
});
