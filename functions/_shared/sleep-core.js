const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const SLEEP_METHODS = ["brazos", "cuna", "acunada"];

export function getAppTimeZone(env) {
  return env.APP_TIMEZONE || "Europe/Madrid";
}

export function normalizeMethod(text) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase();

  return SLEEP_METHODS.includes(normalized) ? normalized : null;
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function logError(event, error) {
  console.error(
    JSON.stringify({
      event,
      error: typeof error === "string" ? error : error && error.message ? error.message : String(error),
    }),
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("El cuerpo JSON no es válido.");
  }
}

export async function buildUserStatus(db, userId, timeZone) {
  const activeRecord = await getActiveRecord(db, userId);
  const recentRecords = await getRecentRecords(db, userId, 20);
  const todayKey = getLocalDateKey(new Date().toISOString(), timeZone);
  const todayRecords = recentRecords.filter((record) => getLocalDateKey(record.hora_intento, timeZone) === todayKey);
  const state = deriveAppState(activeRecord);

  const sleepDurations = todayRecords
    .filter((record) => record.hora_sueno_efectivo && record.hora_despertar)
    .map((record) => calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar));

  const latencies = todayRecords
    .filter((record) => record.hora_intento && record.hora_sueno_efectivo)
    .map((record) => calculateMillisecondsBetween(record.hora_intento, record.hora_sueno_efectivo));

  const sleepTodayMs = sleepDurations.reduce((sum, value) => sum + value, 0);
  const averageLatencyMs =
    latencies.length > 0 ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0;

  return {
    userId,
    state,
    stateLabel: getStateLabel(state),
    stateDescription: getStateDescription(state, activeRecord, timeZone),
    activeRecord: activeRecord ? sanitizeRecordWithDerived(activeRecord, timeZone) : null,
    summary: {
      attemptsToday: todayRecords.length,
      sleepTodayMs,
      sleepTodayLabel: formatDuration(sleepTodayMs),
      averageLatencyMs,
      averageLatencyLabel: latencies.length > 0 ? `${Math.round(averageLatencyMs / 60000)} min` : "0 min",
      lastRecordLabel: todayRecords[0]
        ? `${formatClock(todayRecords[0].hora_intento, timeZone)} · ${todayRecords[0].estado}`
        : null,
    },
    recentRecords: todayRecords.map((record) => sanitizeRecordWithDerived(record, timeZone)),
  };
}

export async function listRecentRecords(db, userId, limit = 30, timeZone = "Europe/Madrid") {
  const records = await getRecentRecords(db, userId, limit);
  return records.map((record) => sanitizeRecordWithDerived(record, timeZone));
}

export async function startAttempt(db, userId, { method }) {
  const activeRecord = await getActiveRecord(db, userId);
  if (activeRecord) {
    throw new Error("Ya existe un registro abierto para este perfil.");
  }

  const horaIntento = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO registros_sueno (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind("PENDIENTE_DORMIR", horaIntento, null, null, method || null, userId)
    .run();

  return { record: await getActiveRecord(db, userId) };
}

export async function markAsleep(db, userId, customIso = null) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord) {
    throw new Error("No hay ningún intento abierto para marcar como dormido.");
  }

  if (activeRecord.estado !== "PENDIENTE_DORMIR") {
    throw new Error("El registro actual ya estaba marcado como durmiendo.");
  }

  const horaSuenoEfectivo = customIso || new Date().toISOString();
  if (Date.parse(horaSuenoEfectivo) < Date.parse(activeRecord.hora_intento)) {
    throw new Error("La hora de sueño efectivo no puede ser anterior al intento.");
  }

  await db
    .prepare("UPDATE registros_sueno SET estado = ?, hora_sueno_efectivo = ?, actualizado_en = ? WHERE id = ?")
    .bind("DURMIENDO", horaSuenoEfectivo, new Date().toISOString(), activeRecord.id)
    .run();

  const record = await getRecordById(db, activeRecord.id, userId);
  return {
    record,
    latencyMinutes: calculateMinutesBetween(record.hora_intento, record.hora_sueno_efectivo),
  };
}

