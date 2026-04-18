const TELEGRAM_API_BASE = "https://api.telegram.org";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const BOT_BUTTONS = {
  startAttempt: "🚀 Iniciar Intento",
  markAsleep: "💤 ¡Ya se durmió!",
  markAwake: "☀️ ¡Se despertó!",
  cancelAttempt: "❌ Cancelar Intento",
  manual: "📝 Manual/Editar",
  summary: "📊 Resumen hoy",
  correctSleepStart: "📝 Corregir hora inicio",
};

const FLOW_BUTTONS = {
  manualRecord: "➕ Registrar manual",
  editLast: "✏️ Editar último",
  back: "⬅️ Volver",
  cancel: "❌ Cancelar",
  editIntent: "🕒 Hora intento",
  editSleep: "😴 Hora sueño",
  editWake: "🌅 Hora despertar",
  editMethod: "🍼 Método",
};

const METHODS = ["brazos", "cuna", "acunada"];
const METHOD_LABELS = {
  brazos: "brazos",
  cuna: "cuna",
  acunada: "acunada",
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "POST" && url.pathname === "/telegram/webhook") {
        return handleTelegramWebhook(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/status") {
        return handleStatusApi(request, env, url);
      }

      if (request.method === "POST" && url.pathname === "/api/action") {
        return handleActionApi(request, env);
      }

      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse({
          ok: true,
          service: "baby-sleep-tracker-bot",
          timeZone: getAppTimeZone(env),
        });
      }

      if (request.method === "GET" && url.pathname === "/") {
        return renderDashboard(request, env, url);
      }

      return new Response("Ruta no encontrada", { status: 404 });
    } catch (error) {
      logError("worker_unhandled_error", error);
      return jsonResponse(
        {
          ok: false,
          error: "Se ha producido un error interno.",
        },
        500,
      );
    }
  },
};

async function handleTelegramWebhook(request, env) {
  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const headerName = env.WEBHOOK_SECRET_HEADER || "x-telegram-bot-api-secret-token";
    const providedSecret = request.headers.get(headerName);
    if (providedSecret !== expectedSecret) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const update = await request.json();
  await processTelegramUpdate(update, env);
  return jsonResponse({ ok: true });
}

async function handleStatusApi(request, env, url) {
  const userId = Number(url.searchParams.get("user_id"));
  if (!Number.isFinite(userId)) {
    return jsonResponse({ ok: false, error: "Falta user_id" }, 400);
  }

  const authError = validateWebAccess(env, url.searchParams.get("access_key"));
  if (authError) {
    return authError;
  }

  const status = await buildUserStatus(env.DB, userId, getAppTimeZone(env));
  return jsonResponse({ ok: true, status });
}

