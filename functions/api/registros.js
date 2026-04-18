const ESTADOS = ["PENDIENTE_DORMIR", "DURMIENDO", "FINALIZADO"];
const METODOS = ["brazos", "cuna", "acunada"];

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "GET") {
    return handleGet(context);
  }

  if (request.method === "POST") {
    return handlePost(context);
  }

  return json({ error: "Método no permitido" }, 405);
}

async function handleGet({ request, env }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");

  if (!userId) {
    return json({ error: "user_id es obligatorio" }, 400);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id
     FROM registros_sueno
     WHERE user_id = ?
       AND (? IS NULL OR hora_intento >= ?)
       AND (? IS NULL OR hora_intento < ?)
     ORDER BY hora_intento DESC`
  )
    .bind(userId, desde, desde, hasta, hasta)
    .all();

  return json({ data: results || [] });
}

async function handlePost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const {
    user_id,
    estado = "FINALIZADO",
    hora_intento,
    hora_sueno_efectivo,
    hora_despertar,
    metodo = null,
  } = body;

  if (!user_id || !hora_intento) {
    return json({ error: "user_id y hora_intento son obligatorios" }, 400);
  }

  if (!ESTADOS.includes(estado)) {
    return json({ error: "estado no válido" }, 400);
  }

  if (metodo && !METODOS.includes(metodo)) {
    return json({ error: "metodo no válido" }, 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO registros_sueno
      (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(estado, hora_intento, hora_sueno_efectivo || null, hora_despertar || null, metodo, user_id)
    .run();

  return json({ ok: true, id: result.meta?.last_row_id ?? null }, 201);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
