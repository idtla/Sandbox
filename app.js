/* ===== Project Timer (Glass) - Lógica ===== */

// Proyectos por defecto (se sobrescriben con store si existe)
const DEFAULT_PROJECTS = [
  { id: "vass", name: "VASS", bgA: "#4bbcee", bgB: "#0d3b4a" },
  { id: "sapos", name: "Sapos y Princesas", bgA: "#00a632", bgB: "#003d14" },
  { id: "knowmad", name: "Knowmad Project", bgA: "#2a9d8f", bgB: "#124e47" },
];

const STORAGE_KEY = "project_timer_glass_v2";

// ===== DOM =====
const els = {};

function gatherElements() {
  const ids = [
    "projectSelect", "modeWork", "modeBreak", "statusText", "timeText",
    "startBtn", "stopBtn", "resetBtn", "pillProject", "pillMode",
    "todayWork", "todayBreak", "sessionElapsed", "perProjectRows", "log",
    "exportBtn", "clearTodayBtn",
    "tabTimer", "tabProyectos", "tabEstadisticas",
    "panelTimer", "panelProyectos", "panelEstadisticas",
    "projectsList", "projectNameInput", "projectColorA", "projectColorB", "addProjectBtn",
    "statsContent", "exportStatsBtn"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) els[id] = el;
  });
}

const nowISODate = () => new Date().toISOString().slice(0, 10);
const fmtHMS = (ms) => {
  ms = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const idFromName = (name) => name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 24) || "proyecto";

// ===== Store =====
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getProjects(store) {
  if (store?.projects?.length) return store.projects;
  return DEFAULT_PROJECTS.map((p) => ({ ...p }));
}

function initStore() {
  const existing = loadStore();
  if (existing) {
    existing.projects = getProjects(existing);
    return existing;
  }
  const store = {
    projects: DEFAULT_PROJECTS.map((p) => ({ ...p })),
    selectedProjectId: DEFAULT_PROJECTS[0]?.id ?? "vass",
    mode: "work",
    running: false,
    startedAt: null,
    accSessionMs: 0,
    days: {},
  };
  saveStore(store);
  return store;
}

let store = initStore();
let PROJECTS = store.projects;
let tickTimer = null;

function ensureDayProject(dayKey, projectId) {
  store.days[dayKey] ??= {};
  store.days[dayKey][projectId] ??= { workMs: 0, breakMs: 0, logs: [] };
  return store.days[dayKey][projectId];
}

function setThemeByProject(projectId) {
  const p = PROJECTS.find((x) => x.id === projectId) || PROJECTS[0];
  if (!p) return;
  document.documentElement.style.setProperty("--bg-a", p.bgA);
  document.documentElement.style.setProperty("--bg-b", p.bgB);
  if (els.pillProject) els.pillProject.textContent = p.name;
}

function setMode(mode) {
  store.mode = mode;
  if (els.pillMode) els.pillMode.textContent = mode === "break" ? "Break" : "Work";

  const isWork = mode === "work";
  if (els.modeWork) {
    els.modeWork.classList.toggle("btn-primary", isWork);
    els.modeWork.setAttribute("aria-pressed", String(isWork));
  }
  if (els.modeBreak) {
    els.modeBreak.classList.toggle("btn-primary", !isWork);
    els.modeBreak.setAttribute("aria-pressed", String(!isWork));
  }

  if (els.statusText) {
    els.statusText.textContent = store.running
      ? (mode === "break" ? "En break" : "En foco")
      : "Listo";
  }
  saveStore(store);
  renderTotalsAndLog();
}

function setProject(projectId) {
  if (store.running) {
    stopTimer(true);
    store.selectedProjectId = projectId;
    saveStore(store);
    setThemeByProject(projectId);
    startTimer(true);
    return;
  }
  store.selectedProjectId = projectId;
  saveStore(store);
  setThemeByProject(projectId);
  renderTotalsAndLog();
}

function currentSessionMs() {
  if (!store.running || !store.startedAt) return store.accSessionMs || 0;
  return (store.accSessionMs || 0) + (Date.now() - store.startedAt);
}

function startTimer(resumed = false) {
  if (store.running) return;
  store.running = true;
  store.startedAt = Date.now();
  saveStore(store);

  if (els.startBtn) els.startBtn.disabled = true;
  if (els.stopBtn) els.stopBtn.disabled = false;
  if (els.statusText) els.statusText.textContent = store.mode === "break" ? "En break" : "En foco";
  if (!resumed) renderTime();

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(renderTime, 250);
}

