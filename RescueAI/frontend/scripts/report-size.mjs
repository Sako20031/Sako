// Prints raw and gzip sizes of the built bundle; fails if the initial JS budget is exceeded.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dir = "dist/assets";
const BUDGET_INITIAL_JS_GZ = 60 * 1024;
const html = readFileSync("dist/index.html", "utf8");
const rows = readdirSync(dir).map((f) => {
  const buf = readFileSync(join(dir, f));
  return { f, raw: statSync(join(dir, f)).size, gz: gzipSync(buf).length, initial: html.includes(f) };
}).sort((a, b) => b.gz - a.gz);
let initial = 0;
for (const r of rows) {
  if (r.initial && r.f.endsWith(".js")) initial += r.gz;
  console.log(`${r.initial ? "*" : " "} ${r.f.padEnd(40)} ${(r.raw / 1024).toFixed(1).padStart(7)} KB  gz ${(r.gz / 1024).toFixed(1).padStart(6)} KB`);
}
console.log(`initial JS (gzip): ${(initial / 1024).toFixed(1)} KB, budget ${(BUDGET_INITIAL_JS_GZ / 1024).toFixed(0)} KB`);
if (initial > BUDGET_INITIAL_JS_GZ) { console.error("initial JS budget exceeded"); process.exit(1); }
