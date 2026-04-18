import { hashPin, json } from "./_auth";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const pin = String(body?.pin || "");
  if (!pin) return json({ error: "PIN requerido" }, 400);

  const { results } = await env.DB.prepare("SELECT pin_hash FROM app_config WHERE id = 1 LIMIT 1").all();
  const cfg = results?.[0];
  if (!cfg) return json({ error: "App no configurada" }, 400);

  const pinHash = await hashPin(pin);
  if (pinHash !== cfg.pin_hash) return json({ error: "PIN incorrecto" }, 401);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  await env.DB.prepare("INSERT INTO auth_tokens (token, expires_at, created_at) VALUES (?, ?, ?)")
    .bind(token, expiresAt, new Date().toISOString())
    .run();

  return json({ ok: true, token, expires_at: expiresAt });
}
