import { getConfig, saveConfig, checkPassword, readBody, send } from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const fresh = "fresh" in (req.query || {}) || /[?&]fresh/.test(req.url);
      const cfg = await getConfig();
      return send(res, 200, { config: cfg }, {
        "Cache-Control": fresh ? "no-store" : "public, s-maxage=15, stale-while-revalidate=300"
      });
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      if (!(await checkPassword(req.headers["x-admin-password"]))) return send(res, 401, { error: "Неверный пароль" });
      if (!body || typeof body.config !== "object") return send(res, 400, { error: "Нет данных" });
      const s = JSON.stringify(body.config);
      if (s.length > 500000) return send(res, 400, { error: "Слишком большой конфиг" });
      await saveConfig(body.config);
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: String(e.message || e) });
  }
}
