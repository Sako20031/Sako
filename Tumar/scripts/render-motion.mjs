// Exports public/tumar-motion.html to MP4 frame by frame.
//   node scripts/render-motion.mjs [format] [lang] [fps]
//   format: story (1080x1920, default) | wide (1920x1080) | square (1080x1080)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const [format = 'story', lang = 'ru', fps = '30'] = process.argv.slice(2);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const page_ = `file://${root}/public/tumar-motion.html?render=1&format=${format}&lang=${lang}`;
const out = path.join(root, 'public/tumar-files', `tumar-motion-${format}${lang === 'ru' ? '' : '-' + lang}.mp4`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.goto(page_);
const { W, H, DURATION } = await page.evaluate(() => window.TUMAR_MOTION);
await page.setViewportSize({ width: W, height: H });
await page.evaluate(() => document.fonts.ready);

// The soundtrack (scripts/motion-sound.py) goes in when it is there.
const sound = path.join(root, 'public/tumar-files/tumar-motion-sound.mp3');
const audio = existsSync(sound) ? ['-i', sound, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : [];
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', fps, '-i', '-', ...audio,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });

const frames = Math.round(DURATION * Number(fps));
for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / Number(fps));
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('saved', out);
