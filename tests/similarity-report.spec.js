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
    const baselineEl = page.locator('[data-baseline]');
    const modelEl = page.locator('[data-model-label]');
    const providerEl = page.locator('[data-provider-label]');
    const resultsSection = page.locator('[data-results]');
    const tableWrapper = page.locator('[data-matrix-view]');
    const detailPanel = page.locator('[data-detail]');
    const detailBody = page.locator('[data-detail-body]');
    const detailTitle = page.locator('[data-detail-title]');
    const copyButton = page.locator('[data-copy-pair]');

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
    expect(maxLabelValue).toBeCloseTo(maxSliderValue, 2);
    expect(maxDisplayValue).toBeCloseTo(maxSliderValue, 2);
    expect(maxSliderValue).toBeGreaterThanOrEqual(minSliderValue);

    await expect(page.locator('[data-dataset]')).toHaveCount(3);

    await expect(providerEl).toContainText('Hugging Face Space');
    await expect(modelEl).toContainText(/MiniLM/i);

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

    const secondOpinionButton = page.locator('[data-model-toggle] button', {
      hasText: 'Second opinion (HF Space)',
    });
    await secondOpinionButton.click();
    await expect(secondOpinionButton).toHaveClass(/is-active/);
    await expect(page.locator('body')).toHaveAttribute('data-active-dataset', 'jokes');
    await expect(resultsSection).toHaveAttribute('data-layout', 'matrix');
    await page.waitForSelector('[data-results-body] tr:not(.empty-row)');
    const secondOpinionRows = page.locator('[data-results-body] tr:not(.empty-row)');
    expect(await secondOpinionRows.count()).toBeGreaterThan(0);
    await expect(tableWrapper).toBeVisible();
    await expect(detailPanel).toBeVisible();
    await secondOpinionRows.first().click();
    await expect(detailBody).toBeVisible();
    await expect(detailTitle).toContainText('↔');
    await expect(copyButton).toBeEnabled();

    const secondOpinionMatchCount = parseLocaleNumber(await page.locator('[data-match-count]').textContent());
    expect(secondOpinionMatchCount).toBeGreaterThan(0);

    const secondMinAttr = await minSlider.getAttribute('min');
    expect(Number.parseFloat(secondMinAttr || '0')).toBeCloseTo(0.5, 2);

    const baselineValue = parseLocaleNumber(await baselineEl.textContent());
    expect(baselineValue).toBeCloseTo(0.5, 2);

    await expect(providerEl).toContainText(/openai embeddings/i);
    await expect(modelEl).toContainText(/text-embedding-3-large/i);

    const cohereButton = page.locator('[data-model-toggle] button', {
      hasText: 'Cohere embed-english-v3.0',
    });
    await cohereButton.click();
    await expect(cohereButton).toHaveClass(/is-active/);
    await expect(providerEl).toContainText('Cohere embeddings');
    await expect(modelEl).toContainText('embed-english-v3.0');
    await expect(resultsSection).toHaveAttribute('data-layout', 'matrix');
    await page.waitForSelector('[data-results-body] tr:not(.empty-row)');
    const cohereRows = page.locator('[data-results-body] tr:not(.empty-row)');
    expect(await cohereRows.count()).toBeGreaterThan(0);
    await cohereRows.first().click();
    await expect(tableWrapper).toBeVisible();
    await expect(detailPanel).toBeVisible();
    await expect(detailBody).toBeVisible();
    await expect(detailTitle).toContainText('↔');
    await expect(copyButton).toBeEnabled();

    const searchPlaceholder = await page.locator('[data-search]').getAttribute('placeholder');
    expect((searchPlaceholder || '').toLowerCase()).toContain('j-0182');

    const detailPreviews = page.locator('[data-record-a-embedding] img, [data-record-b-embedding] img');
    await expect(detailPreviews.first()).toHaveAttribute('src', /^data:image\//);

    const cohereMatchCount = parseLocaleNumber(await page.locator('[data-match-count]').textContent());
    expect(cohereMatchCount).toBeGreaterThan(0);

    const cohereBaselineValue = parseLocaleNumber(await baselineEl.textContent());
    expect(cohereBaselineValue).toBeCloseTo(0.5, 2);

    const cohereMinSliderValue = Number.parseFloat(await minSlider.evaluate((node) => node.value));
    expect(cohereMinSliderValue).toBeLessThanOrEqual(0.51);
    expect(cohereMinSliderValue).toBeGreaterThanOrEqual(0.5);

    const cohereDatasetMin = await page.evaluate(async () => {
      const response = await fetch('/data/similarity-report-jokes-cohere.json');
      const data = await response.json();
      return data.matches.reduce((minimum, match) => {
        const value = typeof match.similarity === 'number' ? match.similarity : 1;
        return value < minimum ? value : minimum;
      }, 1);
    });
    expect(cohereDatasetMin).toBeGreaterThanOrEqual(0.5);
    expect(cohereDatasetMin).toBeLessThanOrEqual(0.51);

    const quotesButton = page.locator('[data-dataset="quotes"]');
    await quotesButton.click();
    await expect(page.locator('body')).toHaveAttribute('data-active-dataset', 'quotes');
    await expect(page.locator('[data-search]')).toHaveAttribute('placeholder', /adventure-01/);
    const quoteRows = page.locator('[data-results-body] tr:not(.empty-row)');
    expect(await quoteRows.count()).toBeGreaterThan(0);
    await expect(quoteRows.first().locator('.id-badge').first()).not.toHaveText(/^j-/);

    const quotesMatchCount = parseLocaleNumber(await page.locator('[data-match-count]').textContent());
    expect(quotesMatchCount).toBeGreaterThan(0);

    const quotesBaselineValue = parseLocaleNumber(await baselineEl.textContent());
    expect(quotesBaselineValue).toBeCloseTo(0.5, 2);

    const quotesMinSliderValue = Number.parseFloat(await minSlider.evaluate((node) => node.value));
    expect(quotesMinSliderValue).toBeLessThanOrEqual(0.51);
    expect(quotesMinSliderValue).toBeGreaterThanOrEqual(0.5);

    const quotesDatasetMin = await page.evaluate(async () => {
      const response = await fetch('/data/similarity-report-quotes-cohere.json');
      const data = await response.json();
      return data.matches.reduce((minimum, match) => {
        const value = typeof match.similarity === 'number' ? match.similarity : 1;
        return value < minimum ? value : minimum;
      }, 1);
    });
    expect(quotesDatasetMin).toBeGreaterThanOrEqual(0.5);
    expect(quotesDatasetMin).toBeLessThanOrEqual(0.51);
  });
});
