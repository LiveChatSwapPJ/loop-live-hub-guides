/**
 * Reads docs/index.html for assets/guides/*.png, captures matching screenshots via Playwright.
 * Requires loop-live-hub-front (3000) and API stub (4010). Optional: .env with LOOP_LIVE_HUB_* for login.
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUIDES_ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(GUIDES_ROOT, 'docs', 'assets', 'guides');
const INDEX_HTML = path.join(GUIDES_ROOT, 'docs', 'index.html');
const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:3000';
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

function listPngsFromIndex() {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const re = /assets\/guides\/([^"'>\s]+\.png)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1];
    if (name.includes('guide1-01-xxx')) continue;
    set.add(name);
  }
  return [...set].sort();
}

async function shot(page, filename) {
  const fp = path.join(OUT_DIR, filename);
  await page.screenshot({ path: fp, fullPage: true });
  return fp;
}

async function waitPortal(page) {
  await page.getByText('ポータルページ', { timeout: 120000 }).waitFor({ state: 'visible' });
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
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ja-JP',
  });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?group_id=${SIGNUP_GROUP}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const tabs = page.locator('[role="tab"]');
    if ((await tabs.count()) >= 2) await tabs.nth(1).click();
    await page.waitForTimeout(800);

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
    await shot(page, 'guide1-03-group-id.png');
    await shot(page, 'guide1-04-email-password.png');
    await shot(page, 'guide1-05-create-account.png');
  } catch (e) {
    for (const f of [
      'guide1-01-terms-scroll.png',
      'guide1-02-agree-terms.png',
      'guide1-03-group-id.png',
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
  const pngList = listPngsFromIndex();
  const skipped = [];
  const saved = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  skipped.push(...(await signUpScreenshots(browser)));

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ja-JP',
  });
  const page = await ctx.newPage();

  const loggedIn = await tryLogin(page);
  if (!loggedIn) {
    for (const f of pngList) {
      if (/^guide1-0[1-5]/.test(f)) continue;
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
      await shot(page, 'guide1-10-stream-accounts.png');
      await page.locator('label').filter({ hasText: 'ソース画像' }).scrollIntoViewIfNeeded().catch(() => {});
      await shot(page, 'guide1-11-source-image.png');
      await shot(page, 'guide1-12-update-user.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await shot(page, 'guide1-13-portal-features.png');
      await shot(page, 'guide1-14-server-master.png');

      await page.goto(`${BASE}/master/servers`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide1-15-register-server.png');
      await page.getByRole('button', { name: 'サーバー登録' }).click();
      await page.waitForTimeout(800);
      await page.getByLabel(/i-unregistered001|未登録EC2/).click().catch(async () => {
        await page.getByRole('radio').first().click();
      });
      await shot(page, 'guide1-16-server-step1.png');
      await page.getByRole('button', { name: '次へ' }).click();
      await page.waitForTimeout(600);
      await shot(page, 'guide1-17-server-step2.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide1-18-dashboard.png');

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await waitPortal(page);
      await shot(page, 'guide2-01-start-streaming.png');

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await shot(page, 'guide2-02-enter-room.png');

      await page.goto(`${BASE}/streaming/${MOCK_INSTANCE}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      const startBtns = page.getByRole('button', { name: '起動する' });
      const hasStart = (await startBtns.count()) > 0 && (await startBtns.first().isVisible().catch(() => false));

      if (hasStart) {
        await shot(page, 'guide2-03-start-server.png');
        await page.getByRole('button', { name: '起動する' }).first().click();
        await page.waitForTimeout(500);
        await shot(page, 'guide2-04-confirm-start.png');
        await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});
      } else {
        skipped.push({
          file: 'guide2-03-start-server.png',
          reason: 'スタブのサーバーは LIVE_AVAILABLE のため配信画面のサーバー状態欄に「起動する」は表示されない',
        });
        skipped.push({
          file: 'guide2-04-confirm-start.png',
          reason: '上記のため起動確認ダイアログを表示できない',
        });
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
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});
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

      await page.getByRole('button', { name: 'クリア' }).click().catch(() => {});
      await shot(page, 'guide3-03-clear.png');
      await files.nth(0).setInputFiles(MINI_PNG).catch(() => {});
      await files.nth(1).setInputFiles(MINI_PNG).catch(() => {});
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
      await shot(page, 'guide4-02-month-nav.png');
      await shot(page, 'guide4-03-total-hours.png');
      await shot(page, 'guide4-04-total-cost.png');
      await shot(page, 'guide4-05-row-click.png');
      await page.locator('table tbody tr').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await shot(page, 'guide4-06-history-dialog.png');
      await shot(page, 'guide4-07-close-history.png');
      await page.getByRole('button', { name: '閉じる' }).click().catch(() => {});
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
      await shot(page, 'guide4-16-stream-accounts.png');
      await shot(page, 'guide4-17-source-image.png');
      await shot(page, 'guide4-18-update.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.locator('text=一般ユーザーA').first().click().catch(() => {});
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: '削除' }).click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, 'guide4-19-delete.png');
      await shot(page, 'guide4-20-confirm-delete.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await shot(page, 'guide4-21-master-link.png');

      await page.goto(`${BASE}/master/servers`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await shot(page, 'guide4-22-register.png');
      await page.getByRole('button', { name: 'サーバー登録' }).click();
      await page.waitForTimeout(800);
      await page.getByLabel(/i-unregistered001|未登録EC2/).click().catch(async () => {
        await page.getByRole('radio').first().click();
      });
      await shot(page, 'guide4-23-step1.png');
      await page.getByRole('button', { name: '次へ' }).click();
      await page.waitForTimeout(600);
      await shot(page, 'guide4-24-step2.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.waitForTimeout(400);
      await page.locator('text=デモ用マネージドサーバー').first().click();
      await page.waitForTimeout(500);
      await shot(page, 'guide4-25-detail.png');
      await page.getByRole('button', { name: '編集' }).click();
      await page.waitForTimeout(400);
      await shot(page, 'guide4-26-edit-server.png');
      await page.getByRole('button', { name: 'キャンセル' }).click().catch(() => {});

      await page.locator('text=デモ用マネージドサーバー').first().click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: '削除' }).click();
      await page.waitForTimeout(400);
      await shot(page, 'guide4-27-delete-server.png');
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
