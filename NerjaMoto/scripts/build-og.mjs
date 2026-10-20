// Renders public/og-image.png (1200×630) and public/apple-touch-icon.png from the
// hero illustration and the favicon. Needs Chromium: node scripts/build-og.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const hero = readFileSync(new URL('../src/assets/media/hero.svg', import.meta.url)).toString('base64');
const icon = readFileSync(new URL('../public/favicon.svg', import.meta.url)).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<body style="margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:Georgia,serif">
  <img src="data:image/svg+xml;base64,${hero}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:60% 100%">
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(251,243,230,.92),rgba(251,243,230,.55) 45%,rgba(251,243,230,0) 62%)"></div>
  <div style="position:absolute;left:64px;top:70px;color:#123744">
    <div style="font:600 18px/1 sans-serif;letter-spacing:.2em;color:#0E5B73">NERJA · COSTA DEL SOL</div>
    <div style="font-size:84px;line-height:1;margin-top:22px;letter-spacing:-2px">Nerja Moto Rent</div>
    <div style="font-size:40px;font-style:italic;color:#0E5B73;margin-top:16px">Sin prisas. Sin límites.</div>
  </div></body>`);
await page.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${icon}" style="width:180px;height:180px"></body>`);
await page.screenshot({ path: new URL('../public/apple-touch-icon.png', import.meta.url).pathname });
await browser.close();
console.log('og-image.png and apple-touch-icon.png written');
