const { test, expect } = require('@playwright/test');

const parseLocaleNumber = (text) => {
  if (!text) {
    return NaN;
  }
  const normalized = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
  return Number.parseFloat(normalized);
};

test.describe('Cosine Similarity Lab', () => {
  test('loads similarity data with Levenshtein metrics and a dynamic floor', async ({ page }) => {
    await page.goto('/apps/similarity-report/');

    await page.waitForSelector('[data-results-body] tr:not(.empty-row)');

    const slider = page.locator('[data-min-similarity]');
    const sliderLabel = page.locator('[data-threshold-label]');
    const sliderDisplay = page.locator('[data-threshold-display]');

    const sliderMinAttr = await slider.getAttribute('min');
    const sliderMin = Number.parseFloat(sliderMinAttr || '0');
    expect(sliderMin).toBeGreaterThanOrEqual(0.5);
    expect(sliderMin).toBeLessThanOrEqual(0.95);

    const labelValue = parseLocaleNumber(await sliderLabel.textContent());
    const displayValue = parseLocaleNumber(await sliderDisplay.textContent());

    expect(labelValue).toBeGreaterThanOrEqual(sliderMin - 0.001);
    expect(displayValue).toBeCloseTo(labelValue, 4);

    await expect(page.locator('[data-dataset]')).toHaveCount(3);

    const pairMetric = page.locator('.pair-metric', { hasText: 'Levenshtein' }).first();
    await expect(pairMetric).toBeVisible();

    const crossDeckButton = page.locator('[data-dataset="cross-deck"]');
    await crossDeckButton.click();
    await expect(page.locator('body')).toHaveAttribute('data-active-dataset', 'cross-deck');
    await expect(page.locator('[data-search]')).toHaveAttribute('placeholder', /humor-08/);

    const crossFirstRow = page.locator('[data-results-body] tr').first();
    await expect(crossFirstRow.locator('.id-badge').first()).toHaveText('humor-01');
    await crossFirstRow.click();

    const detailMetric = page.locator('[data-detail-levenshtein]');
    await expect(detailMetric).toContainText('overlap');
  });
});
