import {
  jsonResponse,
  parseJsonBody,
  toProfilePayload,
} from "../_shared/sleep-core.js";

export async function onRequestPost(context) {
  const body = await parseJsonBody(context.request);
  const caregiverName = String(body.caregiver_name || body.caregiverName || "").trim();
  const babyName = String(body.baby_name || body.babyName || "").trim();

  if (!caregiverName || !babyName) {
    return jsonResponse(
      {
        ok: false,
        error: "Necesitas indicar el nombre del cuidador y del bebé.",
      },
      400,
    );
  }

  const now = new Date().toISOString();
  const result = await context.env.DB.prepare(
    `INSERT INTO perfiles_dispositivo (
      caregiver_name,
      baby_name,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?)`,
  )
    .bind(caregiverName, babyName, now, now)
    .run();

  const profile = await context.env.DB.prepare(
    `SELECT id, caregiver_name, baby_name, created_at, updated_at
     FROM perfiles_dispositivo
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(result.meta.last_row_id)
    .first();

  return jsonResponse({
    ok: true,
    profile: toProfilePayload(profile),
  });
}
