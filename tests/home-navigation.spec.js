const { test, expect } = require('@playwright/test');

const appPages = [
  { name: 'Dad Jokes', path: '/apps/jokes/' },
  { name: 'Dad Jokes (All jokes)', path: '/apps/jokes/all-jokes.html' },
  { name: 'Dad Jokes (Compact view)', path: '/apps/jokes/all-jokes-compact.html' },
  { name: 'Quotes', path: '/apps/quotes/' },
  { name: 'Quotes (All quotes)', path: '/apps/quotes/all-quotes.html' },
  { name: 'Slang', path: '/apps/slang/' },
  { name: 'Slang (All slang)', path: '/apps/slang/all-slang.html' },
  { name: 'Cosine Similarity Lab', path: '/apps/similarity-report/' },
  { name: 'Value Formatter', path: '/apps/value-formatter/' },
  { name: 'Asset Observatory', path: '/apps/asset-observatory/' },
];

test.describe('Home navigation affordance', () => {
  for (const { name, path } of appPages) {
    test(`${name} has a Home button`, async ({ page }) => {
      await page.goto(path);
      const homeLink = page.locator('.home-link');
      await expect(homeLink).toHaveCount(1);
      await expect(homeLink).toHaveAttribute('href', '../../');
      await expect(homeLink).toContainText('Home');
      await expect(homeLink).toBeVisible();
    });
  }
});
