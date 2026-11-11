import { list, put, del } from "@vercel/blob";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString("utf8");
  return s ? JSON.parse(s) : {};
}

async function newest(prefix) {
  const { blobs } = await list({ prefix, limit: 1000 });
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return blobs;
}

export async function getConfig() {
  const blobs = await newest("config/");
  if (!blobs.length) return null;
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  return r.ok ? r.json() : null;
}

export async function saveConfig(cfg) {
  await put(`config/${Date.now()}.json`, JSON.stringify(cfg), {
    access: "public", contentType: "application/json", addRandomSuffix: true, cacheControlMaxAge: 31536000
  });
  const blobs = await newest("config/");
  const old = blobs.slice(20).map(b => b.url); // храним 20 последних версий
  if (old.length) await del(old);
}

// Пароль: сначала ищем сохранённый в кабинете (хэш), иначе — переменная ADMIN_PASSWORD
async function storedHash() {
  const blobs = await newest("auth/");
  if (!blobs.length) return null;
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  return r.ok ? r.json() : null;
}

export async function checkPassword(pw) {
  if (!pw || typeof pw !== "string") return false;
  const h = await storedHash();
  if (h && h.salt && h.hash) {
    const a = Buffer.from(h.hash, "hex"), b = scryptSync(pw, h.salt, 32);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const env = process.env.ADMIN_PASSWORD || "";
  return env.length > 0 && pw === env;
}

export async function setPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 32).toString("hex");
  const before = await newest("auth/");
  await put("auth/password.json", JSON.stringify({ salt, hash }), {
    access: "public", contentType: "application/json", addRandomSuffix: true
  });
  if (before.length) await del(before.map(b => b.url));
}

export function send(res, code, data, headers = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}
