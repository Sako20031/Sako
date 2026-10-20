// Generates the fallback scooter drawings in src/assets/media/*.svg (used only for a model without a photo).
// Run: node scripts/build-art.mjs  — replace any file with a real photo later
// (and update src/config/media.ts).
import { writeFileSync } from 'node:fs';
import { scooterGroup, scooterDefs } from './scooter.mjs';

const out = new URL('../src/assets/media/', import.meta.url);
const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>\n`;

/* ---------------------------------------------------------------- scooters */
for (const v of ['compact', 'touring', 'maxi']) {
  writeFileSync(new URL(`scooter-${v}.svg`, out), svg(480, 300, scooterGroup(v), scooterDefs(v)));
}

console.log('art written to src/assets/media');
