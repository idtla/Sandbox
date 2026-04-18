import { buildUserStatus, getRequestContext, jsonResponse } from "../_shared/sleep-core.js";

export async function onRequestGet(context) {
  const ctx = getRequestContext(context);
  const url = new URL(context.request.url);
  const userId = Number(url.searchParams.get("user_id"));

  if (!Number.isFinite(userId)) {
    return jsonResponse({ ok: false, error: "Falta user_id." }, 400);
  }

  const status = await buildUserStatus(ctx.db, userId, ctx.timeZone);
  return jsonResponse({ ok: true, status });
}
