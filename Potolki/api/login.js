import { checkPassword, setPassword, readBody, send } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const body = await readBody(req);
    if (!(await checkPassword(body.password))) return send(res, 401, { error: "Неверный пароль" });
    if (body.newPassword !== undefined) {
      if (typeof body.newPassword !== "string" || body.newPassword.length < 4) return send(res, 400, { error: "Пароль должен быть не короче 4 символов" });
      await setPassword(body.newPassword);
    }
    send(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: String(e.message || e) });
  }
}
