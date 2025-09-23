const { test, expect } = require('@playwright/test');

test.describe('Playwright Run Telemetry console', () => {
  test('renders summaries, supports filters, and exposes the activity log', async ({ page }) => {
    await page.goto('/apps/run-telemetry/');

    await page.waitForSelector('[data-test-list] button[data-test-id]');

    await expect(page.locator('[data-run-start]')).not.toHaveText('--');
    await expect(page.locator('[data-run-duration]')).not.toHaveText('--');
    await expect(page.locator('[data-run-total]')).not.toHaveText('0');

    const testButtons = page.locator('[data-test-list] button[data-test-id]');
    const total = await testButtons.count();
    expect(total).toBeGreaterThan(0);

    const detailTitle = page.locator('[data-detail-title]');
    await expect(detailTitle).not.toHaveText(/Pick a test/i);

    if (total > 1) {
      await testButtons.nth(1).click();
      await expect(testButtons.nth(1)).toHaveAttribute('aria-current', 'true');
    }

    await page.locator('[data-filter-button="passed"]').click();
    await expect(page.locator('[data-filter-button="passed"]')).toHaveClass(/is-active/);
    const passedCount = await page.locator('[data-test-list] button[data-test-id]').count();
    expect(passedCount).toBeGreaterThan(0);

    await page.locator('[data-filter-button="failed"]').click();
    await expect(page.locator('[data-empty-state]')).toBeVisible();

    await page.locator('[data-filter-button="all"]').click();
    await expect(page.locator('[data-filter-button="all"]').first()).toHaveClass(/is-active/);

    const logEntries = page.locator('[data-log-entry]');
    expect(await logEntries.count()).toBeGreaterThan(0);
    await expect(logEntries.first()).toBeVisible();

    const refresh = page.locator('[data-refresh-button]');
    await refresh.click();
    await expect(refresh).not.toHaveAttribute('aria-busy', 'true');
  });
});