export async function markAwake(db, userId, customIso = null) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord) {
    throw new Error("No hay ninguna siesta abierta para cerrar.");
  }

  if (activeRecord.estado !== "DURMIENDO" || !activeRecord.hora_sueno_efectivo) {
    throw new Error("El registro abierto todavía no tiene hora de sueño efectivo.");
  }

  const horaDespertar = customIso || new Date().toISOString();
  if (Date.parse(horaDespertar) < Date.parse(activeRecord.hora_sueno_efectivo)) {
    throw new Error("La hora de despertar no puede ser anterior al inicio del sueño.");
  }

  await db
    .prepare("UPDATE registros_sueno SET estado = ?, hora_despertar = ?, actualizado_en = ? WHERE id = ?")
    .bind("FINALIZADO", horaDespertar, new Date().toISOString(), activeRecord.id)
    .run();

  const record = await getRecordById(db, activeRecord.id, userId);
  return {
    record,
    sleepDurationMs: calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar),
  };
}

export async function cancelAttempt(db, userId) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord || activeRecord.estado !== "PENDIENTE_DORMIR") {
    throw new Error("Solo se puede cancelar un intento que todavía no esté dormido.");
  }

  await db.prepare("DELETE FROM registros_sueno WHERE id = ?").bind(activeRecord.id).run();
}

export async function updateMethodForOpenOrLatestRecord(db, userId, method) {
  const targetRecord = (await getActiveRecord(db, userId)) || (await getLatestRecord(db, userId));
  if (!targetRecord) {
    throw new Error("No hay registros para actualizar el método.");
  }

  await db
    .prepare("UPDATE registros_sueno SET metodo = ?, actualizado_en = ? WHERE id = ?")
    .bind(method, new Date().toISOString(), targetRecord.id)
    .run();

  return { record: await getRecordById(db, targetRecord.id, userId) };
}

export async function createManualFinalizedRecord(db, payload) {
  const { userId, hora_intento, hora_sueno_efectivo, hora_despertar, method } = payload;
  const normalizedRecord = normalizeChronology({
    hora_intento,
    hora_sueno_efectivo,
    hora_despertar,
  });

  await db
    .prepare(
      "INSERT INTO registros_sueno (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      "FINALIZADO",
      normalizedRecord.hora_intento,
      normalizedRecord.hora_sueno_efectivo,
      normalizedRecord.hora_despertar,
      method || null,
      userId,
    )
    .run();

  return getLatestRecord(db, userId);
}

export async function updateRecordById(db, userId, recordId, patch) {
  const existing = await getRecordById(db, recordId, userId);
  if (!existing) {
    throw new Error("No existe ese registro.");
  }

  const nextRecord = normalizeEditedRecord({
    ...existing,
    ...patch,
  });
  nextRecord.estado = deriveRecordStatus(nextRecord);
  validateChronologyForStoredRecord(nextRecord);

  await db
    .prepare(
      "UPDATE registros_sueno SET estado = ?, hora_intento = ?, hora_sueno_efectivo = ?, hora_despertar = ?, metodo = ?, actualizado_en = ? WHERE id = ? AND user_id = ?",
    )
    .bind(
      nextRecord.estado,
      nextRecord.hora_intento,
      nextRecord.hora_sueno_efectivo || null,
      nextRecord.hora_despertar || null,
      nextRecord.metodo || null,
      new Date().toISOString(),
      nextRecord.id,
      nextRecord.user_id,
    )
    .run();

  return getRecordById(db, recordId, userId);
}

export async function getActiveRecord(db, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id, creado_en, actualizado_en FROM registros_sueno WHERE user_id = ? AND estado != ? ORDER BY id DESC LIMIT 1",
    )
    .bind(userId, "FINALIZADO")
    .first();
}

export async function getLatestRecord(db, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id, creado_en, actualizado_en FROM registros_sueno WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    )
    .bind(userId)
    .first();
}

export async function getRecentRecords(db, userId, limit) {
  const result = await db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id, creado_en, actualizado_en FROM registros_sueno WHERE user_id = ? ORDER BY id DESC LIMIT ?",
    )
    .bind(userId, limit)
    .all();

  return result.results || [];
}

export async function getRecordById(db, recordId, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id, creado_en, actualizado_en FROM registros_sueno WHERE id = ? AND user_id = ? LIMIT 1",
    )
    .bind(recordId, userId)
    .first();
}

