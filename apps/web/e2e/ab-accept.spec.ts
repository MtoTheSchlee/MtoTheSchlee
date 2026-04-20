import { test, expect } from '@playwright/test';

test.describe('AB-Prüfung list', () => {
  test('shows the seeded ABs with ampel chips', async ({ page }) => {
    await page.goto('/ab');
    await expect(page.getByRole('heading', { name: 'AB-Prüfung' })).toBeVisible();
    // Table headers.
    await expect(page.getByRole('columnheader', { name: 'AB-Nr.' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Ampel' })).toBeVisible();
    // Seeded rows from demo fixtures.
    await expect(page.getByText('NOB-2026-GRN')).toBeVisible();
    await expect(page.getByText('SIE-2026-RED')).toBeVisible();
  });

  test('filter buttons survive click', async ({ page }) => {
    await page.goto('/ab');
    await page.getByRole('button', { name: 'red' }).click();
    // After clicking red filter, the green AB should no longer be visible.
    await expect(page.getByText('NOB-2026-GRN')).toHaveCount(0);
  });
});
