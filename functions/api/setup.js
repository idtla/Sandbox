import { hashPin, json, requireAuth } from "./_auth";

export async function onRequest(context) {
  if (context.request.method === "GET") return handleGet(context);
  if (context.request.method === "POST") return handlePost(context);
  return json({ error: "Método no permitido" }, 405);
}

async function handleGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM app_config WHERE id = 1 LIMIT 1").all();
  const cfg = results?.[0];
  if (!cfg) return json({ configured: false });

  return json({
    configured: true,
    baby_name: cfg.baby_name,
    father_name: cfg.father_name,
    mother_name: cfg.mother_name,
    timezone: cfg.timezone,
  });
}

async function handlePost({ request, env }) {
  const existing = await env.DB.prepare("SELECT id FROM app_config WHERE id = 1 LIMIT 1").all();
  if (existing.results?.length) {
    const auth = await requireAuth(request, env);
    if (!auth.ok) return auth.response;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { father_name, mother_name, baby_name, timezone = "Europe/Madrid", pin } = body;
  if (!father_name || !mother_name || !baby_name || !pin || String(pin).length < 4) {
    return json({ error: "Datos incompletos. PIN mínimo de 4 caracteres." }, 400);
  }

  const pinHash = await hashPin(String(pin));

  await env.DB.prepare(
    `INSERT INTO app_config (id, father_name, mother_name, baby_name, timezone, pin_hash, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       father_name = excluded.father_name,
       mother_name = excluded.mother_name,
       baby_name = excluded.baby_name,
       timezone = excluded.timezone,
       pin_hash = excluded.pin_hash,
       updated_at = excluded.updated_at`
  )
    .bind(father_name, mother_name, baby_name, timezone, pinHash, new Date().toISOString(), new Date().toISOString())
    .run();

  return json({ ok: true });
}
