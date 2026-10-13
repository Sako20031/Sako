import { chromium } from 'playwright';
const [file, format, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>m.type()==='error'&&errs.push(m.text()));
await p.goto(`file://${file}?render=1&format=${format}`);
const {W,H}=await p.evaluate(()=>window.TUMAR_MOTION); await p.setViewportSize({width:W,height:H});
await p.evaluate(()=>document.fonts.ready);
for (const t of [1, 2.5, 4.2, 6.8, 8.8, 11.5]) { await p.evaluate(t=>renderAt(t), t); await p.screenshot({path:`${out}-${format}-${t}.png`}); }
console.log(errs.join('\n')||'no errors'); await b.close();
