/**
 * Capture a screenshot of the command palette open on the dashboard so
 * docs/screenshots stays in sync with the code.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const OUT = join(process.cwd(), 'docs', 'screenshots');
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_BIN || undefined,
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/');
  await page.getByRole('heading', { name: 'Kommandozentrale' }).waitFor();
  await page.waitForTimeout(600);
  await page.keyboard.press('Control+k');
  await page.getByLabel('Suche').waitFor();
  await page.getByLabel('Suche').fill('Nobilia');
  // Wait for at least one hit.
  await page.getByRole('dialog').getByRole('button').first().waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, '14-command-palette.png'), fullPage: false });
  await browser.close();
  console.log('palette screenshot saved');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
