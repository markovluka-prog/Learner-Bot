import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));

await page.goto('http://localhost:3000/');
await page.waitForLoadState('networkidle');

// Check what's on the page
const title = await page.title();
console.log('Page title:', title);

// Check button state before typing
const btnBefore = await page.locator('button').first().evaluate(el => ({
  text: el.textContent,
  disabled: el.disabled,
  type: el.type,
}));
console.log('Button before typing:', JSON.stringify(btnBefore));

// Type into input
await page.locator('input[type="text"]').fill('Интегралы');
await page.waitForTimeout(300);

// Check input value
const inputVal = await page.locator('input[type="text"]').inputValue();
console.log('Input value after fill:', inputVal);

// Check button state after typing
const btnAfter = await page.locator('button').first().evaluate(el => ({
  text: el.textContent,
  disabled: el.disabled,
  type: el.type,
}));
console.log('Button after typing:', JSON.stringify(btnAfter));

// Click the button
console.log('Clicking button...');
await page.locator('button').first().click();
await page.waitForTimeout(1000);

// Check what happened
const url = page.url();
const bodyText = await page.locator('body').innerText();
console.log('URL after click:', url);
console.log('Body text (first 300):', bodyText.slice(0, 300));

if (errors.length) console.log('JS Errors:', errors);

await browser.close();
