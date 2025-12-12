import { chromium } from 'playwright';

(async () => {
  console.log('Starting simple browser test...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slow down operations for visibility
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:3000...');

  try {
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Page loaded!');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());

    // Wait to observe
    await page.waitForTimeout(10000);

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'test-simple.png' });

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  }

  console.log('Test complete - keeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);

  await browser.close();
})();
