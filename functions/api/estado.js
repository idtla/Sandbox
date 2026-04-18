import { json, requireAuth } from "./_auth";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);

  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const userId = normalizeUser(url.searchParams.get("user_id"));
  if (!userId) return json({ error: "user_id inválido" }, 400);

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM registros_sueno
     WHERE user_id = ?
       AND estado IN ('PENDIENTE_DORMIR', 'DURMIENDO')
     ORDER BY id DESC
     LIMIT 1`
  )
    .bind(userId)
    .all();

  return json({ activo: results?.[0] || null });
}

function normalizeUser(userId) {
  if (!userId) return null;
  const v = String(userId).toUpperCase();
  return v === "PAPA" || v === "MAMA" ? v : null;
}