export function deriveAppState(record) {
  if (!record) return "WAITING";
  if (record.estado === "PENDIENTE_DORMIR") return "TRYING";
  if (record.estado === "DURMIENDO") return "SLEEPING";
  return "WAITING";
}

export function deriveRecordStatus(record) {
  if (record.hora_sueno_efectivo && record.hora_despertar) return "FINALIZADO";
  if (record.hora_sueno_efectivo) return "DURMIENDO";
  return "PENDIENTE_DORMIR";
}

export function getStateLabel(state) {
  if (state === "TRYING") return "Intentando dormir";
  if (state === "SLEEPING") return "Durmiendo";
  return "En espera";
}

export function getStateDescription(state, activeRecord, timeZone) {
  if (state === "TRYING" && activeRecord) {
    return `Intento empezado a las ${formatClock(activeRecord.hora_intento, timeZone)}.`;
  }

  if (state === "SLEEPING" && activeRecord) {
    const latencyMinutes = activeRecord.hora_sueno_efectivo
      ? calculateMinutesBetween(activeRecord.hora_intento, activeRecord.hora_sueno_efectivo)
      : null;
    return latencyMinutes === null
      ? "La sesión está abierta y marcada como durmiendo."
      : `Durmiendo desde las ${formatClock(activeRecord.hora_sueno_efectivo, timeZone)}. Latencia: ${latencyMinutes} min.`;
  }

  return "Listo para iniciar un nuevo intento.";
}

export function parseTimeText(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function parseManualTimeFromDate(text, timeZone, referenceDate = new Date()) {
  const parsed = parseTimeText(text);
  if (!parsed) return null;

  const referenceParts = getDatePartsInTimeZone(referenceDate, timeZone);
  return makeTimeZoneIso(
    {
      year: referenceParts.year,
      month: referenceParts.month,
      day: referenceParts.day,
      hour: parsed.hour,
      minute: parsed.minute,
    },
    timeZone,
  );
}

export function parseManualTimeWithReference(text, timeZone, referenceIso) {
  const parsed = parseTimeText(text);
  if (!parsed) return null;

  const referenceParts = getDatePartsInTimeZone(new Date(referenceIso), timeZone);
  return makeTimeZoneIso(
    {
      year: referenceParts.year,
      month: referenceParts.month,
      day: referenceParts.day,
      hour: parsed.hour,
      minute: parsed.minute,
    },
    timeZone,
  );
}

export function normalizeChronology(times) {
  const normalized = {
    hora_intento: times.hora_intento,
    hora_sueno_efectivo: times.hora_sueno_efectivo,
    hora_despertar: times.hora_despertar,
  };

  if (normalized.hora_intento && normalized.hora_sueno_efectivo) {
    normalized.hora_sueno_efectivo = ensureAfter(normalized.hora_sueno_efectivo, normalized.hora_intento);
  }

  if (normalized.hora_despertar && normalized.hora_sueno_efectivo) {
    normalized.hora_despertar = ensureAfter(normalized.hora_despertar, normalized.hora_sueno_efectivo);
  } else if (normalized.hora_despertar && normalized.hora_intento) {
    normalized.hora_despertar = ensureAfter(normalized.hora_despertar, normalized.hora_intento);
  }

  validateChronologyForStoredRecord(normalized);
  return normalized;
}

export function normalizeEditedRecord(record) {
  return {
    ...record,
    ...normalizeChronology(record),
  };
}

export function ensureAfter(candidateIso, referenceIso) {
  let candidateTime = new Date(candidateIso).getTime();
  const referenceTime = new Date(referenceIso).getTime();
  while (candidateTime < referenceTime) {
    candidateTime += DAY_IN_MS;
  }
  return new Date(candidateTime).toISOString();
}

export function validateChronologyForStoredRecord(record) {
  if (!record.hora_intento) {
    throw new Error("Todo registro necesita hora de intento.");
  }
  if (record.hora_sueno_efectivo && Date.parse(record.hora_sueno_efectivo) < Date.parse(record.hora_intento)) {
    throw new Error("La hora de sueño efectivo no puede ser anterior al intento.");
  }
  if (record.hora_despertar) {
    const reference = record.hora_sueno_efectivo || record.hora_intento;
    if (Date.parse(record.hora_despertar) < Date.parse(reference)) {
      throw new Error("La hora de despertar no puede ser anterior al inicio del sueño.");
    }
  }
}

export function calculateMinutesBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000));
}