async function handleActionApi(request, env) {
  const body = await request.json();
  const userId = Number(body.user_id);

  if (!Number.isFinite(userId)) {
    return jsonResponse({ ok: false, error: "Falta user_id" }, 400);
  }

  const authError = validateWebAccess(env, body.access_key);
  if (authError) {
    return authError;
  }

  const action = String(body.action || "").trim();
  const method = normalizeMethod(body.method);
  const timeZone = getAppTimeZone(env);

  try {
    switch (action) {
      case "start_attempt": {
        const result = await startAttempt(env.DB, userId, { method });
        return jsonResponse({
          ok: true,
          result: {
            message: "Intento iniciado correctamente.",
            record: sanitizeRecord(result.record),
          },
          status: await buildUserStatus(env.DB, userId, timeZone),
        });
      }
      case "mark_asleep": {
        const result = await markAsleep(env.DB, userId);
        return jsonResponse({
          ok: true,
          result: {
            message: `Latencia registrada: ${result.latencyMinutes} min`,
            record: sanitizeRecord(result.record),
          },
          status: await buildUserStatus(env.DB, userId, timeZone),
        });
      }
      case "mark_awake": {
        const result = await markAwake(env.DB, userId);
        return jsonResponse({
          ok: true,
          result: {
            message: `Sueño efectivo registrado: ${formatDuration(result.sleepDurationMs)}`,
            record: sanitizeRecord(result.record),
          },
          status: await buildUserStatus(env.DB, userId, timeZone),
        });
      }
      case "cancel_attempt": {
        await cancelAttempt(env.DB, userId);
        return jsonResponse({
          ok: true,
          result: { message: "Intento cancelado." },
          status: await buildUserStatus(env.DB, userId, timeZone),
        });
      }
      case "update_method": {
        if (!method) {
          return jsonResponse({ ok: false, error: "Método no válido." }, 400);
        }
        const result = await updateMethodForOpenOrLatestRecord(env.DB, userId, method);
        return jsonResponse({
          ok: true,
          result: {
            message: `Método actualizado a ${method}.`,
            record: sanitizeRecord(result.record),
          },
          status: await buildUserStatus(env.DB, userId, timeZone),
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

async function renderDashboard(_request, env, url) {
  const initialUserId = url.searchParams.get("user_id") || "";
  const initialAccessKey = url.searchParams.get("access_key") || "";
  const accessKeyEnabled = Boolean(env.WEB_APP_ACCESS_KEY);
  const timeZone = getAppTimeZone(env);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Suenolytics</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f3f6fb;
        --panel: rgba(255, 255, 255, 0.92);
        --text: #172033;
        --muted: #5d6a85;
        --primary: #4f46e5;
        --primary-soft: rgba(79, 70, 229, 0.14);
        --danger: #dc2626;
        --success: #059669;
        --border: rgba(23, 32, 51, 0.1);
        --shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0b1220;
          --panel: rgba(15, 23, 42, 0.92);
          --text: #edf2ff;
          --muted: #98a5c2;
          --primary-soft: rgba(99, 102, 241, 0.2);
          --border: rgba(255, 255, 255, 0.08);
          --shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 30%),
          var(--bg);
        color: var(--text);
      }

      .shell {
        max-width: 520px;
        min-height: 100dvh;
        margin: 0 auto;
        padding: 16px 16px 120px;
      }

      .hero,
      .card,
      .sticky-bar {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 22px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .hero {
        padding: 20px;
        margin-bottom: 16px;
      }

      .title {
        margin: 0;
        font-size: 1.8rem;
      }

      .subtitle {
        margin: 8px 0 0;
        color: var(--muted);
        line-height: 1.45;
      }

      .stack {
        display: grid;
        gap: 14px;
      }

      .card {
        padding: 18px;
      }

      .label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.84rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .metric {
        margin: 14px 0 8px;
        font-size: clamp(2rem, 6vw, 3rem);
        font-weight: 800;
        line-height: 1;
      }

      .helper {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .grid-2 {
        display: grid;
        gap: 12px;
      }

      @media (min-width: 440px) {
        .grid-2 {
          grid-template-columns: 1fr 1fr;
        }
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field label {
        font-size: 0.92rem;
        color: var(--muted);
      }

      .field input,
      .field select,
      button {
        width: 100%;
        border-radius: 16px;
        border: 1px solid var(--border);
        padding: 14px 16px;
        font: inherit;
      }

      .field input,
      .field select {
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
      }

      button {
        cursor: pointer;
        background: var(--primary);
        color: white;
        font-weight: 700;
        transition: transform 0.12s ease, opacity 0.12s ease;
      }

      button.secondary {
        background: var(--primary-soft);
        color: var(--text);
      }

      button.danger {
        background: rgba(220, 38, 38, 0.14);
        color: var(--danger);
      }

      button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      button:active {
        transform: scale(0.985);
      }

      .row {
        display: flex;
        gap: 10px;
      }

      .row > * {
        flex: 1;
      }

      .sticky-wrap {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
        pointer-events: none;
      }

      .sticky-bar {
        max-width: 520px;
        margin: 0 auto;
        padding: 12px;
        pointer-events: auto;
      }

      .sticky-actions {
        display: grid;
        gap: 10px;
      }

      .badge {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 700;
        background: var(--primary-soft);
        color: var(--text);
      }

      .list {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .item {
        padding: 14px;
        border-radius: 16px;
        background: rgba(79, 70, 229, 0.07);
        border: 1px solid rgba(79, 70, 229, 0.12);
      }

      .item strong {
        display: block;
        margin-bottom: 4px;
      }

      .muted {
        color: var(--muted);
      }

      .hidden {
        display: none !important;
      }

      .notice {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(5, 150, 105, 0.1);
        color: var(--success);
      }

      .warning {
        background: rgba(217, 119, 6, 0.12);
        color: #d97706;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <span class="badge">Suenolytics · ${escapeHtml(timeZone)}</span>
        <h1 class="title">Seguimiento de sueño del bebé</h1>
        <p class="subtitle">
          Diseñado para móvil, con timer en vivo, acciones rápidas y registro
          persistido en D1. Ideal para tenerlo abierto en un Pixel 9 o cualquier
          pantalla vertical.
        </p>
      </section>

      <section class="card stack">
        <div class="grid-2">
          <div class="field">
            <label for="userId">Telegram user_id</label>
            <input id="userId" inputmode="numeric" placeholder="Ej. 123456789" value="${escapeHtml(initialUserId)}" />
          </div>
          <div class="field">
            <label for="method">Método por defecto</label>
            <select id="method">
              <option value="cuna">cuna</option>
              <option value="brazos">brazos</option>
              <option value="acunada">acunada</option>
            </select>
          </div>
        </div>
        <div class="field ${accessKeyEnabled ? "" : "hidden"}">
          <label for="accessKey">Clave web</label>
          <input id="accessKey" placeholder="Clave de acceso opcional" value="${escapeHtml(initialAccessKey)}" />
        </div>
        <div class="row">
          <button id="saveIdentity" class="secondary">Guardar y refrescar</button>
          <button id="openTelegram" class="secondary">Abrir Telegram</button>
        </div>
        <p class="helper">
          Si configuras <code>WEB_APP_ACCESS_KEY</code>, esta vista pedirá clave
          para proteger los endpoints web. El flujo manual guiado completo sigue
          disponible dentro del bot de Telegram.
        </p>
      </section>

      <section class="stack" id="dashboard">
        <article class="card">
          <span class="label">Estado actual</span>
          <div class="metric" id="stateMetric">Sin datos</div>
          <p class="helper" id="stateHelper">Introduce tu user_id para cargar el panel.</p>
          <div class="notice hidden" id="actionNotice"></div>
        </article>

        <article class="card">
          <span class="label">Timer activo</span>
          <div class="metric" id="timerMetric">--:--:--</div>
          <p class="helper" id="timerHelper">El contador se actualiza en tiempo real.</p>
        </article>

        <div class="grid-2">
          <article class="card">
            <span class="label">Sueño total hoy</span>
            <div class="metric" id="sleepTodayMetric">0 min</div>
            <p class="helper" id="sleepTodayHelper">Duración efectiva acumulada.</p>
          </article>

          <article class="card">
            <span class="label">Latencia media</span>
            <div class="metric" id="latencyMetric">0 min</div>
            <p class="helper" id="latencyHelper">Tiempo medio para dormirse.</p>
          </article>
        </div>

        <article class="card">
          <span class="label">Últimos registros</span>
          <div class="list" id="recordsList">
            <div class="item muted">Todavía no hay registros cargados.</div>
          </div>
        </article>
      </section>
    </main>

    <div class="sticky-wrap">
      <div class="sticky-bar">
        <div class="sticky-actions">
          <div class="row">
            <button id="startAction">🚀 Iniciar Intento</button>
            <button id="cancelAction" class="danger">❌ Cancelar</button>
          </div>
          <div class="row">
            <button id="asleepAction" class="secondary">💤 Ya se durmió</button>
            <button id="awakeAction" class="secondary">☀️ Se despertó</button>
          </div>
          <button id="methodAction" class="secondary">Actualizar método</button>
        </div>
      </div>
    </div>

    <script>
      const appState = {
        status: null,
        timerTick: null,
      };

      const refs = {
        userId: document.getElementById("userId"),
        method: document.getElementById("method"),
        accessKey: document.getElementById("accessKey"),
        saveIdentity: document.getElementById("saveIdentity"),
        openTelegram: document.getElementById("openTelegram"),
        stateMetric: document.getElementById("stateMetric"),
        stateHelper: document.getElementById("stateHelper"),
        timerMetric: document.getElementById("timerMetric"),
        timerHelper: document.getElementById("timerHelper"),
        sleepTodayMetric: document.getElementById("sleepTodayMetric"),
        latencyMetric: document.getElementById("latencyMetric"),
        recordsList: document.getElementById("recordsList"),
        actionNotice: document.getElementById("actionNotice"),
        startAction: document.getElementById("startAction"),
        cancelAction: document.getElementById("cancelAction"),
        asleepAction: document.getElementById("asleepAction"),
        awakeAction: document.getElementById("awakeAction"),
        methodAction: document.getElementById("methodAction"),
      };

      const storageKey = "suenolytics-web-config";

      init();

      function init() {
        const saved = loadConfig();
        if (saved.userId && !refs.userId.value) refs.userId.value = saved.userId;
        if (saved.accessKey && refs.accessKey) refs.accessKey.value = saved.accessKey;
        if (saved.method) refs.method.value = saved.method;

        refs.saveIdentity.addEventListener("click", async () => {
          persistConfig();
          await refreshStatus(true);
        });

        refs.openTelegram.addEventListener("click", () => {
          window.open("https://t.me", "_blank", "noopener");
        });

        refs.startAction.addEventListener("click", () => performAction("start_attempt"));
        refs.cancelAction.addEventListener("click", () => performAction("cancel_attempt"));
        refs.asleepAction.addEventListener("click", () => performAction("mark_asleep"));
        refs.awakeAction.addEventListener("click", () => performAction("mark_awake"));
        refs.methodAction.addEventListener("click", () => performAction("update_method"));

        refreshStatus(false);
        setInterval(renderLiveTimer, 1000);
      }

      function loadConfig() {
        try {
          return JSON.parse(localStorage.getItem(storageKey) || "{}");
        } catch {
          return {};
        }
      }

      function persistConfig() {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            userId: refs.userId.value.trim(),
            accessKey: refs.accessKey ? refs.accessKey.value.trim() : "",
            method: refs.method.value,
          }),
        );
      }

      function currentConfig() {
        return {
          userId: refs.userId.value.trim(),
          accessKey: refs.accessKey ? refs.accessKey.value.trim() : "",
          method: refs.method.value,
        };
      }

      async function refreshStatus(showNotice) {
        const config = currentConfig();
        if (!config.userId) {
          renderEmpty("Introduce tu user_id para empezar.");
          return;
        }

        const url = new URL("/api/status", window.location.origin);
        url.searchParams.set("user_id", config.userId);
        if (config.accessKey) {
          url.searchParams.set("access_key", config.accessKey);
        }

        try {
          const response = await fetch(url.toString());
          const payload = await response.json();
          if (!response.ok || !payload.ok) {
            throw new Error(payload.error || "No se pudo cargar el estado.");
          }

          appState.status = payload.status;
          renderStatus(payload.status);
          if (showNotice) {
            showActionNotice("Panel actualizado.");
          }
        } catch (error) {
          renderEmpty(error.message);
        }
      }

      async function performAction(action) {
        const config = currentConfig();
        if (!config.userId) {
          showActionNotice("Necesitas indicar un user_id.", true);
          return;
        }

        try {
          const response = await fetch("/api/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              user_id: Number(config.userId),
              access_key: config.accessKey,
              method: config.method,
            }),
          });

          const payload = await response.json();
          if (!response.ok || !payload.ok) {
            throw new Error(payload.error || "Acción no disponible.");
          }

          appState.status = payload.status;
          renderStatus(payload.status);
          showActionNotice(payload.result.message || "Acción completada.");
        } catch (error) {
          showActionNotice(error.message, true);
        }
      }

      function renderEmpty(message) {
        appState.status = null;
        refs.stateMetric.textContent = "Sin datos";
        refs.stateHelper.textContent = message;
        refs.timerMetric.textContent = "--:--:--";
        refs.timerHelper.textContent = "El contador aparecerá cuando haya un intento activo.";
        refs.sleepTodayMetric.textContent = "0 min";
        refs.latencyMetric.textContent = "0 min";
        refs.recordsList.innerHTML = '<div class="item muted">Todavía no hay registros cargados.</div>';
      }

      function renderStatus(status) {
        refs.stateMetric.textContent = status.stateLabel;
        refs.stateHelper.textContent = status.stateDescription;
        refs.sleepTodayMetric.textContent = status.summary.sleepTodayLabel;
        refs.latencyMetric.textContent = status.summary.averageLatencyLabel;
        refs.recordsList.innerHTML = status.recentRecords.length
          ? status.recentRecords
              .map((record) => {
                const latency = record.latencyMinutes === null ? "sin latencia" : record.latencyMinutes + " min";
                const duration = record.sleepDurationLabel || "sin cierre";
                const method = record.metodo || "sin método";
                return '<div class="item">' +
                  '<strong>' + escapeHtml(record.startLabel) + '</strong>' +
                  '<div class="muted">Estado: ' + escapeHtml(record.estado) + ' · Método: ' + escapeHtml(method) + '</div>' +
                  '<div class="muted">Latencia: ' + escapeHtml(latency) + ' · Sueño: ' + escapeHtml(duration) + '</div>' +
                '</div>';
              })
              .join("")
          : '<div class="item muted">Todavía no hay registros para hoy.</div>';

        toggleActionButtons(status.state);
        renderLiveTimer();
      }

      function toggleActionButtons(state) {
        refs.startAction.disabled = state !== "WAITING";
        refs.cancelAction.disabled = state !== "TRYING";
        refs.asleepAction.disabled = state !== "TRYING";
        refs.awakeAction.disabled = state !== "SLEEPING";
        refs.methodAction.disabled = state === "WAITING";
      }

      function renderLiveTimer() {
        const status = appState.status;
        if (!status || !status.activeRecord) {
          refs.timerMetric.textContent = "--:--:--";
          refs.timerHelper.textContent = "El contador aparecerá cuando haya un intento activo.";
          return;
        }

        const now = Date.now();
        if (status.state === "TRYING" && status.activeRecord.hora_intento) {
          const elapsed = now - Date.parse(status.activeRecord.hora_intento);
          refs.timerMetric.textContent = formatDurationSeconds(elapsed);
          refs.timerHelper.textContent = "Tiempo desde que empezó el intento.";
          return;
        }

        if (status.state === "SLEEPING" && status.activeRecord.hora_sueno_efectivo) {
          const elapsed = now - Date.parse(status.activeRecord.hora_sueno_efectivo);
          refs.timerMetric.textContent = formatDurationSeconds(elapsed);
          refs.timerHelper.textContent = "Tiempo de sueño efectivo en curso.";
          return;
        }

        refs.timerMetric.textContent = "--:--:--";
        refs.timerHelper.textContent = "No hay un temporizador activo.";
      }

      function formatDurationSeconds(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return hours + ":" + minutes + ":" + seconds;
      }

      function showActionNotice(message, isError) {
        refs.actionNotice.textContent = message;
        refs.actionNotice.classList.remove("hidden", "warning");
        if (isError) {
          refs.actionNotice.classList.add("warning");
        }
      }

      function escapeHtml(text) {
        return String(text)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function processTelegramUpdate(update, env) {
  const message = update.message || update.edited_message;
  if (!message || !message.text || !message.chat || !message.from) {
    return;
  }

  const text = String(message.text).trim();
  const chatId = message.chat.id;
  const userId = Number(message.from.id);
  const timeZone = getAppTimeZone(env);

  if (!Number.isFinite(userId)) {
    return;
  }

  const session = await getUserSession(env.DB, userId);
  if (session) {
    await handleSessionInput({ env, session, chatId, userId, text, timeZone });
    return;
  }

  const activeRecord = await getActiveRecord(env.DB, userId);
  const state = deriveAppState(activeRecord);

  if (text === "/start" || text === "/menu") {
    await sendTelegramMessage(env, chatId, buildWelcomeMessage(state), {
      reply_markup: buildKeyboardForState(state),
    });
    return;
  }

  if (text === BOT_BUTTONS.summary || text === "/resumen") {
    await sendDailySummary(env, chatId, userId, timeZone);
    return;
  }

  if (state === "WAITING") {
    await handleWaitingState({ env, chatId, userId, text, timeZone });
    return;
  }

  if (state === "TRYING") {
    await handleTryingState({ env, chatId, userId, text, timeZone, activeRecord });
    return;
  }

  await handleSleepingState({ env, chatId, userId, text, timeZone, activeRecord });
}

async function handleWaitingState({ env, chatId, userId, text, timeZone }) {
  if (text === BOT_BUTTONS.startAttempt) {
    try {
      const result = await startAttempt(env.DB, userId, {});
      await sendTelegramMessage(
        env,
        chatId,
        `Intento iniciado a las ${formatClock(result.record.hora_intento, timeZone)}.\n\n` +
          "Cuando se duerma, pulsa \"💤 ¡Ya se durmió!\".\n" +
          "Si quieres guardar el método, puedes escribir: brazos, cuna o acunada.",
        {
          reply_markup: buildKeyboardForState("TRYING"),
        },
      );
    } catch (error) {
      await sendTelegramMessage(env, chatId, error.message, {
        reply_markup: buildKeyboardForState("WAITING"),
      });
    }
    return;
  }

  if (text === BOT_BUTTONS.manual) {
    await saveUserSession(env.DB, userId, {
      flow: "MANUAL_MENU",
      step: "PICK_MODE",
      data: {},
    });
    await sendTelegramMessage(
      env,
      chatId,
      "¿Qué quieres hacer?\n\n- Registrar una siesta completa manualmente.\n- Editar el último registro guardado.",
      {
        reply_markup: buildManualMenuKeyboard(),
      },
    );
    return;
  }

  if (text === BOT_BUTTONS.markAwake) {
    await startManualRecordFlow(env.DB, userId, chatId, env, {
      intro:
        "No hay ninguna siesta abierta ahora mismo. Vamos a registrarla manualmente paso a paso.\n\n" +
        "Primero, ¿a qué hora empezó el intento? Responde en formato HH:MM.",
    });
    return;
  }

  if (normalizeMethod(text)) {
    await sendTelegramMessage(
      env,
      chatId,
      "No hay un registro abierto para asignar ese método. Pulsa \"🚀 Iniciar Intento\" o entra en \"📝 Manual/Editar\".",
      {
        reply_markup: buildKeyboardForState("WAITING"),
      },
    );
    return;
  }

  await sendTelegramMessage(env, chatId, buildWelcomeMessage("WAITING"), {
    reply_markup: buildKeyboardForState("WAITING"),
  });
}

async function handleTryingState({ env, chatId, userId, text, timeZone }) {
  if (text === BOT_BUTTONS.markAsleep) {
    try {
      const result = await markAsleep(env.DB, userId);
      await sendTelegramMessage(
        env,
        chatId,
        `¡Genial! Ha tardado ${result.latencyMinutes} min en dormirse.\n` +
          `Hora de sueño efectivo: ${formatClock(result.record.hora_sueno_efectivo, timeZone)}.`,
        {
          reply_markup: buildKeyboardForState("SLEEPING"),
        },
      );
    } catch (error) {
      await sendTelegramMessage(env, chatId, error.message, {
        reply_markup: buildKeyboardForState("TRYING"),
      });
    }
    return;
  }

  if (text === BOT_BUTTONS.cancelAttempt) {
    try {
      await cancelAttempt(env.DB, userId);
      await clearUserSession(env.DB, userId);
      await sendTelegramMessage(
        env,
        chatId,
        "Intento cancelado y borrado. Volvemos al estado inicial.",
        {
          reply_markup: buildKeyboardForState("WAITING"),
        },
      );
    } catch (error) {
      await sendTelegramMessage(env, chatId, error.message, {
        reply_markup: buildKeyboardForState("TRYING"),
      });
    }
    return;
  }

  const method = normalizeMethod(text);
  if (method) {
    const result = await updateMethodForOpenOrLatestRecord(env.DB, userId, method);
    await sendTelegramMessage(
      env,
      chatId,
      `Método actualizado a ${result.record.metodo}.`,
      {
        reply_markup: buildKeyboardForState("TRYING"),
      },
    );
    return;
  }

  if (text === BOT_BUTTONS.manual) {
    await sendTelegramMessage(
      env,
      chatId,
      "Ahora mismo hay un intento abierto. Si quieres rehacerlo, usa \"❌ Cancelar Intento\" o termina el proceso antes.",
      {
        reply_markup: buildKeyboardForState("TRYING"),
      },
    );
    return;
  }

  await sendTelegramMessage(
    env,
    chatId,
    "Sigo esperando a que se duerma. Puedes marcar \"💤 ¡Ya se durmió!\", cancelar el intento o escribir el método.",
    {
      reply_markup: buildKeyboardForState("TRYING"),
    },
  );
}

async function handleSleepingState({ env, chatId, userId, text, timeZone }) {
  if (text === BOT_BUTTONS.markAwake) {
    try {
      const result = await markAwake(env.DB, userId);
      await sendTelegramMessage(
        env,
        chatId,
        `Sesión cerrada.\n` +
          `Duración del sueño efectivo: ${formatDuration(result.sleepDurationMs)}.\n` +
          `Despertar: ${formatClock(result.record.hora_despertar, timeZone)}.`,
        {
          reply_markup: buildKeyboardForState("WAITING"),
        },
      );
    } catch (error) {
      await sendTelegramMessage(env, chatId, error.message, {
        reply_markup: buildKeyboardForState("SLEEPING"),
      });
    }
    return;
  }

  if (text === BOT_BUTTONS.correctSleepStart) {
    await saveUserSession(env.DB, userId, {
      flow: "CORRECT_SLEEP_START",
      step: "VALUE",
      data: {},
    });
    await sendTelegramMessage(
      env,
      chatId,
      "Indícame la hora correcta de inicio de sueño efectivo en formato HH:MM.",
      {
        reply_markup: buildCancelOnlyKeyboard(),
      },
    );
    return;
  }

  const method = normalizeMethod(text);
  if (method) {
    const result = await updateMethodForOpenOrLatestRecord(env.DB, userId, method);
    await sendTelegramMessage(
      env,
      chatId,
      `Método actualizado a ${result.record.metodo}.`,
      {
        reply_markup: buildKeyboardForState("SLEEPING"),
      },
    );
    return;
  }

  await sendTelegramMessage(
    env,
    chatId,
    "Ahora mismo la sesión está en curso. Marca el despertar cuando ocurra o corrige la hora de inicio si hace falta.",
    {
      reply_markup: buildKeyboardForState("SLEEPING"),
    },
  );
}

async function handleSessionInput({ env, session, chatId, userId, text, timeZone }) {
  if (text === FLOW_BUTTONS.cancel) {
    await clearUserSession(env.DB, userId);
    const activeRecord = await getActiveRecord(env.DB, userId);
    await sendTelegramMessage(
      env,
      chatId,
      "He cancelado el flujo manual.",
      {
        reply_markup: buildKeyboardForState(deriveAppState(activeRecord)),
      },
    );
    return;
  }

  if (session.flow === "MANUAL_MENU") {
    await handleManualMenuInput({ env, session, chatId, userId, text });
    return;
  }

  if (session.flow === "MANUAL_RECORD") {
    await handleManualRecordInput({ env, session, chatId, userId, text, timeZone });
    return;
  }

  if (session.flow === "EDIT_LAST") {
    await handleEditLastInput({ env, session, chatId, userId, text, timeZone });
    return;
  }

  if (session.flow === "CORRECT_SLEEP_START") {
    await handleCorrectSleepStartInput({ env, chatId, userId, text, timeZone });
    return;
  }

  await clearUserSession(env.DB, userId);
  await sendTelegramMessage(
    env,
    chatId,
    "El flujo anterior ya no era válido. Volvemos al menú principal.",
    {
      reply_markup: buildKeyboardForState("WAITING"),
    },
  );
}

async function handleManualMenuInput({ env, chatId, userId, text }) {
  if (text === FLOW_BUTTONS.back) {
    await clearUserSession(env.DB, userId);
    await sendTelegramMessage(
      env,
      chatId,
      "Volvemos al menú principal.",
      {
        reply_markup: buildKeyboardForState("WAITING"),
      },
    );
    return;
  }

  if (text === FLOW_BUTTONS.manualRecord) {
    await startManualRecordFlow(env.DB, userId, chatId, env, {
      intro: "Perfecto. ¿A qué hora empezó el intento? Responde en formato HH:MM.",
    });
    return;
  }

  if (text === FLOW_BUTTONS.editLast) {
    const latestRecord = await getLatestRecord(env.DB, userId);
    if (!latestRecord) {
      await startManualRecordFlow(env.DB, userId, chatId, env, {
        intro:
          "No hay registros previos para editar. Vamos a crear uno manualmente.\n\n" +
          "¿A qué hora empezó el intento? Responde en formato HH:MM.",
      });
      return;
    }

    await saveUserSession(env.DB, userId, {
      flow: "EDIT_LAST",
      step: "FIELD",
      data: { recordId: latestRecord.id },
    });

    await sendTelegramMessage(
      env,
      chatId,
      "¿Qué campo quieres editar del último registro?",
      {
        reply_markup: buildEditFieldKeyboard(),
      },
    );
    return;
  }

  await sendTelegramMessage(
    env,
    chatId,
    "No he entendido esa opción. Usa los botones para elegir entre registro manual o edición del último registro.",
    {
      reply_markup: buildManualMenuKeyboard(),
    },
  );
}

async function handleManualRecordInput({ env, session, chatId, userId, text, timeZone }) {
  const data = session.data || {};

  if (session.step === "INTENT_TIME") {
    const horaIntento = parseManualTimeFromToday(text, timeZone);
    if (!horaIntento) {
      await sendTelegramMessage(env, chatId, "Formato no válido. Responde con HH:MM, por ejemplo 21:35.", {
        reply_markup: buildCancelOnlyKeyboard(),
      });
      return;
    }

    await saveUserSession(env.DB, userId, {
      flow: "MANUAL_RECORD",
      step: "SLEEP_TIME",
      data: { ...data, hora_intento: horaIntento },
    });

    await sendTelegramMessage(
      env,
      chatId,
      "Perfecto. ¿A qué hora se durmió de verdad? Responde en HH:MM.",
      {
        reply_markup: buildCancelOnlyKeyboard(),
      },
    );
    return;
  }

  if (session.step === "SLEEP_TIME") {
    const horaSueno = parseManualTimeFromToday(text, timeZone);
    if (!horaSueno) {
      await sendTelegramMessage(env, chatId, "No reconozco esa hora. Usa HH:MM, por ejemplo 22:05.", {
        reply_markup: buildCancelOnlyKeyboard(),
      });
      return;
    }

    await saveUserSession(env.DB, userId, {
      flow: "MANUAL_RECORD",
      step: "WAKE_TIME",
      data: { ...data, hora_sueno_efectivo: horaSueno },
    });

    await sendTelegramMessage(
      env,
      chatId,
      "Genial. ¿A qué hora se despertó? Responde en HH:MM.",
      {
        reply_markup: buildCancelOnlyKeyboard(),
      },
    );
    return;
  }

  if (session.step === "WAKE_TIME") {
    const horaDespertar = parseManualTimeFromToday(text, timeZone);
    if (!horaDespertar) {
      await sendTelegramMessage(env, chatId, "No reconozco esa hora. Usa HH:MM.", {
        reply_markup: buildCancelOnlyKeyboard(),
      });
      return;
    }

    await saveUserSession(env.DB, userId, {
      flow: "MANUAL_RECORD",
      step: "METHOD",
      data: { ...data, hora_despertar: horaDespertar },
    });

    await sendTelegramMessage(
      env,
      chatId,
      "Último paso: ¿qué método se usó? Elige uno de estos botones.",
      {
        reply_markup: buildMethodKeyboard(),
      },
    );
    return;
  }

  if (session.step === "METHOD") {
    const method = normalizeMethod(text);
    if (!method) {
      await sendTelegramMessage(env, chatId, "Método no válido. Usa brazos, cuna o acunada.", {
        reply_markup: buildMethodKeyboard(),
      });
      return;
    }

    const normalizedRecord = normalizeChronology({
      hora_intento: data.hora_intento,
      hora_sueno_efectivo: data.hora_sueno_efectivo,
      hora_despertar: data.hora_despertar,
    });

    const createdRecord = await createManualFinalizedRecord(env.DB, {
      userId,
      method,
      ...normalizedRecord,
    });

    await clearUserSession(env.DB, userId);

    const latencyMinutes = calculateMinutesBetween(
      createdRecord.hora_intento,
      createdRecord.hora_sueno_efectivo,
    );
    const sleepDurationMs = calculateMillisecondsBetween(
      createdRecord.hora_sueno_efectivo,
      createdRecord.hora_despertar,
    );

    await sendTelegramMessage(
      env,
      chatId,
      `Registro manual guardado.\n` +
        `Latencia: ${latencyMinutes} min.\n` +
        `Sueño efectivo: ${formatDuration(sleepDurationMs)}.`,
      {
        reply_markup: buildKeyboardForState("WAITING"),
      },
    );
  }
}

async function handleEditLastInput({ env, session, chatId, userId, text, timeZone }) {
  const recordId = Number(session.data && session.data.recordId);
  const latestRecord = await getRecordById(env.DB, recordId, userId);

  if (!latestRecord) {
    await clearUserSession(env.DB, userId);
    await sendTelegramMessage(
      env,
      chatId,
      "No encuentro el registro que ibas a editar. Volvemos al menú principal.",
      {
        reply_markup: buildKeyboardForState("WAITING"),
      },
    );
    return;
  }

  if (session.step === "FIELD") {
    const field = mapEditField(text);
    if (!field) {
      await sendTelegramMessage(env, chatId, "Elige uno de los campos del teclado para editar.", {
        reply_markup: buildEditFieldKeyboard(),
      });
      return;
    }

    await saveUserSession(env.DB, userId, {
      flow: "EDIT_LAST",
      step: "VALUE",
      data: {
        recordId: latestRecord.id,
        field,
      },
    });

    if (field === "metodo") {
      await sendTelegramMessage(env, chatId, "Selecciona el nuevo método.", {
        reply_markup: buildMethodKeyboard(),
      });
    } else {
      await sendTelegramMessage(
        env,
        chatId,
        `Indícame el nuevo valor para ${getHumanFieldName(field)} en formato HH:MM.`,
        {
          reply_markup: buildCancelOnlyKeyboard(),
        },
      );
    }
    return;
  }

  if (session.step === "VALUE") {
    const field = session.data.field;
    let updatedRecord = { ...latestRecord };

    if (field === "metodo") {
      const method = normalizeMethod(text);
      if (!method) {
        await sendTelegramMessage(env, chatId, "Método no válido. Usa brazos, cuna o acunada.", {
          reply_markup: buildMethodKeyboard(),
        });
        return;
      }
      updatedRecord.metodo = method;
    } else {
      const parsedTime = parseManualTimeWithReference(
        text,
        timeZone,
        latestRecord[field] ||
          latestRecord.hora_sueno_efectivo ||
          latestRecord.hora_intento ||
          new Date().toISOString(),
      );

      if (!parsedTime) {
        await sendTelegramMessage(env, chatId, "Hora no válida. Usa HH:MM.", {
          reply_markup: buildCancelOnlyKeyboard(),
        });
        return;
      }

      updatedRecord[field] = parsedTime;
      updatedRecord = normalizeEditedRecord(updatedRecord);
    }

    updatedRecord.estado = deriveRecordStatus(updatedRecord);
    validateChronologyForStoredRecord(updatedRecord);
    await updateRecord(env.DB, updatedRecord);
    await clearUserSession(env.DB, userId);

    await sendTelegramMessage(
      env,
      chatId,
      `Registro actualizado.\n` +
        `Estado actual: ${updatedRecord.estado}.\n` +
        `Último intento: ${formatClock(updatedRecord.hora_intento, timeZone)}.`,
      {
        reply_markup: buildKeyboardForState(deriveAppState(await getActiveRecord(env.DB, userId))),
      },
    );
  }
}

async function handleCorrectSleepStartInput({ env, chatId, userId, text, timeZone }) {
  const activeRecord = await getActiveRecord(env.DB, userId);
  if (!activeRecord || activeRecord.estado !== "DURMIENDO") {
    await clearUserSession(env.DB, userId);
    await sendTelegramMessage(
      env,
      chatId,
      "Ya no hay una sesión durmiendo para corregir.",
      {
        reply_markup: buildKeyboardForState("WAITING"),
      },
    );
    return;
  }

  const parsedTime = parseManualTimeWithReference(
    text,
    timeZone,
    activeRecord.hora_sueno_efectivo || activeRecord.hora_intento,
  );

  if (!parsedTime) {
    await sendTelegramMessage(env, chatId, "Hora no válida. Usa HH:MM.", {
      reply_markup: buildCancelOnlyKeyboard(),
    });
    return;
  }

  const updatedRecord = normalizeEditedRecord({
    ...activeRecord,
    hora_sueno_efectivo: parsedTime,
  });

  validateChronologyForStoredRecord(updatedRecord);
  updatedRecord.estado = "DURMIENDO";
  await updateRecord(env.DB, updatedRecord);
  await clearUserSession(env.DB, userId);

  const latencyMinutes = calculateMinutesBetween(
    updatedRecord.hora_intento,
    updatedRecord.hora_sueno_efectivo,
  );

  await sendTelegramMessage(
    env,
    chatId,
    `Hora de inicio corregida. La latencia actual pasa a ser ${latencyMinutes} min.`,
    {
      reply_markup: buildKeyboardForState("SLEEPING"),
    },
  );
}

async function sendDailySummary(env, chatId, userId, timeZone) {
  const status = await buildUserStatus(env.DB, userId, timeZone);
  const summary = status.summary;

  const lines = [
    "Resumen de hoy:",
    `- Estado actual: ${status.stateLabel}`,
    `- Intentos hoy: ${summary.attemptsToday}`,
    `- Sueño total: ${summary.sleepTodayLabel}`,
    `- Latencia media: ${summary.averageLatencyLabel}`,
  ];

  if (summary.lastRecordLabel) {
    lines.push(`- Último registro: ${summary.lastRecordLabel}`);
  }

  await sendTelegramMessage(env, chatId, lines.join("\n"), {
    reply_markup: buildKeyboardForState(status.state),
  });
}

function buildWelcomeMessage(state) {
  if (state === "TRYING") {
    return "Hay un intento abierto. Cuando se duerma, pulsa \"💤 ¡Ya se durmió!\".";
  }

  if (state === "SLEEPING") {
    return "El bebé figura como dormido. Cuando despierte, pulsa \"☀️ ¡Se despertó!\".";
  }

  return (
    "Bot de sueño listo.\n\n" +
    "Usa \"🚀 Iniciar Intento\" para empezar un registro o \"📝 Manual/Editar\" si necesitas introducirlo a mano."
  );
}

function buildKeyboardForState(state) {
  if (state === "TRYING") {
    return {
      keyboard: [[BOT_BUTTONS.markAsleep], [BOT_BUTTONS.cancelAttempt]],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

  if (state === "SLEEPING") {
    return {
      keyboard: [[BOT_BUTTONS.markAwake], [BOT_BUTTONS.correctSleepStart]],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

  return {
    keyboard: [[BOT_BUTTONS.startAttempt], [BOT_BUTTONS.manual, BOT_BUTTONS.summary]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildManualMenuKeyboard() {
  return {
    keyboard: [[FLOW_BUTTONS.manualRecord], [FLOW_BUTTONS.editLast], [FLOW_BUTTONS.back, FLOW_BUTTONS.cancel]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildEditFieldKeyboard() {
  return {
    keyboard: [
      [FLOW_BUTTONS.editIntent, FLOW_BUTTONS.editSleep],
      [FLOW_BUTTONS.editWake, FLOW_BUTTONS.editMethod],
      [FLOW_BUTTONS.cancel],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildMethodKeyboard() {
  return {
    keyboard: [[METHOD_LABELS.brazos, METHOD_LABELS.cuna, METHOD_LABELS.acunada], [FLOW_BUTTONS.cancel]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildCancelOnlyKeyboard() {
  return {
    keyboard: [[FLOW_BUTTONS.cancel]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function startManualRecordFlow(db, userId, chatId, env, { intro }) {
  await saveUserSession(db, userId, {
    flow: "MANUAL_RECORD",
    step: "INTENT_TIME",
    data: {},
  });

  await sendTelegramMessage(env, chatId, intro, {
    reply_markup: buildCancelOnlyKeyboard(),
  });
}

async function sendTelegramMessage(env, chatId, text, extraPayload) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("Falta el secreto TELEGRAM_BOT_TOKEN.");
  }

  const payload = {
    chat_id: chatId,
    text,
    ...extraPayload,
  };

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logError("telegram_send_message_failed", errorBody);
  }
}

async function buildUserStatus(db, userId, timeZone) {
  const activeRecord = await getActiveRecord(db, userId);
  const recentRecords = await getRecentRecords(db, userId, 12);
  const todayKey = getLocalDateKey(new Date().toISOString(), timeZone);
  const todayRecords = recentRecords.filter((record) => getLocalDateKey(record.hora_intento, timeZone) === todayKey);
  const state = deriveAppState(activeRecord);

  const sleepDurations = todayRecords
    .filter((record) => record.hora_sueno_efectivo && record.hora_despertar)
    .map((record) => calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar));

  const latencies = todayRecords
    .filter((record) => record.hora_intento && record.hora_sueno_efectivo)
    .map((record) => calculateMillisecondsBetween(record.hora_intento, record.hora_sueno_efectivo));

  const summary = {
    attemptsToday: todayRecords.length,
    sleepTodayMs: sleepDurations.reduce((sum, value) => sum + value, 0),
    sleepTodayLabel: formatDuration(sleepDurations.reduce((sum, value) => sum + value, 0)),
    averageLatencyMs:
      latencies.length > 0
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : 0,
    averageLatencyLabel:
      latencies.length > 0
        ? `${Math.round(
            latencies.reduce((sum, value) => sum + value, 0) / latencies.length / 60000,
          )} min`
        : "0 min",
    lastRecordLabel: todayRecords[0]
      ? `${formatClock(todayRecords[0].hora_intento, timeZone)} · ${todayRecords[0].estado}`
      : null,
  };

  return {
    state,
    stateLabel: getStateLabel(state),
    stateDescription: getStateDescription(state, activeRecord, timeZone),
    activeRecord: activeRecord ? sanitizeRecordWithDerived(activeRecord, timeZone) : null,
    summary,
    recentRecords: todayRecords.map((record) => sanitizeRecordWithDerived(record, timeZone)),
  };
}

function getStateLabel(state) {
  if (state === "TRYING") {
    return "Intentando dormir";
  }
  if (state === "SLEEPING") {
    return "Durmiendo";
  }
  return "En espera";
}

function getStateDescription(state, activeRecord, timeZone) {
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

async function startAttempt(db, userId, { method }) {
  const activeRecord = await getActiveRecord(db, userId);
  if (activeRecord) {
    throw new Error("Ya existe un registro abierto para este usuario.");
  }

  const horaIntento = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO registros_sueno (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind("PENDIENTE_DORMIR", horaIntento, null, null, method || null, userId)
    .run();

  const record = await getActiveRecord(db, userId);
  return { record };
}

async function markAsleep(db, userId) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord) {
    throw new Error("No hay ningún intento abierto para marcar como dormido.");
  }

  if (activeRecord.estado !== "PENDIENTE_DORMIR") {
    throw new Error("El registro actual ya estaba marcado como durmiendo.");
  }

  const horaSuenoEfectivo = new Date().toISOString();
  await db
    .prepare("UPDATE registros_sueno SET estado = ?, hora_sueno_efectivo = ? WHERE id = ?")
    .bind("DURMIENDO", horaSuenoEfectivo, activeRecord.id)
    .run();

  const record = await getRecordById(db, activeRecord.id, userId);
  const latencyMinutes = calculateMinutesBetween(record.hora_intento, record.hora_sueno_efectivo);
  return { record, latencyMinutes };
}

async function markAwake(db, userId) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord) {
    throw new Error("No hay ninguna siesta abierta para cerrar.");
  }

  if (activeRecord.estado !== "DURMIENDO" || !activeRecord.hora_sueno_efectivo) {
    throw new Error("El registro abierto todavía no tiene hora de sueño efectivo.");
  }

  const horaDespertar = new Date().toISOString();
  await db
    .prepare("UPDATE registros_sueno SET estado = ?, hora_despertar = ? WHERE id = ?")
    .bind("FINALIZADO", horaDespertar, activeRecord.id)
    .run();

  const record = await getRecordById(db, activeRecord.id, userId);
  const sleepDurationMs = calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar);
  return { record, sleepDurationMs };
}

async function cancelAttempt(db, userId) {
  const activeRecord = await getActiveRecord(db, userId);
  if (!activeRecord || activeRecord.estado !== "PENDIENTE_DORMIR") {
    throw new Error("Solo se puede cancelar un intento que todavía no esté dormido.");
  }

  await db.prepare("DELETE FROM registros_sueno WHERE id = ?").bind(activeRecord.id).run();
}

async function updateMethodForOpenOrLatestRecord(db, userId, method) {
  const targetRecord = (await getActiveRecord(db, userId)) || (await getLatestRecord(db, userId));
  if (!targetRecord) {
    throw new Error("No hay registros para actualizar el método.");
  }

  await db.prepare("UPDATE registros_sueno SET metodo = ? WHERE id = ?").bind(method, targetRecord.id).run();
  const record = await getRecordById(db, targetRecord.id, userId);
  return { record };
}

async function createManualFinalizedRecord(
  db,
  { userId, hora_intento, hora_sueno_efectivo, hora_despertar, method },
) {
  await db
    .prepare(
      "INSERT INTO registros_sueno (estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      "FINALIZADO",
      hora_intento,
      hora_sueno_efectivo,
      hora_despertar,
      method,
      userId,
    )
    .run();

  return getLatestRecord(db, userId);
}

async function getActiveRecord(db, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id FROM registros_sueno WHERE user_id = ? AND estado != ? ORDER BY id DESC LIMIT 1",
    )
    .bind(userId, "FINALIZADO")
    .first();
}

async function getLatestRecord(db, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id FROM registros_sueno WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    )
    .bind(userId)
    .first();
}

async function getRecentRecords(db, userId, limit) {
  const result = await db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id FROM registros_sueno WHERE user_id = ? ORDER BY id DESC LIMIT ?",
    )
    .bind(userId, limit)
    .all();

  return result.results || [];
}

async function getRecordById(db, recordId, userId) {
  return db
    .prepare(
      "SELECT id, estado, hora_intento, hora_sueno_efectivo, hora_despertar, metodo, user_id FROM registros_sueno WHERE id = ? AND user_id = ? LIMIT 1",
    )
    .bind(recordId, userId)
    .first();
}

async function updateRecord(db, record) {
  await db
    .prepare(
      "UPDATE registros_sueno SET estado = ?, hora_intento = ?, hora_sueno_efectivo = ?, hora_despertar = ?, metodo = ? WHERE id = ? AND user_id = ?",
    )
    .bind(
      record.estado,
      record.hora_intento,
      record.hora_sueno_efectivo || null,
      record.hora_despertar || null,
      record.metodo || null,
      record.id,
      record.user_id,
    )
    .run();
}

async function getUserSession(db, userId) {
  const row = await db
    .prepare("SELECT user_id, flow, step, data_json FROM bot_contexto_usuario WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first();

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    flow: row.flow,
    step: row.step,
    data: safeParseJson(row.data_json),
  };
}

async function saveUserSession(db, userId, session) {
  await db
    .prepare(
      "INSERT INTO bot_contexto_usuario (user_id, flow, step, data_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET flow = excluded.flow, step = excluded.step, data_json = excluded.data_json, updated_at = excluded.updated_at",
    )
    .bind(userId, session.flow, session.step, JSON.stringify(session.data || {}), new Date().toISOString())
    .run();
}

async function clearUserSession(db, userId) {
  await db.prepare("DELETE FROM bot_contexto_usuario WHERE user_id = ?").bind(userId).run();
}

function deriveAppState(record) {
  if (!record) {
    return "WAITING";
  }

  if (record.estado === "PENDIENTE_DORMIR") {
    return "TRYING";
  }

  if (record.estado === "DURMIENDO") {
    return "SLEEPING";
  }

  return "WAITING";
}

function deriveRecordStatus(record) {
  if (record.hora_sueno_efectivo && record.hora_despertar) {
    return "FINALIZADO";
  }
  if (record.hora_sueno_efectivo) {
    return "DURMIENDO";
  }
  return "PENDIENTE_DORMIR";
}

function parseManualTimeFromToday(text, timeZone) {
  const parsed = parseTimeText(text);
  if (!parsed) {
    return null;
  }

  const today = getDatePartsInTimeZone(new Date(), timeZone);
  return makeTimeZoneIso(
    {
      year: today.year,
      month: today.month,
      day: today.day,
      hour: parsed.hour,
      minute: parsed.minute,
    },
    timeZone,
  );
}

function parseManualTimeWithReference(text, timeZone, referenceIso) {
  const parsed = parseTimeText(text);
  if (!parsed) {
    return null;
  }

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

function parseTimeText(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function normalizeChronology(times) {
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

function normalizeEditedRecord(record) {
  const normalizedTimes = normalizeChronology(record);
  return {
    ...record,
    ...normalizedTimes,
  };
}

function ensureAfter(candidateIso, referenceIso) {
  let candidateTime = new Date(candidateIso).getTime();
  const referenceTime = new Date(referenceIso).getTime();

  while (candidateTime < referenceTime) {
    candidateTime += DAY_IN_MS;
  }

  return new Date(candidateTime).toISOString();
}

function validateChronologyForStoredRecord(record) {
  if (!record.hora_intento) {
    throw new Error("Todo registro necesita hora de intento.");
  }

  if (record.hora_sueno_efectivo) {
    if (Date.parse(record.hora_sueno_efectivo) < Date.parse(record.hora_intento)) {
      throw new Error("La hora de sueño efectivo no puede ser anterior al intento.");
    }
  }

  if (record.hora_despertar) {
    const reference = record.hora_sueno_efectivo || record.hora_intento;
    if (Date.parse(record.hora_despertar) < Date.parse(reference)) {
      throw new Error("La hora de despertar no puede ser anterior al inicio del sueño.");
    }
  }
}

function calculateMinutesBetween(startIso, endIso) {
  if (!startIso || !endIso) {
    return null;
  }

  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000));
}

function calculateMillisecondsBetween(startIso, endIso) {
  if (!startIso || !endIso) {
    return 0;
  }

  return Math.max(0, Date.parse(endIso) - Date.parse(startIso));
}

function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.round(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatClock(isoString, timeZone) {
  if (!isoString) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoString));
}

function getLocalDateKey(isoString, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoString));
}

function makeTimeZoneIso(parts, timeZone) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  let adjusted = utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  adjusted = utcGuess - getTimeZoneOffsetMs(new Date(adjusted), timeZone);
  return new Date(adjusted).toISOString();
}

function getTimeZoneOffsetMs(date, timeZone) {
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

function getDatePartsInTimeZone(date, timeZone) {
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

function normalizeMethod(text) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase();

  return METHODS.includes(normalized) ? normalized : null;
}

function mapEditField(text) {
  if (text === FLOW_BUTTONS.editIntent) {
    return "hora_intento";
  }
  if (text === FLOW_BUTTONS.editSleep) {
    return "hora_sueno_efectivo";
  }
  if (text === FLOW_BUTTONS.editWake) {
    return "hora_despertar";
  }
  if (text === FLOW_BUTTONS.editMethod) {
    return "metodo";
  }
  return null;
}

function getHumanFieldName(field) {
  if (field === "hora_intento") {
    return "hora de intento";
  }
  if (field === "hora_sueno_efectivo") {
    return "hora de sueño efectivo";
  }
  if (field === "hora_despertar") {
    return "hora de despertar";
  }
  return "método";
}

function sanitizeRecord(record) {
  return {
    id: record.id,
    estado: record.estado,
    hora_intento: record.hora_intento,
    hora_sueno_efectivo: record.hora_sueno_efectivo,
    hora_despertar: record.hora_despertar,
    metodo: record.metodo,
    user_id: record.user_id,
  };
}

function sanitizeRecordWithDerived(record, timeZone) {
  const sleepDurationMs = record.hora_sueno_efectivo && record.hora_despertar
    ? calculateMillisecondsBetween(record.hora_sueno_efectivo, record.hora_despertar)
    : 0;

  return {
    ...sanitizeRecord(record),
    startLabel: formatClock(record.hora_intento, timeZone),
    latencyMinutes: calculateMinutesBetween(record.hora_intento, record.hora_sueno_efectivo),
    sleepDurationLabel: record.hora_sueno_efectivo && record.hora_despertar ? formatDuration(sleepDurationMs) : null,
  };
}

function safeParseJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function validateWebAccess(env, accessKey) {
  if (env.WEB_APP_ACCESS_KEY && accessKey !== env.WEB_APP_ACCESS_KEY) {
    return jsonResponse({ ok: false, error: "Acceso web no autorizado." }, 401);
  }
  return null;
}

function getAppTimeZone(env) {
  return env.APP_TIMEZONE || "Europe/Madrid";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logError(event, error) {
  console.error(
    JSON.stringify({
      event,
      error: typeof error === "string" ? error : error && error.message ? error.message : String(error),
    }),
  );
}
