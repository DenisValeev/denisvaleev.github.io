const { test, expect } = require('@playwright/test');

test.describe('Enchanted Forest Bunny app', () => {
  test('exposes install metadata, offline registration, and shape-shifting reskin controls', async ({ page }) => {
    await page.goto('/apps/enchanted-bunny/');

    await expect(page.locator('.home-link')).toHaveCount(0);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', 'apple-touch-icon.png');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');

    const skinButton = page.locator('#skin-toggle');
    const skinLabel = page.locator('#skin-button-value');

    await expect(skinButton).toBeVisible();
    await expect(skinLabel).toHaveText('Golden Burrow');
    await expect(page.locator('body')).toHaveAttribute('data-skin', 'golden');
    await expect(page.locator('#beam-color-value')).toHaveText('Verdant');

    const goldenShapes = await page.evaluate(() => {
      const wing = document.querySelector('.wing-left');
      const body = document.querySelector('.body');
      const tree = document.querySelector('.tree');
      const tuft = document.querySelector('.tuft-left');

      return {
        wingClipPath: wing ? getComputedStyle(wing).clipPath : null,
        bodyClipPath: body ? getComputedStyle(body).clipPath : null,
        treeTransform: tree ? getComputedStyle(tree).transform : null,
        tuftClipPath: tuft ? getComputedStyle(tuft, '::before').clipPath : null,
      };
    });

    await skinButton.click();
    await expect(skinLabel).toHaveText('Moonlit Hare');
    await expect(page.locator('body')).toHaveAttribute('data-skin', 'moonlit');

    const moonlitShapes = await page.evaluate(() => {
      const wing = document.querySelector('.wing-left');
      const body = document.querySelector('.body');
      const tree = document.querySelector('.tree');
      const tuft = document.querySelector('.tuft-left');

      return {
        wingClipPath: wing ? getComputedStyle(wing).clipPath : null,
        bodyClipPath: body ? getComputedStyle(body).clipPath : null,
        treeTransform: tree ? getComputedStyle(tree).transform : null,
        tuftClipPath: tuft ? getComputedStyle(tuft, '::before').clipPath : null,
      };
    });

    expect(moonlitShapes.wingClipPath).not.toBe(goldenShapes.wingClipPath);
    expect(moonlitShapes.bodyClipPath).not.toBe(goldenShapes.bodyClipPath);
    expect(moonlitShapes.treeTransform).not.toBe(goldenShapes.treeTransform);
    expect(moonlitShapes.tuftClipPath).not.toBe(goldenShapes.tuftClipPath);

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

  test('clearing every butterfly respawns the swarm with one extra and remixes the beam color', async ({ page }) => {
    await page.goto('/apps/enchanted-bunny/');

    const scene = page.locator('#scene');
    await expect(scene).toHaveAttribute('data-butterfly-wave', '1');
    await expect(scene).toHaveAttribute('data-butterflies-remaining', '4');
    await expect(scene).toHaveAttribute('data-butterfly-count', '4');
    await expect(scene).toHaveAttribute('data-beam-palette', 'verdant');
    await expect(page.locator('.butterfly')).toHaveCount(4);

    for (const remaining of ['3', '2', '1']) {
      await page.locator('.butterfly[data-status="idle"]').first().dispatchEvent('click');
      await expect(page.locator('#butterfly-count-value')).toHaveText(remaining, { timeout: 4000 });
    }

    await page.locator('.butterfly[data-status="idle"]').first().dispatchEvent('click');

    await expect(scene).toHaveAttribute('data-butterfly-wave', '2', { timeout: 5000 });
    await expect(scene).toHaveAttribute('data-butterfly-count', '5', { timeout: 5000 });
    await expect(scene).toHaveAttribute('data-butterflies-remaining', '5', { timeout: 5000 });
    await expect(scene).toHaveAttribute('data-beam-palette', 'amethyst', { timeout: 5000 });
    await expect(page.locator('#beam-color-value')).toHaveText('Amethyst');
    await expect(page.locator('.butterfly')).toHaveCount(5);
  });
});
