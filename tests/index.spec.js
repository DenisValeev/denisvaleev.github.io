const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('shows grouped deck buttons with clear shortcuts', async ({ page }) => {
    await page.goto('/');

    const groupedRows = page.locator('[data-group]');
    await expect(groupedRows).toHaveCount(3);

    const expectedRows = [
      {
        group: 'jokes',
        heading: 'Jokes',
        texts: ['😂 Dad Jokes', 'All Jokes'],
        hrefs: ['apps/jokes/', 'apps/jokes/all-jokes.html'],
      },
      {
        group: 'quotes',
        heading: 'Quotes',
        texts: ['💬 Quotes', 'All Quotes'],
        hrefs: ['apps/quotes/', 'apps/quotes/all-quotes.html'],
      },
      {
        group: 'gen-alpha',
        heading: 'Gen Alpha',
        texts: ['🧒 Gen Alpha Slang', 'All Slang'],
        hrefs: ['apps/gen-alpha/', 'apps/gen-alpha/all-slang.html'],
      },
    ];

    for (const { group, heading: expectedHeading, texts, hrefs } of expectedRows) {
      const row = page.locator(`[data-group="${group}"]`);
      await expect(row).toBeVisible();

      const heading = row.locator('.app-row__title span:last-child');
      await expect(heading).toHaveText(expectedHeading);

      const buttons = row.locator('a.app-button');
      await expect(buttons).toHaveCount(texts.length);

      const buttonTexts = await buttons.allTextContents();
      const normalizedTexts = buttonTexts.map((text) => text.replace(/\s+/g, ' ').trim());
      expect(normalizedTexts).toEqual(texts);

      const buttonHrefs = await buttons.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href')),
      );
      expect(buttonHrefs).toEqual(hrefs);

      await expect(buttons.first()).toHaveClass(/app-button--primary/);
    }
  });

  test('lists labs and utilities as concise buttons without descriptions', async ({ page }) => {
    await page.goto('/');

    const toolSection = page.locator('section.app-groups').nth(1);
    const toolButtons = toolSection.locator('a.app-button');
    await expect(toolButtons).toHaveCount(3);

    const toolInfo = await toolButtons.evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        href: node.getAttribute('href'),
      })),
    );

    expect(toolInfo).toEqual([
      { text: '🧪 Cosine Similarity Lab', href: 'apps/similarity-report/' },
      { text: '📈 Playwright Run Telemetry', href: 'apps/run-telemetry/' },
      { text: '🧰 Value Formatter', href: 'apps/value-formatter/' },
    ]);

    const valueFormatterButton = toolButtons.filter({ hasText: 'Value Formatter' });
    await expect(valueFormatterButton).toHaveCount(1);
    await expect(valueFormatterButton).not.toContainText('Quick');
    await expect(valueFormatterButton).not.toContainText('—');

    const allButtons = page.locator('a.app-button');
    await expect(allButtons).toHaveCount(9);
  });
});
