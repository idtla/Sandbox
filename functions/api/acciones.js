import { json, requireAuth } from "./_auth";

const METODOS = ["brazos", "cuna", "acunada", null, ""];

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const auth = await requireAuth(request, env);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const accion = body?.accion;
  const userId = normalizeUser(body?.user_id);
  const metodo = body?.metodo ?? null;
  if (!userId) return json({ error: "user_id inválido" }, 400);

  const activo = await getActivo(env.DB, userId);

  if (accion === "iniciar") {
    if (activo) return json({ error: "Ya hay un intento activo" }, 400);
    await env.DB.prepare(
      `INSERT INTO registros_sueno (estado, hora_intento, metodo, user_id)
       VALUES ('PENDIENTE_DORMIR', ?, ?, ?)`
    )
      .bind(new Date().toISOString(), metodoValido(metodo), userId)
      .run();
    return json({ ok: true, mensaje: "Intento iniciado" });
  }

  if (accion === "dormido") {
    if (!activo || activo.estado !== "PENDIENTE_DORMIR") return json({ error: "No hay intento pendiente" }, 400);
    const ahora = new Date();
    await env.DB.prepare("UPDATE registros_sueno SET estado='DURMIENDO', hora_sueno_efectivo = ? WHERE id = ?")
      .bind(ahora.toISOString(), activo.id)
      .run();
    const latencia = diffMinutes(new Date(activo.hora_intento), ahora);
    return json({ ok: true, latencia_min: latencia, mensaje: `Ha tardado ${latencia} min en dormirse` });
  }

  if (accion === "despertar") {
    if (!activo || activo.estado !== "DURMIENDO") return json({ error: "No hay sueño activo" }, 400);
    const ahora = new Date();
    await env.DB.prepare("UPDATE registros_sueno SET estado='FINALIZADO', hora_despertar=? WHERE id=?")
      .bind(ahora.toISOString(), activo.id)
      .run();
    const total = diffMinutes(new Date(activo.hora_sueno_efectivo), ahora);
    return json({ ok: true, sueno_total_min: total, mensaje: `Duración total ${total} min` });
  }

  if (accion === "cancelar") {
    if (!activo) return json({ error: "No hay intento activo" }, 400);
    await env.DB.prepare("DELETE FROM registros_sueno WHERE id=?").bind(activo.id).run();
    return json({ ok: true, mensaje: "Intento cancelado" });
  }

  return json({ error: "Acción no soportada" }, 400);
}

async function getActivo(db, userId) {
  const { results } = await db.prepare(
    `SELECT * FROM registros_sueno
     WHERE user_id = ?
       AND estado IN ('PENDIENTE_DORMIR', 'DURMIENDO')
     ORDER BY id DESC LIMIT 1`
  )
    .bind(userId)
    .all();

  return results?.[0] || null;
}

function normalizeUser(userId) {
  if (!userId) return null;
  const v = String(userId).toUpperCase();
  return v === "PAPA" || v === "MAMA" ? v : null;
}

function metodoValido(m) {
  return METODOS.includes(m) ? m || null : null;
}

function diffMinutes(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