function stopTimer(silent = false) {
  if (!store.running) return;

  const elapsedMs = Date.now() - store.startedAt;
  store.accSessionMs = (store.accSessionMs || 0) + elapsedMs;

  const dayKey = nowISODate();
  const projectId = store.selectedProjectId;
  const bucket = ensureDayProject(dayKey, projectId);

  const modeKey = store.mode === "break" ? "breakMs" : "workMs";
  bucket[modeKey] += store.accSessionMs;
  bucket.logs.push({ ts: Date.now(), mode: store.mode, ms: store.accSessionMs });

  store.running = false;
  store.startedAt = null;
  store.accSessionMs = 0;
  saveStore(store);

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;

  if (els.startBtn) els.startBtn.disabled = false;
  if (els.stopBtn) els.stopBtn.disabled = true;
  if (els.statusText) els.statusText.textContent = "Listo";

  if (!silent) {
    renderTotalsAndLog();
    renderTime();
  }
}

function resetSession() {
  store.running = false;
  store.startedAt = null;
  store.accSessionMs = 0;
  saveStore(store);

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;

  if (els.startBtn) els.startBtn.disabled = false;
  if (els.stopBtn) els.stopBtn.disabled = true;
  if (els.statusText) els.statusText.textContent = "Listo";
  renderTime();
  renderTotalsAndLog();
}

function renderTime() {
  const ms = currentSessionMs();
  if (els.timeText) els.timeText.textContent = fmtHMS(ms);
  if (els.sessionElapsed) els.sessionElapsed.textContent = fmtHMS(ms);
}

function getDayAllProjects(dayKey) {
  store.days[dayKey] ??= {};
  for (const p of PROJECTS) {
    store.days[dayKey][p.id] ??= { workMs: 0, breakMs: 0, logs: [] };
  }
  return store.days[dayKey];
}

