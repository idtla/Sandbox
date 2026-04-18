import { json, requireAuth } from "./_auth";

export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ error: "Método no permitido" }, 405);

  const auth = await requireAuth(context.request, context.env);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const tz = url.searchParams.get("tz") || "Europe/Madrid";

  const start = startOfDayUtc(new Date(), tz);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const { results } = await context.env.DB.prepare(
    `SELECT user_id, hora_intento, hora_sueno_efectivo, hora_despertar
     FROM registros_sueno
     WHERE hora_intento >= ?
       AND hora_intento < ?`
  )
    .bind(start.toISOString(), end.toISOString())
    .all();

  const rows = results || [];
  const total = resumen(rows);
  const papa = resumen(rows.filter(r => r.user_id === "PAPA"));
  const mama = resumen(rows.filter(r => r.user_id === "MAMA"));

  return json({
    fecha: start.toISOString(),
    total,
    papa,
    mama,
  });
}

function resumen(rows) {
  let latenciaTotal = 0;
  let latenciaN = 0;
  let suenoTotal = 0;

  for (const row of rows) {
    if (row.hora_intento && row.hora_sueno_efectivo) {
      latenciaTotal += diffMinutes(new Date(row.hora_intento), new Date(row.hora_sueno_efectivo));
      latenciaN += 1;
    }
    if (row.hora_sueno_efectivo && row.hora_despertar) {
      suenoTotal += diffMinutes(new Date(row.hora_sueno_efectivo), new Date(row.hora_despertar));
    }
  }

  return {
    registros: rows.length,
    latencia_media_min: latenciaN ? Math.round(latenciaTotal / latenciaN) : 0,
    sueno_total_min: suenoTotal,
  };
}

function diffMinutes(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function zonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function getOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(y, m, d, hh, mm, ss, timeZone) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  const offset = getOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

function startOfDayUtc(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return zonedDateTimeToUtc(p.year, p.month, p.day, 0, 0, 0, timeZone);
}
