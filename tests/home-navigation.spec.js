const { test, expect } = require('@playwright/test');

const appPages = [
  { name: 'Dad Jokes', path: '/apps/jokes/' },
  { name: 'Quotes', path: '/apps/quotes/' },
  { name: 'Gen α Slang', path: '/apps/gen-alpha/' },
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
