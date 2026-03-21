const { test, expect } = require('@playwright/test');

test.describe('Enchanted Forest Bunny app', () => {
  test('exposes install metadata, offline registration, and reskin controls', async ({ page }) => {
    await page.goto('/apps/enchanted-bunny/');

    await expect(page.locator('.home-link')).toHaveAttribute('href', '../../');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', 'apple-touch-icon.png');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');

    const skinButton = page.locator('#skin-toggle');
    const skinLabel = page.locator('#skin-button-value');

    await expect(skinButton).toBeVisible();
    await expect(skinLabel).toHaveText('Golden Burrow');
    await expect(page.locator('body')).toHaveAttribute('data-skin', 'golden');

    await skinButton.click();
    await expect(skinLabel).toHaveText('Moonlit Hare');
    await expect(page.locator('body')).toHaveAttribute('data-skin', 'moonlit');

    const registrationState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false, registered: false };
      }

      const registration = await navigator.serviceWorker.getRegistration('/');
      return {
        supported: true,
        registered: Boolean(registration),
        scope: registration ? registration.scope : null,
        savedSkin: window.localStorage.getItem('enchanted-bunny-skin'),
      };
    });

    expect(registrationState.supported).toBe(true);
    expect(registrationState.registered).toBe(true);
    expect(registrationState.scope).toContain('127.0.0.1:4173/');
    expect(registrationState.savedSkin).toBe('moonlit');
  });
});
