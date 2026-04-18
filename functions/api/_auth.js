export async function requireAuth(request, env) {
  const token = readToken(request);
  if (!token) return { ok: false, response: json({ error: "No autenticado" }, 401) };

  const { results } = await env.DB.prepare(
    `SELECT token, expires_at
     FROM auth_tokens
     WHERE token = ?
     LIMIT 1`
  )
    .bind(token)
    .all();

  const row = results?.[0];
  if (!row) return { ok: false, response: json({ error: "Token inválido" }, 401) };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM auth_tokens WHERE token = ?").bind(token).run();
    return { ok: false, response: json({ error: "Sesión expirada" }, 401) };
  }

  return { ok: true, token };
}

export function readToken(request) {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-auth-token") || "";
}

export async function hashPin(pin) {
  const bytes = new TextEncoder().encode(pin);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
