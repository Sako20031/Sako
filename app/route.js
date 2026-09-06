// The page markup lives in content/page.html (kept out of this file so the
// bundle stays tiny). We fetch it from this repo's raw GitHub content and
// cache it in memory per warm serverless instance.
const SOURCE_URL =
  'https://raw.githubusercontent.com/Sako20031/Sako/main/content/page.html';

let cached = null;
let cachedAt = 0;
const TTL_MS = 60 * 1000;

async function loadPage() {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  const res = await fetch(SOURCE_URL, { cache: 'no-store' });
  if (!res.ok) {
    if (cached) return cached; // serve stale rather than fail
    throw new Error('failed to fetch page source: ' + res.status);
  }
  cached = await res.text();
  cachedAt = now;
  return cached;
}

export async function GET() {
  try {
    const html = await loadPage();
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    return new Response('Site is warming up, please refresh in a moment.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
