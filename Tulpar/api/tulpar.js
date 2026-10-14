import { handle } from '../server/handler.js';

// Vercel serverless entry. Vercel parses the JSON body and query for us.
export default async function handler(req, res) {
  const out = await handle({
    method: req.method,
    query: req.query || {},
    body: req.body,
    headers: req.headers,
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress,
  });
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.status(out.status).send(out.body);
}
