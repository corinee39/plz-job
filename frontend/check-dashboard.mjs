import { chromium } from './node_modules/playwright/index.js';

const browser = await chromium.launch();
const page = await browser.newPage();

// 로그인 페이지 (MSW 초기화 포함)
await page.goto('http://localhost:5174/login');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'C:/Users/Admin/AppData/Local/Temp/login2.png', fullPage: true });
console.log('login screenshot done');

// MSW 개발용 로그인 버튼 클릭
const devBtn = page.getByRole('button', { name: /개발용|dev|MSW/i });
if (await devBtn.isVisible()) {
  await devBtn.click();
  await page.waitForURL('**/dashboard**', { timeout: 5000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/Users/Admin/AppData/Local/Temp/dashboard2.png', fullPage: true });
  console.log('dashboard screenshot done');
} else {
  console.log('no dev login button found, checking page text');
  console.log(await page.textContent('body'));
}

await browser.close();
