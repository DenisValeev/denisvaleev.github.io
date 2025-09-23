const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('lists every app including the telemetry console', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.app-card');
    await expect(cards).toHaveCount(4);

    const telemetryCard = page.locator('.app-card', {
      has: page.locator('h2', { hasText: 'Playwright Run Telemetry' }),
    });

    await expect(telemetryCard).toBeVisible();
    await expect(telemetryCard).toHaveAttribute('href', 'apps/run-telemetry/');
    await expect(telemetryCard.locator('p')).toContainText(/Playwright/i);

    const devLinks = page.locator('.dev-tools a');
    await expect(devLinks).toHaveCount(3);
    await expect(devLinks.nth(0)).toContainText('Value Formatter');
    await expect(devLinks.nth(1)).toContainText('All Jokes');
    await expect(devLinks.nth(2)).toContainText('All Quotes');
  });
});
