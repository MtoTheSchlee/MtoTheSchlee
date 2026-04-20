/**
 * Render the key screens of the running KK-OS web app into PNGs.
 * Drops files into screenshots/ so we can show them inline.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), 'screenshots');

const SCREENS: Array<{ slug: string; path: string; waitFor?: string; note?: string }> = [
  { slug: '01-dashboard', path: '/', waitFor: 'text=Kommandozentrale' },
  { slug: '02-board-operations', path: '/board/operations', waitFor: 'text=Operations' },
  { slug: '03-board-abs', path: '/board/abs', waitFor: 'text=Auftragsbestätigungen' },
  { slug: '04-inbox', path: '/inbox', waitFor: 'text=ABs' },
  { slug: '05-ab-list', path: '/ab', waitFor: 'text=AB-Prüfung' },
  { slug: '06-customers', path: '/customers', waitFor: 'text=Kunden' },
  { slug: '07-suppliers', path: '/suppliers', waitFor: 'text=Lieferanten' },
  { slug: '08-appointments', path: '/appointments', waitFor: 'text=Termine' },
  { slug: '09-controlling', path: '/controlling', waitFor: 'text=Controlling' },
  { slug: '10-social', path: '/social', waitFor: 'text=Social-Studio' },
  { slug: '11-agents', path: '/agents', waitFor: 'text=Agenten' },
  { slug: '12-voice', path: '/voice', waitFor: 'text=Jarvis-Konsole' },
  { slug: '13-login', path: '/login', waitFor: 'text=Anmelden' },
];

async function main() {
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
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('console', msg.text());
  });

  for (const s of SCREENS) {
    const url = BASE + s.path;
    console.log(`→ ${s.slug}  ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      if (s.waitFor) {
        await page.locator(s.waitFor).first().waitFor({ timeout: 8_000 }).catch(() => {});
      }
      // Give React Query two full refetch cycles to populate data.
      await page.waitForTimeout(4000);
      await page.screenshot({ path: join(OUT, `${s.slug}.png`), fullPage: true });
    } catch (err) {
      console.error(`  FAIL: ${(err as Error).message}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
