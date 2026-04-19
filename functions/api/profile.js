import {
  jsonResponse,
  parseJsonBody,
  toProfilePayload,
} from "../_shared/sleep-core.js";

export async function onRequestPost(context) {
  let body;
  try {
    body = await parseJsonBody(context.request);
  } catch (e) {
    return jsonResponse({ ok: false, error: e.message || "JSON no válido." }, 400);
  }

  const caregiverName = String(body.caregiver_name || body.caregiverName || "").trim();
  const babyName = String(body.baby_name || body.babyName || "").trim();
  const existingUserId = parseOptionalUserId(body.user_id ?? body.userId);

  if (!caregiverName || !babyName) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas indicar el nombre del cuidador y del bebé.",
      },
      400,
    );
  }

  const db = context.env.DB;
  const now = new Date().toISOString();

  try {
    if (existingUserId != null) {
      const updated = await db
        .prepare(
          `UPDATE perfiles_dispositivo
           SET caregiver_name = ?, baby_name = ?, updated_at = ?
           WHERE user_id = ?`,
        )
        .bind(caregiverName, babyName, now, existingUserId)
        .run();

      if (updated.meta?.changes > 0) {
        const profile = await db
          .prepare(
            `SELECT id, user_id, caregiver_name, baby_name, created_at, updated_at
             FROM perfiles_dispositivo
             WHERE user_id = ?
             LIMIT 1`,
          )
          .bind(existingUserId)
          .first();

        return jsonResponse({
          ok: true,
          profile: toProfilePayload(profile),
        });
      }
    }

    const maxRow = await db
      .prepare(`SELECT COALESCE(MAX(user_id), 0) AS max_uid FROM perfiles_dispositivo`)
      .first();
    const nextUserId = Number(maxRow?.max_uid ?? 0) + 1;

    await db
      .prepare(
        `INSERT INTO perfiles_dispositivo (
          user_id,
          caregiver_name,
          baby_name,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(nextUserId, caregiverName, babyName, now, now)
      .run();

    const profile = await db
      .prepare(
        `SELECT id, user_id, caregiver_name, baby_name, created_at, updated_at
         FROM perfiles_dispositivo
         WHERE user_id = ?
         LIMIT 1`,
      )
      .bind(nextUserId)
      .first();

    return jsonResponse({
      ok: true,
      profile: toProfilePayload(profile),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message || "No se ha podido guardar el perfil en la base de datos.",
      },
      500,
    );
  }
}

function parseOptionalUserId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}
