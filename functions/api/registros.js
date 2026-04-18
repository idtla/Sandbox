import { json, requireAuth } from "./_auth";

const ESTADOS = ["PENDIENTE_DORMIR", "DURMIENDO", "FINALIZADO"];
const METODOS = ["brazos", "cuna", "acunada", null, ""];

export async function onRequest(context) {
  if (context.request.method === "GET") return handleGet(context);
  if (context.request.method === "POST") return handlePost(context);
  return json({ error: "Método no permitido" }, 405);
}

async function handleGet({ request, env }) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");

  const { results } = await env.DB.prepare(
    `SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id
     FROM registros_sueno
     WHERE (? IS NULL OR user_id = ?)
     ORDER BY hora_intento DESC
     LIMIT 30`
  )
    .bind(userId, userId)
    .all();

  return json({ data: results || [] });
}

async function handlePost({ request, env }) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { user_id, estado = "FINALIZADO", hora_intento, hora_sueno_efectivo, hora_despertar, metodo = null } = body;
  const userId = normalizeUser(user_id);

  if (!userId || !hora_intento || !ESTADOS.includes(estado) || !METODOS.includes(metodo)) {
    return json({ error: "Campos manuales inválidos" }, 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO registros_sueno (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(estado, hora_intento, hora_sueno_efectivo || null, hora_despertar || null, metodo || null, userId)
    .run();

  return json({ ok: true, id: result.meta?.last_row_id ?? null }, 201);
}

function normalizeUser(userId) {
  if (!userId) return null;
  const v = String(userId).toUpperCase();
  return v === "PAPA" || v === "MAMA" ? v : null;
}
