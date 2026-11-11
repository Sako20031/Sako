import { handleUpload } from "@vercel/blob/client";
import { checkPassword, readBody, send } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const body = await readBody(req);
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { password } = JSON.parse(clientPayload || "{}");
        if (!(await checkPassword(password))) throw new Error("Неверный пароль");
        if (!/^media\//.test(pathname)) throw new Error("Bad path");
        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {}
    });
    send(res, 200, json);
  } catch (e) {
    send(res, 400, { error: String(e.message || e) });
  }
}