export function calculateMillisecondsBetween(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Date.parse(endIso) - Date.parse(startIso));
}

export function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.round(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatClock(isoString, timeZone) {
  if (!isoString) return "--:--";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoString));
}

export function getLocalDateKey(isoString, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoString));
}

export function getDatePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value),
    day: Number(parts.find((part) => part.type === "day").value),
    hour: Number(parts.find((part) => part.type === "hour").value),
    minute: Number(parts.find((part) => part.type === "minute").value),
    second: Number(parts.find((part) => part.type === "second").value),
  };
}

export function makeTimeZoneIso(parts, timeZone) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  let adjusted = utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  adjusted = utcGuess - getTimeZoneOffsetMs(new Date(adjusted), timeZone);
  return new Date(adjusted).toISOString();
}

export function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return utcEquivalent - date.getTime();
}

export function sanitizeRecord(record) {
  return {
    id: record.id,
    estado: record.estado,
    hora_intento: record.hora_intento,
    hora_sueno_efectivo: record.hora_sueno_efectivo,
    hora_despertar: record.hora_despertar,
    metodo: record.metodo,
    user_id: record.user_id,
    creado_en: record.creado_en,
    actualizado_en: record.actualizado_en,
  };
}

export function sanitizeRecordWithDerived(record, timeZone) {
  const sleepDurationMs =
    record.hora_sueno_efectivo && record.hora_despertar
      ? calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar)
      : 0;

  return {
    ...sanitizeRecord(record),
    startLabel: formatClock(record.hora_intento, timeZone),
    sleepLabel: formatClock(record.hora_sueno_efectivo, timeZone),
    wakeLabel: formatClock(record.hora_despertar, timeZone),
    latencyMinutes: calculateMinutesBetween(record.hora_intento, record.hora_sueno_efectivo),
    sleepDurationMs,
    sleepDurationLabel:
      record.hora_sueno_efectivo && record.hora_despertar ? formatDuration(sleepDurationMs) : null,
    dateKey: getLocalDateKey(record.hora_intento, timeZone),
  };
}

export function parseProfileUserId(input) {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("El identificador del perfil debe ser un número entero positivo.");
  }
  return value;
}

export function toProfilePayload(profile) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    userId: profile.user_id ?? profile.id,
    caregiverName: profile.caregiver_name,
    babyName: profile.baby_name,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export async function safeJson(request) {
  return readJson(request);
}

export async function parseJsonBody(request) {
  return readJson(request);
}

export function getRequestContext(context) {
  return {
    db: context.env.DB,
    timeZone: getAppTimeZone(context.env),
    env: context.env,
    request: context.request,
  };
}

export function ensureAppUserId(request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("user_id") || request.headers.get("x-app-user-id");
  if (!value) {
    return null;
  }

  try {
    return parseProfileUserId(value);
  } catch {
    return null;
  }
}

export async function getProfileByUserId(db, userId) {
  const profile = await db
    .prepare(
      `SELECT id, user_id, caregiver_name, baby_name, created_at, updated_at
       FROM perfiles_dispositivo
       WHERE user_id = ?
       LIMIT 1`,
    )
    .bind(userId)
    .first();

  return profile ? sanitizeProfile(profile) : null;
}

export function sanitizeProfile(profile) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    caregiver_name: profile.caregiver_name,
    baby_name: profile.baby_name,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

export function toStatusPayload(status, profile) {
  return {
    ...status,
    state_label: status.stateLabel,
    state_description: status.stateDescription,
    active_record: status.activeRecord,
    recent_records: status.recentRecords,
    summary: {
      ...status.summary,
      attempts_today: status.summary.attemptsToday,
      sleep_today_ms: status.summary.sleepTodayMs,
      sleep_today_minutes: Math.round(status.summary.sleepTodayMs / 60000),
      sleep_today_label: status.summary.sleepTodayLabel,
      average_latency_ms: status.summary.averageLatencyMs,
      average_latency_label: status.summary.averageLatencyLabel,
      last_record_label: status.summary.lastRecordLabel,
    },
    profile,
  };
}
