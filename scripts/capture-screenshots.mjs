/**
 * scripts/capture-screenshots.mjs
 *
 * Captures REAL, CONSISTENT screenshots of the live app with headless Chromium
 * and writes them into docs/screenshots/{desktop,mobile,admin}/.
 *
 * Key rule learned the hard way: VIEWPORT shots only (fullPage: false).
 * Full-page captures produce 7000px-tall slivers that render as broken-looking
 * threads on GitHub. Every desktop shot is a uniform 1440×900 (16:10) frame;
 * every mobile shot a uniform 390×844 phone frame. Consistent aspect ratios
 * are what make the README grid look premium.
 *
 * Run:
 *   node scripts/capture-screenshots.mjs
 *   SHOT_ADMIN_EMAIL=… SHOT_ADMIN_PASSWORD=… node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

const BASE = process.env.SHOT_BASE_URL || 'https://ambica-medical.vercel.app';
const ADMIN_EMAIL = process.env.SHOT_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.SHOT_ADMIN_PASSWORD || '';
const OUT = 'docs/screenshots';

// [path, folder/file, optional scroll-y before shot]
const DESKTOP = [
  ['/', 'desktop/storefront-home.png', 0],
  ['/products', 'desktop/medicine-catalog.png', 0],
  ['/products/p001', 'desktop/product-details.png', 0],
  ['/prescription', 'desktop/prescription-upload.png', 0],
];
const MOBILE = [
  ['/', 'mobile/mobile-home.png'],
  ['/products', 'mobile/mobile-catalog.png'],
];
const ADMIN_PUBLIC = [['/admin/login', 'admin/auth-login.png']];
const ADMIN_AUTHED = [
  ['/admin', 'admin/admin-dashboard.png'],
  ['/admin/customers', 'admin/admin-customers.png'],
  ['/admin/medicine-images', 'admin/admin-medicine-images.png'],
];

async function shoot(page, path, file, scrollY = 0) {
  process.stdout.write(`  ${file}  ← ${path} … `);
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    if (scrollY) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: join(OUT, file), fullPage: false }); // VIEWPORT only
    console.log('ok');
  } catch (e) {
    console.log('FAILED: ' + e.message);
  }
}

async function main() {
  // Fresh start — remove the old (full-page) captures entirely.
  await rm(OUT + '/desktop', { recursive: true, force: true });
  await rm(OUT + '/mobile', { recursive: true, force: true });
  await rm(OUT + '/admin', { recursive: true, force: true });
  for (const d of ['desktop', 'mobile', 'admin']) await mkdir(join(OUT, d), { recursive: true });

  const browser = await chromium.launch();

  console.log('Desktop (1440×900 viewport):');
  const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const dp = await d.newPage();
  for (const [p, f, y] of DESKTOP) await shoot(dp, p, f, y);
  for (const [p, f] of ADMIN_PUBLIC) await shoot(dp, p, f);
  await d.close();

  console.log('Mobile (390×844 viewport):');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  for (const [p, f] of MOBILE) await shoot(mp, p, f);
  await m.close();

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    console.log('Admin (authenticated, 1440×900 viewport):');
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const ap = await a.newPage();
    try {
      await ap.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
      await ap.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
      await ap.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
      await ap.click('button[type="submit"]');
      await ap.waitForURL('**/admin**', { timeout: 15000 }).catch(() => {});
      await ap.waitForTimeout(2000);
      for (const [p, f] of ADMIN_AUTHED) await shoot(ap, p, f);
    } catch (e) {
      console.log('  admin login failed: ' + e.message);
    }
    await a.close();
  } else {
    console.log('Skipping authenticated admin shots (set SHOT_ADMIN_EMAIL + SHOT_ADMIN_PASSWORD).');
  }

  await browser.close();
  console.log('\nDone. All shots are uniform viewport frames in docs/screenshots/{desktop,mobile,admin}/');
}

main().catch((e) => { console.error(e); process.exit(1); });
