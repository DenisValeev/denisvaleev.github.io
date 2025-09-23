const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('presents grouped deck buttons and lab shortcuts', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('main[aria-label="Apps"] > header.site-header');
    await expect(header.locator('h1')).toHaveText('Toolbox');

    const deckRows = page.locator('.app-row');
    await expect(deckRows).toHaveCount(3);
    await expect(deckRows.first()).toHaveAttribute('role', 'group');

    const groupLabels = await deckRows.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label')),
    );
    expect(groupLabels).toEqual(['Jokes', 'Quotes', 'Gen Alpha']);

    const deckLinkSets = await deckRows.evaluateAll((nodes) =>
      nodes.map((node) =>
        Array.from(node.querySelectorAll('a.app-button')).map((link) => ({
          href: link.getAttribute('href'),
          text: (link.textContent || '').replace(/\s+/g, ' ').trim(),
        })),
      ),
    );

    expect(deckLinkSets).toEqual([
      [
        { href: 'apps/jokes/', text: '😂 Dad Jokes' },
        { href: 'apps/jokes/all-jokes.html', text: 'All Jokes' },
      ],
      [
        { href: 'apps/quotes/', text: '💬 Quotes' },
        { href: 'apps/quotes/all-quotes.html', text: 'All Quotes' },
      ],
      [
        { href: 'apps/gen-alpha/', text: '🧒 Gen α Slang' },
        { href: 'apps/gen-alpha/all-slang.html', text: 'All Slang' },
      ],
    ]);

    await expect(page.locator('a.app-button--primary')).toHaveCount(0);
    await expect(page.locator('a.app-card')).toHaveCount(0);
    await expect(page.locator('.dev-tools')).toHaveCount(0);
    await expect(page.locator('.app-links')).toHaveCount(0);
  });
});
