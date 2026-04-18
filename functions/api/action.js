import {
  buildUserStatus,
  cancelAttempt,
  createManualFinalizedRecord,
  formatDuration,
  getRequestContext,
  jsonResponse,
  markAsleep,
  markAwake,
  normalizeMethod,
  parseManualTimeFromDate,
  parseManualTimeWithReference,
  parseJsonBody,
  startAttempt,
  updateRecordById,
  getActiveRecord,
  updateMethodForOpenOrLatestRecord,
} from "../_shared/sleep-core.js";

export async function onRequestPost(context) {
  const body = await parseJsonBody(context.request);
  const ctx = getRequestContext(context);
  const userId = Number(body.user_id);
  const timeZone = body.timezone || ctx.timeZone;
  const action = String(body.action || "").trim();
  const method = normalizeMethod(body.method);

  if (!Number.isFinite(userId)) {
    return jsonResponse({ ok: false, error: "Falta user_id." }, 400);
  }

  try {
    switch (action) {
      case "start_attempt": {
        const result = await startAttempt(ctx.db, userId, { method });
        return jsonResponse({
          ok: true,
          result: {
            message: "Intento iniciado.",
            record: result.record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "mark_asleep": {
        const result = await markAsleep(ctx.db, userId);
        return jsonResponse({
          ok: true,
          result: {
            message: `Ha tardado ${result.latencyMinutes} min en dormirse.`,
            record: result.record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "mark_awake": {
        const result = await markAwake(ctx.db, userId);
        return jsonResponse({
          ok: true,
          message: `Sueño efectivo registrado: ${formatDuration(result.sleepDurationMs)}.`,
          result: {
            message: `Sueño efectivo registrado: ${formatDuration(result.sleepDurationMs)}.`,
            record: result.record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "cancel_attempt": {
        await cancelAttempt(ctx.db, userId);
        return jsonResponse({
          ok: true,
          message: "Intento cancelado.",
          result: {
            message: "Intento cancelado.",
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "update_method": {
        if (!method) {
          return jsonResponse({ ok: false, error: "Método no válido." }, 400);
        }

        const result = await updateMethodForOpenOrLatestRecord(ctx.db, userId, method);
        return jsonResponse({
          ok: true,
          message: `Método actualizado a ${method}.`,
          result: {
            message: `Método actualizado a ${method}.`,
            record: result.record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "create_manual_record": {
        const horaIntento = parseManualTimeFromDate(body.hora_intento, timeZone);
        if (!horaIntento) {
          return jsonResponse({ ok: false, error: "La hora de intento no es válida." }, 400);
        }

        const horaSueno = parseManualTimeWithReference(body.hora_sueno_efectivo, timeZone, horaIntento);
        if (!horaSueno) {
          return jsonResponse({ ok: false, error: "La hora de sueño efectivo no es válida." }, 400);
        }

        const horaDespertar = parseManualTimeWithReference(body.hora_despertar, timeZone, horaSueno);
        if (!horaDespertar) {
          return jsonResponse({ ok: false, error: "La hora de despertar no es válida." }, 400);
        }

        const record = await createManualFinalizedRecord(ctx.db, {
          userId,
          hora_intento: horaIntento,
          hora_sueno_efectivo: horaSueno,
          hora_despertar: horaDespertar,
          method,
        });

        return jsonResponse({
          ok: true,
          message: "Registro manual guardado.",
          result: {
            message: "Registro manual guardado.",
            record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "correct_sleep_start": {
        const activeRecord = await getActiveRecord(ctx.db, userId);
        if (!activeRecord || activeRecord.estado !== "DURMIENDO") {
          return jsonResponse(
            { ok: false, error: "No hay una sesión durmiendo para corregir." },
            400,
          );
        }

        const correctedSleepIso = parseManualTimeWithReference(
          body.hora_sueno_efectivo,
          timeZone,
          activeRecord.hora_intento,
        );

        if (!correctedSleepIso) {
          return jsonResponse({ ok: false, error: "La hora corregida no es válida." }, 400);
        }

        const record = await updateRecordById(ctx.db, userId, activeRecord.id, {
          hora_sueno_efectivo: correctedSleepIso,
        });

        return jsonResponse({
          ok: true,
          message: "Hora de inicio corregida.",
          result: {
            message: "Hora de inicio corregida.",
            record,
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      case "delete_open_record": {
        const activeRecord = await getActiveRecord(ctx.db, userId);
        if (!activeRecord) {
          return jsonResponse({ ok: false, error: "No hay registro abierto para borrar." }, 400);
        }

        await context.env.DB.prepare("DELETE FROM registros_sueno WHERE id = ? AND user_id = ?")
          .bind(activeRecord.id, userId)
          .run();

        return jsonResponse({
          ok: true,
          message: "Registro abierto eliminado.",
          result: {
            message: "Registro abierto eliminado.",
          },
          status: await buildUserStatus(ctx.db, userId, timeZone),
        });
      }
      default:
        return jsonResponse({ ok: false, error: "Acción no soportada." }, 400);
    }
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message || "No se ha podido completar la acción.",
      },
      400,
    );
  }
}
