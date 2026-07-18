const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('shows grouped deck buttons with clear shortcuts', async ({ page }) => {
    await page.goto('/');

    const groupedRows = page.locator('.app-row[data-group]');
    await expect(groupedRows).toHaveCount(3);

    const expectedRows = [
      {
        group: 'jokes',
        label: 'Jokes',
        texts: ['😂 Dad Jokes', 'All Jokes'],
        hrefs: ['apps/jokes/', 'apps/jokes/all-jokes.html'],
      },
      {
        group: 'quotes',
        label: 'Quotes',
        texts: ['💬 Quotes', 'All Quotes'],
        hrefs: ['apps/quotes/', 'apps/quotes/all-quotes.html'],
      },
      {
        group: 'slang',
        label: 'Slang',
        texts: ['🗣️ Slang', 'All Slang'],
        hrefs: ['apps/slang/', 'apps/slang/all-slang.html'],
      },
    ];

    for (const { group, label, texts, hrefs } of expectedRows) {
      const row = page.locator(`.app-row[data-group="${group}"]`);
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('aria-label', label);

      const buttons = row.locator('a.app-button');
      await expect(buttons).toHaveCount(texts.length);

      const buttonTexts = await buttons.evaluateAll((nodes) =>
        nodes.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()),
      );
      expect(buttonTexts).toEqual(texts);

      const buttonHrefs = await buttons.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href')),
      );
      expect(buttonHrefs).toEqual(hrefs);

      await expect(buttons.first()).not.toHaveClass(/app-button--primary/);
      await expect(buttons.first()).toHaveClass(/app-button--secondary/);
    }
  });

  test('lists labs and utilities as concise buttons without descriptions', async ({ page }) => {
    await page.goto('/');

    const toolSection = page.locator('section.app-groups').nth(1);
    const toolButtons = toolSection.locator('a.app-button, a.docs-button');
    await expect(toolButtons).toHaveCount(12);

    const toolInfo = await toolButtons.evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        href: node.getAttribute('href'),
      })),
    );

    expect(toolInfo).toEqual([
      { text: '{ } Pad', href: '/pad/' },
      { text: '🧠 Total Recall', href: 'apps/total-recall/' },
      { text: '🧪 Cosine Similarity Lab', href: 'apps/similarity-report/' },
      { text: '∑ Elementary Operator Atlas', href: 'apps/elementary-operator/' },
      { text: '🧬 Embedding Explorer', href: 'apps/embedding-explorer/' },
      { text: '📊 Asset Observatory', href: 'apps/asset-observatory/' },
      { text: '🧰 Value Formatter', href: 'apps/value-formatter/' },
      { text: '🧵 Cloth Lab', href: 'apps/cloth/' },
      { text: '🐇 Enchanted Forest Bunny', href: 'apps/enchanted-bunny/' },
      { text: '🌙 Moonpetal Bunny Choir', href: 'apps/bunny-moon-choir/' },
      { text: '📖 Docs', href: 'docs/' },
      { text: '📚 Blog', href: 'apps/wiki/' },
    ]);

    const valueFormatterButton = toolButtons.filter({ hasText: 'Value Formatter' });
    await expect(valueFormatterButton).toHaveCount(1);
    await expect(valueFormatterButton).not.toContainText('Quick');
    await expect(valueFormatterButton).not.toContainText('—');

    const allButtons = page.locator('a.app-button, a.docs-button');
    await expect(allButtons).toHaveCount(18);
  });
});
