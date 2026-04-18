export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return json({ error: "Método no permitido" }, 405);
  }

  const url = new URL(context.request.url);
  const userId = url.searchParams.get("user_id");
  const tz = url.searchParams.get("tz") || "Europe/Madrid";

  if (!userId) {
    return json({ error: "user_id es obligatorio" }, 400);
  }

  const start = startOfDayUtc(new Date(), tz);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const { results } = await context.env.DB.prepare(
    `SELECT hora_intento, hora_sueno_efectivo, hora_despertar
     FROM registros_sueno
     WHERE user_id = ?
       AND hora_intento >= ?
       AND hora_intento < ?`
  )
    .bind(userId, start.toISOString(), end.toISOString())
    .all();

  const rows = results || [];
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

  return json({
    fecha: start.toISOString(),
    registros: rows.length,
    latencia_media_min: latenciaN ? Math.round(latenciaTotal / latenciaN) : 0,
    sueno_total_min: suenoTotal,
  });
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
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
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

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
