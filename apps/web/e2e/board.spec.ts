import { test, expect } from '@playwright/test';

test.describe('Board', () => {
  test('renders operations board with at least one card', async ({ page }) => {
    await page.goto('/board/operations');
    await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
    // Demo fixtures seed at least one card.
    await expect(page.locator('article')).not.toHaveCount(0);
  });

  test('AB board segments cards into green and red lanes', async ({ page }) => {
    await page.goto('/board/abs');
    await expect(page.getByRole('heading', { name: /Auftragsbest/ })).toBeVisible();
    await expect(page.getByText('AB NOB-2026-GRN', { exact: false })).toBeVisible();
    await expect(page.getByText('AB SIE-2026-RED', { exact: false })).toBeVisible();
  });
});
