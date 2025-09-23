const { test, expect } = require('@playwright/test');

test.describe('Landing page', () => {
  test('lists main apps with shortcuts and utility links', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('main[aria-label="Apps"] > header.site-header');
    await expect(header.locator('h1')).toHaveText('Toolbox');

    const cards = page.locator('a.app-card');
    await expect(cards).toHaveCount(4);

    const expectedApps = [
      { title: 'Dad Jokes', href: 'apps/jokes/' },
      { title: 'Gen Alpha Slang', href: 'apps/gen-alpha/' },
      { title: 'Quotes', href: 'apps/quotes/' },
      { title: 'Cosine Similarity Lab', href: 'apps/similarity-report/' },
    ];

    for (const { title, href } of expectedApps) {
      const card = cards.filter({ has: page.locator('h2', { hasText: title }) });
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute('href', href);
      await expect(card.locator('.app-card__cta svg')).toHaveCount(1);
    }

    const shortcutGroups = page.locator('.app-links');
    await expect(shortcutGroups).toHaveCount(3);
    const shortcutLinks = shortcutGroups.locator('a.app-secondary');
    await expect(shortcutLinks).toHaveCount(3);

    const shortcutTexts = await shortcutLinks.allTextContents();
    const normalizedShortcuts = shortcutTexts.map((text) => text.replace(/\s+/g, ' ').trim());
    expect(normalizedShortcuts).toEqual([
      '📚 All Jokes',
      '🗂️ All Slang',
      '🗂️ All Quotes',
    ]);

    const devLinks = page.locator('section.dev-tools a.dev-link');
    await expect(devLinks).toHaveCount(4);

    const devLinkTargets = await devLinks.evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.getAttribute('href'),
        text: node.textContent?.replace(/\s+/g, ' ').trim() || '',
      })),
    );

    expect(devLinkTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: 'apps/value-formatter/', text: expect.stringContaining('Value Formatter') }),
        expect.objectContaining({ href: 'apps/jokes/all-jokes.html', text: expect.stringContaining('All Jokes') }),
        expect.objectContaining({ href: 'apps/quotes/all-quotes.html', text: expect.stringContaining('All Quotes') }),
        expect.objectContaining({ href: 'apps/gen-alpha/all-slang.html', text: expect.stringContaining('All Gen Alpha Slang') }),
      ]),
    );
  });
});
