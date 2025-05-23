const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const filePath = path.resolve('json_diff.html');
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: 'json_diff_report.pdf', format: 'A4', printBackground: true });
  await browser.close();
  console.log('✅ PDF saved as json_diff_report.pdf');
})();