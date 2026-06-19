const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5174/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/Users/Admin/AppData/Local/Temp/login2.png', fullPage: true });
  console.log('login done');

  const bodyText = await page.textContent('body');
  console.log('body text:', bodyText.slice(0, 300));

  await browser.close();
})();
