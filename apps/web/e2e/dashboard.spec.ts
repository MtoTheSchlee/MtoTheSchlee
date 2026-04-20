import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('renders KPIs from the live API', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kommandozentrale' })).toBeVisible();

    // KPI tile labels.
    for (const label of [
      'Zu prüfen',
      'Kritische Abweichungen',
      'Offene Abweichungen',
      'Projekte in Ausführung',
      'Offene Karten',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // "Zu prüfen" tile has the breakdown hint once snapshot loads.
    await expect(page.getByText(/Mail.*Termin.*Doc/)).toBeVisible();
  });

  test('supplier scorecards show real names, not UUIDs', async ({ page }) => {
    await page.goto('/');
    // After demo-fixtures: Nobilia + Siemens live in the 180-day window.
    await expect(page.getByRole('cell', { name: 'Nobilia' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Siemens' }).first()).toBeVisible();
  });
});
