// Renders public/apple-touch-icon.png from the favicon. Needs Chromium: node scripts/build-icon.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const icon = readFileSync(new URL('../public/favicon.svg', import.meta.url)).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${icon}" style="width:180px;height:180px"></body>`);
await page.screenshot({ path: new URL('../public/apple-touch-icon.png', import.meta.url).pathname });
await browser.close();
console.log('apple-touch-icon.png written');
