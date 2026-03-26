/**
 * Reads docs/*.html for assets/guides/*.png, captures matching screenshots via Playwright.
 * Requires loop-live-hub-front (3000) and API stub (4010). Optional: .env with LOOP_LIVE_HUB_* for login.
 * Uses POST http://localhost:4010/api/stub/capture/instance-status to toggle STOPPED ↔ LIVE_AVAILABLE for guide2 shots.
 * Override stub base with CAPTURE_STUB_URL if PORT is not 4010.
 * Set CAPTURE_MOBILE=1 to save into docs/assets/guides/mobile.
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDES_ROOT = path.join(__dirname, '..');
const IS_MOBILE_CAPTURE = process.env.CAPTURE_MOBILE === '1';
const OUT_DIR = IS_MOBILE_CAPTURE
  ? path.join(GUIDES_ROOT, 'docs', 'assets', 'guides', 'mobile')
  : path.join(GUIDES_ROOT, 'docs', 'assets', 'guides');
const GUIDE_HTMLS = [
  path.join(GUIDES_ROOT, 'docs', 'index.html'),
  path.join(GUIDES_ROOT, 'docs', 'admin.html'),
  path.join(GUIDES_ROOT, 'docs', 'user.html'),
];
const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:3000';
const STUB_API = process.env.CAPTURE_STUB_URL || 'http://localhost:4010';
const MOCK_INSTANCE = 'i-mockstub001';
const SIGNUP_GROUP = 'abcdef';

dotenv.config({ path: path.join(GUIDES_ROOT, '.env') });

const MINI_PNG = path.join(GUIDES_ROOT, 'scripts', '.capture-temp.png');

function ensureMiniPng() {
  const buf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(MINI_PNG, buf);
}

function listPngsFromHtml(pathname) {
  if (!fs.existsSync(pathname)) return [];
  const html = fs.readFileSync(pathname, 'utf8');
  const re = /assets\/guides\/([^"'>\s]+\.png)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].replace(/^mobile\//, '');
    if (name.includes('guide1-01-xxx')) continue;
    set.add(name);
  }
  return [...set].sort();
}

function listPngsFromGuides() {
  const set = new Set();
  for (const h of GUIDE_HTMLS) {
    for (const n of listPngsFromHtml(h)) set.add(n);
  }
  return [...set].sort();
}

function contextOptions(viewport) {
  if (!IS_MOBILE_CAPTURE) {
    return { viewport, locale: 'ja-JP' };
  }
  return {
    viewport: { width: 390, height: 844 },
    locale: 'ja-JP',
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  };
}

async function shot(page, filename) {
  const fp = path.join(OUT_DIR, filename);
  await page.screenshot({ path: fp, fullPage: true });
  return fp;
}

async function waitPortal(page) {
  await page.getByText('ポータルページ', { timeout: 120000 }).waitFor({ state: 'visible' });
}

async function setStubInstanceStatus(status) {
  const res = await fetch(`${STUB_API}/api/stub/capture/instance-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`stub POST /api/stub/capture/instance-status failed ${res.status}: ${text}`);
  }
}

async function tryLogin(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  if (await page.getByText('ポータルページ').isVisible().catch(() => false)) return true;

  const user = process.env.LOOP_LIVE_HUB_USER_ID?.trim();
  const pass = process.env.LOOP_LIVE_HUB_PASSWORD?.trim();
  if (!user || !pass) return false;

  const userInput = page.locator('input[name="username"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 20000 });
  await userInput.fill(user);
  await page.locator('input[name="password"]').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await waitPortal(page);
  return true;
}

async function signUpScreenshots(browser) {
  const skipped = [];
  const ctx = await browser.newContext(contextOptions({ width: 1280, height: 800 }));
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?group_id=${SIGNUP_GROUP}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const tabs = page.locator('[role="tab"]');
    if ((await tabs.count()) >= 2) await tabs.nth(1).click();
    await page.waitForTimeout(800);
    await shot(page, 'guide1-00-access-signup.png');

    const dialog = page.getByRole('dialog', { name: /利用規約/i });
    await dialog.waitFor({ state: 'visible', timeout: 15000 });

    const scrollBox = dialog.locator('.MuiDialogContent-root').first();
    await shot(page, 'guide1-01-terms-scroll.png');
    await scrollBox.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 2);
    });
    await page.waitForTimeout(400);
    await shot(page, 'guide1-02-agree-terms.png');
    await page.getByRole('button', { name: '同意する' }).click();

    await page.waitForTimeout(600);
    await shot(page, 'guide1-04-email-password.png');
    await shot(page, 'guide1-05-create-account.png');
  } catch (e) {
    for (const f of [
      'guide1-00-access-signup.png',
      'guide1-01-terms-scroll.png',
      'guide1-02-agree-terms.png',
      'guide1-04-email-password.png',
      'guide1-05-create-account.png',
    ]) {
      skipped.push({ file: f, reason: String(e.message || e) });
    }
  } finally {
    await ctx.close();
  }
  return skipped;
}

async function main() {
  ensureMiniPng();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pngList = listPngsFromGuides();
  const skipped = [];
  const saved = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  skipped.push(...(await signUpScreenshots(browser)));

  const ctx = await browser.newContext(contextOptions({ width: 1280, height: 900 }));
  const page = await ctx.newPage();

  const loggedIn = await tryLogin(page);
  if (!loggedIn) {
    for (const f of pngList) {
      if (/^guide1-0[0-5]/.test(f)) continue;
      skipped.push({
        file: f,
        reason: '未ログイン（.env に LOOP_LIVE_HUB_USER_ID / LOOP_LIVE_HUB_PASSWORD が無い、またはログイン失敗）',
      });
    }
  }

  if (loggedIn) {
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await waitPortal(page);
      await shot(page, 'guide1-06-user-mgmt.png');

      await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide1-07-user-card.png');
      await page.locator('text=一般ユーザーA').first().click().catch(async () => {
        await page.locator('[class*="MuiCard"]').nth(1).click();
      });
      await page.waitForTimeout(600);
      await shot(page, 'guide1-08-user-detail-edit.png');
      await page.getByRole('button', { name: '編集' }).click();
      await page.waitForTimeout(500);
      await shot(page, 'guide1-09-role.png');
      await shot(page, 'guide1-12-update-user.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await waitPortal(page);
      await shot(page, 'guide1-13-portal-features.png');
      await page.getByRole('button', { name: /配信を始める/ }).first().click().catch(() => {});
      await page.waitForTimeout(600);

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide1-18-dashboard.png');

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await waitPortal(page);
      await shot(page, 'guide2-01-start-streaming.png');

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await shot(page, 'guide2-02-enter-room.png');

      await setStubInstanceStatus('STOPPED');
      await page.goto(`${BASE}/streaming/${MOCK_INSTANCE}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      try {
        await shot(page, 'guide2-03-start-server.png');
        await page.getByRole('button', { name: '起動する' }).first().click();
        await page.waitForTimeout(500);
        await shot(page, 'guide2-04-confirm-start.png');
        await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});
      } catch (e) {
        skipped.push({ file: 'guide2-03-start-server.png', reason: String(e.message || e) });
        skipped.push({ file: 'guide2-04-confirm-start.png', reason: String(e.message || e) });
      } finally {
        try {
          await setStubInstanceStatus('LIVE_AVAILABLE');
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(1500);
        } catch (e2) {
          console.error('stub LIVE_AVAILABLE + reload failed:', e2);
        }
      }

      await shot(page, 'guide2-05-server-ready.png');
      await page.getByRole('button', { name: 'カメラに接続' }).click().catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, 'guide2-06-camera-connect.png');
      await shot(page, 'guide2-07-camera-select.png');
      await shot(page, 'guide2-08-nose-toggle.png');
      await shot(page, 'guide2-09-process-start.png');
      await page.getByRole('button', { name: '加工開始' }).click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide2-10-confirm-process.png');
      try {
        await page.getByRole('dialog').getByRole('button', { name: 'はい' }).click();
      } catch {
        await page.getByRole('button', { name: 'はい' }).click();
      }
      try {
        await page
          .getByRole('button', { name: /加工処理中|接続中/ })
          .first()
          .waitFor({ state: 'visible', timeout: 90_000 });
      } catch (_) {
        /* スタブ等では WHIP 失敗で加工処理中に至らない場合あり */
      }
      await page.waitForTimeout(600);
      await shot(page, 'guide2-11-processing.png');
      try {
        await page.getByRole('button', { name: '加工停止' }).first().waitFor({ state: 'visible', timeout: 120_000 });
      } catch (_) {}
      await page.waitForTimeout(600);
      await shot(page, 'guide2-11-process-running.png');
      await shot(page, 'guide2-12-preview-output.png');
      await shot(page, 'guide2-13-process-stop.png');
      await page.getByRole('button', { name: '停止する' }).first().click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide2-14-stop-server.png');
      await shot(page, 'guide2-15-confirm-stop.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await shot(page, 'guide2-16-obs-ws-password.png');
      await shot(page, 'guide2-17-obs-add-source.png');

      await page.goto(`${BASE}/photo-face-swap`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const files = page.locator('input[type="file"]');
      if ((await files.count()) >= 1) {
        await files.nth(0).setInputFiles(MINI_PNG);
        await page.waitForTimeout(500);
        await shot(page, 'guide3-01-face-a.png');
      } else skipped.push({ file: 'guide3-01-face-a.png', reason: 'ファイル入力が見つからない' });
      if ((await files.count()) >= 2) {
        await files.nth(1).setInputFiles(MINI_PNG);
        await page.waitForTimeout(400);
        await shot(page, 'guide3-02-face-b.png');
      } else skipped.push({ file: 'guide3-02-face-b.png', reason: '2つ目のファイル入力なし' });

      await page.waitForTimeout(300);
      await shot(page, 'guide3-04-swap-start.png');
      await page.getByRole('button', { name: /フェイススワップする/ }).click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide3-05-confirm.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});
      await shot(page, 'guide3-06-history-pending.png');
      await shot(page, 'guide3-07-history-done.png');
      await shot(page, 'guide3-08-download.png');

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await shot(page, 'guide4-01-billing-link.png');
      await page.goto(`${BASE}/usage-billing`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide4-03-total-hours.png');
      await shot(page, 'guide4-05-row-click.png');
      await page.locator('table tbody tr').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await shot(page, 'guide4-06-history-dialog.png');
      await page.getByRole('button', { name: '閉じる' }).click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide4-08-photo-count.png');

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await shot(page, 'guide4-09-user-mgmt-link.png');
      await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await shot(page, 'guide4-10-search.png');
      await shot(page, 'guide4-11-user-card.png');
      await page.locator('text=一般ユーザーA').first().click().catch(() => page.locator('[class*="MuiCard"]').nth(1).click());
      await page.waitForTimeout(500);
      await shot(page, 'guide4-12-edit-user.png');
      await page.getByRole('button', { name: '編集' }).click();
      await page.waitForTimeout(500);
      await shot(page, 'guide4-13-name-email.png');
      await shot(page, 'guide4-14-password.png');
      await shot(page, 'guide4-15-role.png');
      await shot(page, 'guide4-18-update.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.locator('text=一般ユーザーA').first().click().catch(() => {});
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: '削除' }).click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide4-19-delete.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});
    } catch (e) {
      skipped.push({ file: '(batch)', reason: String(e.message || e) });
    }
  }

  await ctx.close();
  await browser.close();

  if (fs.existsSync(MINI_PNG)) fs.unlinkSync(MINI_PNG);

  for (const n of pngList) {
    if (fs.existsSync(path.join(OUT_DIR, n))) saved.push(n);
  }
  const missing = pngList.filter((n) => !saved.includes(n));

  console.log(JSON.stringify({ saved: saved.length, skipped: skipped.length, missing: missing.length }, null, 2));
  for (const s of skipped) console.error('SKIP', s.file, s.reason);
  for (const m of missing) {
    if (!skipped.some((x) => x.file === m)) console.error('MISSING', m);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
