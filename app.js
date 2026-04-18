const state = {
  token: localStorage.getItem("sleepflow_token") || "",
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid",
  family: null,
  activeUser: "PAPA",
  activeRecord: null,
  timerHandle: null,
};

const $ = (id) => document.getElementById(id);

init();

async function init() {
  bindUi();
  await bootSetupAndAuth();
}

function bindUi() {
  $("nav-registro").addEventListener("click", () => setTab("registro"));
  $("nav-analiticas").addEventListener("click", () => setTab("analiticas"));

  $("btn-papa").addEventListener("click", () => switchUser("PAPA"));
  $("btn-mama").addEventListener("click", () => switchUser("MAMA"));

  $("act-iniciar").addEventListener("click", () => quickAction("iniciar"));
  $("act-dormido").addEventListener("click", () => quickAction("dormido"));
  $("act-despertar").addEventListener("click", () => quickAction("despertar"));
  $("act-cancelar").addEventListener("click", () => quickAction("cancelar"));

  $("manual-form").addEventListener("submit", submitManual);
  $("reload-historial").addEventListener("click", loadHistory);
  $("reload-analytics").addEventListener("click", loadAnalytics);
  $("logout-btn").addEventListener("click", logout);

  $("setup-form").addEventListener("submit", submitSetup);
  $("login-form").addEventListener("submit", submitLogin);
}

async function bootSetupAndAuth() {
  const setup = await fetchJson("/api/setup");
  if (!setup?.configured) {
    $("welcome-overlay").classList.remove("hidden");
    return;
  }

  state.family = setup;
  hydrateFamilyUi();

  if (!state.token) {
    showLogin();
    return;
  }

  const ok = await tryAuthProbe();
  if (!ok) return showLogin();

  await bootApp();
}

async function bootApp() {
  hideOverlays();
  await Promise.all([refreshActiveState(), loadHistory(), loadAnalytics()]);
}

function hydrateFamilyUi() {
  if (!state.family) return;
  $("baby-title").textContent = `👶 ${state.family.baby_name}`;
  $("family-summary").textContent = `${state.family.father_name} + ${state.family.mother_name} · ${state.family.baby_name}`;
  $("btn-papa").textContent = `👨 ${state.family.father_name}`;
  $("btn-mama").textContent = `👩 ${state.family.mother_name}`;
  $("tz-label").textContent = `Zona horaria: ${state.family.timezone || state.tz}`;
}

async function submitSetup(e) {
  e.preventDefault();
  const payload = {
    father_name: $("setup-father").value.trim(),
    mother_name: $("setup-mother").value.trim(),
    baby_name: $("setup-baby").value.trim(),
    timezone: $("setup-timezone").value.trim() || "Europe/Madrid",
    pin: $("setup-pin").value,
  };

  const res = await fetch("/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "No se pudo crear el hogar");
    return;
  }

  state.family = { configured: true, ...payload };
  hydrateFamilyUi();
  $("welcome-overlay").classList.add("hidden");
  showLogin();
}

async function submitLogin(e) {
  e.preventDefault();
  const pin = $("login-pin").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) {
    $("login-msg").textContent = `❌ ${data.error || "PIN inválido"}`;
    return;
  }

  state.token = data.token;
  localStorage.setItem("sleepflow_token", state.token);
  $("login-msg").textContent = "";
  await bootApp();
}

async function tryAuthProbe() {
  const res = await authFetch(`/api/estado?user_id=${state.activeUser}`);
  if (res.status === 401) {
    logout();
    return false;
  }
  return res.ok;
}

function switchUser(userId) {
  state.activeUser = userId;
  $("btn-papa").classList.toggle("active", userId === "PAPA");
  $("btn-mama").classList.toggle("active", userId === "MAMA");
  refreshActiveState();
  loadHistory();
}

async function refreshActiveState() {
  const res = await authFetch(`/api/estado?user_id=${state.activeUser}`);
  const data = await safeJson(res);
  if (!res.ok) return;
  state.activeRecord = data.activo;
  renderState();
}

