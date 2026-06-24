import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

await page.goto('http://localhost:3000/');
await page.waitForLoadState('networkidle');

// Fill and click
await page.locator('input[type="text"]').fill('Интегралы');
await page.locator('button').first().click();

console.log('=== After click: loading screen ===');
await page.waitForTimeout(500);
console.log(await page.locator('body').innerText());

// Wait for questions to appear (up to 15s)
console.log('\n=== Waiting for questions... ===');
try {
  await page.waitForSelector('textarea', { timeout: 15000 });
  console.log('✅ Questions appeared!');
  console.log(await page.locator('body').innerText());
} catch(e) {
  console.log('❌ Questions never appeared after 15s');
  console.log('Current body:', await page.locator('body').innerText());
}

if (errors.length) console.log('\nJS Errors:', errors);
await browser.close();
