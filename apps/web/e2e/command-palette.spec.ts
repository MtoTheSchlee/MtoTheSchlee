import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
  test('opens with Cmd/Ctrl+K, searches, navigates to a hit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kommandozentrale' })).toBeVisible();
    await page.waitForTimeout(300);

    await page.keyboard.press('Control+k');
    const input = page.getByLabel('Suche');
    await expect(input).toBeVisible();

    await input.fill('Nobilia');
    // Wait for the supplier hit button to appear.
    const firstHit = page.getByRole('dialog').getByRole('button', { name: /Lieferant.*Nobilia/ });
    await expect(firstHit).toBeVisible({ timeout: 6_000 });

    await firstHit.click();
    await expect(page).toHaveURL(/\/suppliers/);
  });

  test('escape closes the palette', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kommandozentrale' })).toBeVisible();
    await page.waitForTimeout(300);

    await page.keyboard.press('Control+k');
    await expect(page.getByLabel('Suche')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Suche')).toBeHidden();
  });
});