async function quickAction(accion) {
  const res = await authFetch("/api/acciones", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accion, user_id: state.activeUser }),
  });

  const data = await safeJson(res);
  const msg = $("accion-msg");
  msg.textContent = res.ok ? `✅ ${data.mensaje || "ok"}` : `❌ ${data.error || "Error"}`;

  await Promise.all([refreshActiveState(), loadHistory(), loadAnalytics()]);
}

async function submitManual(e) {
  e.preventDefault();
  const payload = {
    user_id: state.activeUser,
    estado: $("manual-estado").value,
    hora_intento: toIso($("manual-intento").value),
    hora_sueno_efectivo: toIso($("manual-dormido").value),
    hora_despertar: toIso($("manual-despertar").value),
    metodo: $("manual-metodo").value || null,
  };

  const res = await authFetch("/api/registros", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await safeJson(res);
  $("accion-msg").textContent = res.ok ? "✅ Entrada manual guardada" : `❌ ${data.error || "Error"}`;

  if (res.ok) {
    e.target.reset();
    await Promise.all([refreshActiveState(), loadHistory(), loadAnalytics()]);
  }
}

async function loadHistory() {
  const res = await authFetch(`/api/registros?user_id=${state.activeUser}`);
  const data = await safeJson(res);
  const root = $("historial");
  if (!res.ok) {
    root.innerHTML = `<p>❌ ${data.error || "No se pudo cargar"}</p>`;
    return;
  }
  if (!data.data.length) {
    root.innerHTML = "<p>Sin registros aún.</p>";
    return;
  }

  root.innerHTML = data.data
    .map((r) => `<div class="item"><strong>${r.estado}</strong><p>${fmt(r.hora_intento)} → ${fmt(r.hora_sueno_efectivo)} → ${fmt(r.hora_despertar)}</p></div>`)
    .join("");
}

async function loadAnalytics() {
  const tz = state.family?.timezone || state.tz;
  const res = await authFetch(`/api/analiticas?tz=${encodeURIComponent(tz)}`);
  const data = await safeJson(res);
  if (!res.ok) return;

  $("m-total").textContent = String(data.total.registros);
  $("m-lat").textContent = `${data.total.latencia_media_min} min`;
  $("m-sleep").textContent = fmtMin(data.total.sueno_total_min);
  $("m-papa").textContent = `${data.papa.registros} registros`;
  $("m-mama").textContent = `${data.mama.registros} registros`;
}

function renderState() {
  clearTimer();
  if (!state.activeRecord) {
    $("estado-text").textContent = "Estado: en espera";
    $("timer-text").textContent = "00:00";
    return;
  }

  if (state.activeRecord.estado === "PENDIENTE_DORMIR") {
    $("estado-text").textContent = "Estado: intentando dormir";
    startTimer(new Date(state.activeRecord.hora_intento));
    return;
  }

  if (state.activeRecord.estado === "DURMIENDO") {
    $("estado-text").textContent = "Estado: durmiendo";
    startTimer(new Date(state.activeRecord.hora_sueno_efectivo));
  }
}

function startTimer(from) {
  const tick = () => {
    const min = Math.max(0, Math.floor((Date.now() - from.getTime()) / 60000));
    const h = String(Math.floor(min / 60)).padStart(2, "0");
    const m = String(min % 60).padStart(2, "0");
    $("timer-text").textContent = `${h}:${m}`;
  };
  tick();
  state.timerHandle = setInterval(tick, 1000);
}

function clearTimer() {
  if (state.timerHandle) clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function setTab(tab) {
  const reg = tab === "registro";
  $("tab-registro").classList.toggle("active", reg);
  $("tab-analiticas").classList.toggle("active", !reg);
  $("nav-registro").classList.toggle("active", reg);
  $("nav-analiticas").classList.toggle("active", !reg);
}

function showLogin() {
  hideOverlays();
  $("login-overlay").classList.remove("hidden");
}

function hideOverlays() {
  $("welcome-overlay").classList.add("hidden");
  $("login-overlay").classList.add("hidden");
}

function logout() {
  state.token = "";
  localStorage.removeItem("sleepflow_token");
  showLogin();
}

function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("authorization", `Bearer ${state.token}`);
  return fetch(url, { ...options, headers });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

function toIso(raw) {
  return raw ? new Date(raw).toISOString() : null;
}

function fmt(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-ES");
}

function fmtMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
