/**
 * scripts/capture-screenshots.mjs
 *
 * Captures REAL screenshots of the live app with headless Chromium (Playwright)
 * and writes them to docs/screenshots/{desktop,mobile}/. No mockups, no
 * placeholders — actual rendered pages.
 *
 * Run:  node scripts/capture-screenshots.mjs
 *
 * Admin pages require a login; credentials come from env (never hard-coded):
 *   SHOT_ADMIN_EMAIL, SHOT_ADMIN_PASSWORD
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE = process.env.SHOT_BASE_URL || 'https://ambica-medical.vercel.app';
const ADMIN_EMAIL = process.env.SHOT_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.SHOT_ADMIN_PASSWORD || '';

const OUT = 'docs/screenshots';
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const PUBLIC_DESKTOP = [
  ['/', 'storefront-home.png', true],
  ['/products', 'catalog.png', true],
  ['/products/p001', 'product-detail.png', false],
  ['/prescription', 'prescription-upload.png', false],
  ['/admin/login', 'login.png', false],
];
const PUBLIC_MOBILE = [
  ['/', 'home.png', true],
  ['/products', 'catalog.png', true],
];
const ADMIN_DESKTOP = [
  ['/admin', 'admin-dashboard.png', true],
  ['/admin/customers', 'admin-customers.png', true],
  ['/admin/medicine-images', 'admin-medicine-images.png', true],
];

async function shoot(page, path, file, dir, fullPage) {
  const url = BASE + path;
  process.stdout.write(`  ${dir}/${file}  ← ${url} … `);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Let images / fonts settle.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, dir, file), fullPage });
    console.log('ok');
  } catch (e) {
    console.log('FAILED: ' + e.message);
  }
}

async function main() {
  await mkdir(join(OUT, 'desktop'), { recursive: true });
  await mkdir(join(OUT, 'mobile'), { recursive: true });

  const browser = await chromium.launch();

  // ---- Public desktop ----
  console.log('Desktop (public):');
  const dctx = await browser.newContext({ viewport: { width: DESKTOP.width, height: DESKTOP.height }, deviceScaleFactor: DESKTOP.deviceScaleFactor });
  const dpage = await dctx.newPage();
  for (const [path, file, full] of PUBLIC_DESKTOP) await shoot(dpage, path, file, 'desktop', full);
  await dctx.close();

  // ---- Public mobile ----
  console.log('Mobile (public):');
  const mctx = await browser.newContext({ viewport: { width: MOBILE.width, height: MOBILE.height }, deviceScaleFactor: MOBILE.deviceScaleFactor, isMobile: true, hasTouch: true });
  const mpage = await mctx.newPage();
  for (const [path, file, full] of PUBLIC_MOBILE) await shoot(mpage, path, file, 'mobile', full);
  await mctx.close();

  // ---- Admin (needs login) ----
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    console.log('Desktop (admin, authenticated):');
    const actx = await browser.newContext({ viewport: { width: DESKTOP.width, height: DESKTOP.height }, deviceScaleFactor: DESKTOP.deviceScaleFactor });
    const apage = await actx.newPage();
    try {
      await apage.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
      // Fill the login form — match by input type/name.
      await apage.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
      await apage.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
      await apage.click('button[type="submit"]');
      await apage.waitForURL('**/admin**', { timeout: 15000 }).catch(() => {});
      await apage.waitForTimeout(2000);
      for (const [path, file, full] of ADMIN_DESKTOP) await shoot(apage, path, file, 'desktop', full);
    } catch (e) {
      console.log('  admin login failed: ' + e.message);
    }
    await actx.close();
  } else {
    console.log('Skipping admin shots — set SHOT_ADMIN_EMAIL + SHOT_ADMIN_PASSWORD to include them.');
  }

  await browser.close();
  console.log('\nDone. Raw PNGs in docs/screenshots/{desktop,mobile}/');
}

main().catch((e) => { console.error(e); process.exit(1); });
