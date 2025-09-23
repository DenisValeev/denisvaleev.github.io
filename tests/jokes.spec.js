const { test, expect } = require('@playwright/test');

const deterministicRandomInitScript = () => {
  const values = [0.12, 0.76, 0.38, 0.94, 0.52];
  let index = 0;
  Math.random = () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

test.describe('Random Jokes app', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(deterministicRandomInitScript);
  });

  test('reveals punchlines, resets when moving, and honours keyboard shortcuts', async ({ page }) => {
    await page.goto('/apps/jokes/');

    const setup = page.locator('#joke-setup');
    const punchline = page.locator('#joke-punchline');
    const revealButton = page.locator('#reveal-button');
    const nextButton = page.locator('#next-button');
    const prevButton = page.locator('#prev-button');

    await expect(setup).not.toHaveText(/Loading joke…?/i);
    await expect(punchline).not.toHaveClass(/is-visible/);
    await expect(punchline).toHaveAttribute('aria-hidden', 'true');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'false');
    await expect(nextButton).toBeEnabled();
    await expect(prevButton).toBeEnabled();

    await revealButton.click();
    await expect(punchline).toHaveClass(/is-visible/);
    await expect(punchline).toHaveAttribute('aria-hidden', 'false');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'true');

    const firstSetup = (await setup.textContent())?.trim() || '';
    expect(firstSetup.length).toBeGreaterThan(0);

    await nextButton.click();

    await expect(punchline).not.toHaveClass(/is-visible/);
    await expect(punchline).toHaveAttribute('aria-hidden', 'true');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'false');

    const secondSetup = (await setup.textContent())?.trim() || '';
    expect(secondSetup.length).toBeGreaterThan(0);
    expect(secondSetup).not.toBe(firstSetup);

    await page.keyboard.press('ArrowLeft');
    await expect(setup).toHaveText(firstSetup);

    await page.evaluate(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    });

    await page.keyboard.press('Space');
    await expect(revealButton).toHaveAttribute('aria-pressed', 'true');
    await expect(punchline).toHaveClass(/is-visible/);
  });
});
