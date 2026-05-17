const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  const errors = [];

  page.on('pageerror', error => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });

  const url = pathToFileURL(path.join(process.cwd(), 'index.html')).href;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await browser.close();

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('OK: smoke test loaded index.html without browser errors');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