function renderPerProjectTotals() {
  if (!els.perProjectRows) return;
  const dayKey = nowISODate();
  const day = getDayAllProjects(dayKey);

  els.perProjectRows.innerHTML = PROJECTS.map((p) => {
    const d = day[p.id] || { workMs: 0, breakMs: 0 };
    const total = (d.workMs || 0) + (d.breakMs || 0);
    return `
      <div class="row">
        <div class="name">
          <span class="swatch" style="background:${p.bgA}"></span>
          ${p.name}
        </div>
        <div class="nums">
          <span class="badge">Work ${fmtHMS(d.workMs || 0)}</span>
          <span class="badge">Break ${fmtHMS(d.breakMs || 0)}</span>
          <span class="badge">Total ${fmtHMS(total)}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderTotalsAndLog() {
  const dayKey = nowISODate();
  const pid = store.selectedProjectId;
  const day = getDayAllProjects(dayKey);
  const current = day[pid];

  if (els.todayWork) els.todayWork.textContent = fmtHMS(current?.workMs || 0);
  if (els.todayBreak) els.todayBreak.textContent = fmtHMS(current?.breakMs || 0);

  renderPerProjectTotals();

  if (els.log) {
    const logs = (current?.logs || []).slice().reverse().slice(0, 20);
    els.log.innerHTML = logs
      .map((l) => {
        const when = new Date(l.ts);
        const hh = String(when.getHours()).padStart(2, "0");
        const mm = String(when.getMinutes()).padStart(2, "0");
        const label = l.mode === "break" ? "Break" : "Work";
        return `
          <div class="logitem">
            <div><strong>${label}</strong> · ${fmtHMS(l.ms)}</div>
            <div><small>${hh}:${mm}</small></div>
          </div>
        `;
      })
      .join("") || `<div class="logitem"><div>No hay registros hoy para este proyecto.</div></div>`;
  }
}

// ===== Export JSON (descarga portable) =====
function exportJSON() {
  const data = loadStore() || store;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project-timer-${nowISODate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearToday() {
  const dayKey = nowISODate();
  store.days[dayKey] = {};
  saveStore(store);
  renderTotalsAndLog();
}

// ===== Pestañas =====
function showTab(tabId) {
  ["panelTimer", "panelProyectos", "panelEstadisticas"].forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.toggle("active", id === tabId);
  });
  ["tabTimer", "tabProyectos", "tabEstadisticas"].forEach((id) => {
    const tab = document.getElementById(id);
    if (tab) tab.classList.toggle("active", "panel" + id.slice(3) === tabId);
  });
  if (tabId === "panelEstadisticas") renderStatsPanel();
  if (tabId === "panelProyectos") renderProjectsConfig();
}

// ===== Configuración de proyectos =====
function addProject() {
  const nameEl = els.projectNameInput;
  const colorA = els.projectColorA?.value || "#4bbcee";
  const colorB = els.projectColorB?.value || "#0d3b4a";
  const name = (nameEl?.value || "").trim();
  if (!name) return;

  const id = idFromName(name);
  const existing = PROJECTS.find((p) => p.id === id);
  if (existing) {
    existing.name = name;
    existing.bgA = colorA;
    existing.bgB = colorB;
  } else {
    PROJECTS.push({ id, name, bgA: colorA, bgB: colorB });
  }
  store.projects = PROJECTS;
  saveStore(store);
  if (nameEl) nameEl.value = "";
  renderProjectsConfig();
  refreshProjectSelect();
  renderTotalsAndLog();
}

function deleteProject(projectId) {
  if (PROJECTS.length <= 1) return;
  PROJECTS = PROJECTS.filter((p) => p.id !== projectId);
  store.projects = PROJECTS;
  if (store.selectedProjectId === projectId) {
    store.selectedProjectId = PROJECTS[0]?.id;
    setThemeByProject(store.selectedProjectId);
  }
  saveStore(store);
  renderProjectsConfig();
  refreshProjectSelect();
  renderTotalsAndLog();
}

function refreshProjectSelect() {
  if (!els.projectSelect) return;
  els.projectSelect.innerHTML = PROJECTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  els.projectSelect.value = store.selectedProjectId;
}

function renderProjectsConfig() {
  if (!els.projectsList) return;
  els.projectsList.innerHTML = PROJECTS.map(
    (p) => `
    <div class="project-list-item">
      <div class="name">
        <span class="swatch" style="background:${p.bgA}"></span>
        ${p.name}
      </div>
      <div class="actions">
        <button type="button" class="btn-danger delete-project" data-id="${p.id}">Eliminar</button>
      </div>
    </div>
  `
  ).join("");

  els.projectsList.querySelectorAll(".delete-project").forEach((btn) => {
    btn.addEventListener("click", () => deleteProject(btn.dataset.id));
  });
}

// ===== Estadísticas =====
function renderStatsPanel() {
  if (!els.statsContent) return;
  const days = Object.keys(store.days || {}).sort().reverse().slice(0, 31);
  let html = "";
  for (const dayKey of days) {
    const day = store.days[dayKey];
    html += `<h3 style="margin:14px 0 8px; font-size:14px;">${dayKey}</h3>`;
    for (const p of PROJECTS) {
      const d = day[p.id] || { workMs: 0, breakMs: 0 };
      const total = (d.workMs || 0) + (d.breakMs || 0);
      if (total === 0) continue;
      html += `
        <div class="row">
          <div class="name">
            <span class="swatch" style="background:${p.bgA}"></span>
            ${p.name}
          </div>
          <div class="nums">
            <span class="badge">Work ${fmtHMS(d.workMs || 0)}</span>
            <span class="badge">Break ${fmtHMS(d.breakMs || 0)}</span>
            <span class="badge">Total ${fmtHMS(total)}</span>
          </div>
        </div>
      `;
    }
  }
  if (!html) html = "<p style='color:var(--muted);'>No hay datos de días registrados.</p>";
  els.statsContent.innerHTML = html;
}

// ===== UI init =====
function initUI() {
  gatherElements();
  PROJECTS = store.projects;

  refreshProjectSelect();
  setThemeByProject(store.selectedProjectId);
  setMode(store.mode);
  renderTotalsAndLog();
  renderTime();

  if (store.running && store.startedAt) {
    if (els.startBtn) els.startBtn.disabled = true;
    if (els.stopBtn) els.stopBtn.disabled = false;
    if (els.statusText) els.statusText.textContent = store.mode === "break" ? "En break" : "En foco";
    tickTimer = setInterval(renderTime, 250);
  } else {
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
  }

  // Tabs
  if (els.tabTimer) els.tabTimer.addEventListener("click", () => showTab("panelTimer"));
  if (els.tabProyectos) els.tabProyectos.addEventListener("click", () => showTab("panelProyectos"));
  if (els.tabEstadisticas) els.tabEstadisticas.addEventListener("click", () => showTab("panelEstadisticas"));

  if (els.projectSelect) els.projectSelect.addEventListener("change", (e) => setProject(e.target.value));
  if (els.modeWork) els.modeWork.addEventListener("click", () => setMode("work"));
  if (els.modeBreak) els.modeBreak.addEventListener("click", () => setMode("break"));
  if (els.startBtn) els.startBtn.addEventListener("click", () => startTimer(false));
  if (els.stopBtn) els.stopBtn.addEventListener("click", () => stopTimer(false));
  if (els.resetBtn) els.resetBtn.addEventListener("click", () => resetSession());
  if (els.exportBtn) els.exportBtn.addEventListener("click", exportJSON);
  if (els.clearTodayBtn) els.clearTodayBtn.addEventListener("click", clearToday);

  if (els.addProjectBtn) els.addProjectBtn.addEventListener("click", addProject);
  if (els.exportStatsBtn) els.exportStatsBtn.addEventListener("click", exportJSON);

  window.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (e.code === "Space") {
      e.preventDefault();
      store.running ? stopTimer(false) : startTimer(false);
    } else if (e.key.toLowerCase() === "b") setMode("break");
    else if (e.key.toLowerCase() === "w") setMode("work");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  initUI();
}
