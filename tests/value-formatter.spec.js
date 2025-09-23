const { test, expect } = require('@playwright/test');

test.describe('Value Formatter app', () => {
  test('applies presets, custom transforms, and persists the input field', async ({ page }) => {
    await page.goto('/apps/value-formatter/');
    await page.waitForFunction(() => typeof window.run === 'function');

    const input = page.locator('#inputText');
    const output = page.locator('#outputText');
    const presets = page.locator('#presets');
    const transformer = page.locator('#transformerValue');
    const joinValue = page.locator('#joinValue');

    await expect(output).toHaveValue('t.[1] = s.[1],\nt.[2] = s.[2],\nt.[3] = s.[3]');

    await presets.selectOption('_');
    await expect(transformer).toHaveValue('_');
    await expect(output).toHaveValue('1,\n2,\n3');

    await joinValue.fill(' | ');
    await page.evaluate(() => window.run());
    await expect(output).toHaveValue('1 | 2 | 3');

    await transformer.fill('value(_);');
    await page.evaluate(() => window.run());
    await expect(output).toHaveValue('value(1); | value(2); | value(3);');

    await input.fill('alpha beta');
    await page.evaluate(() => window.run());
    await expect(output).toHaveValue('value(alpha); | value(beta);');

    const storedInput = await page.evaluate(() => window.localStorage.getItem('inputText'));
    expect(storedInput).toBe('alpha beta');

    await page.reload();

    await expect(input).toHaveValue('alpha beta');
    await expect(output).toHaveValue('t.[alpha] = s.[alpha],\nt.[beta] = s.[beta]');
  });
});
