(() => {
  const { nowISODate, fmtHMS, loadStore, saveStore, ensureDay, ensureDayProject, syncStore, applyTheme } = window.TimerData;
  let store = loadStore();
  let tick = null;

  const els = {
    projectSelect: document.getElementById("projectSelect"),
    modeWork: document.getElementById("modeWork"),
    modeBreak: document.getElementById("modeBreak"),
    statusText: document.getElementById("statusText"),
    timeText: document.getElementById("timeText"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    resetBtn: document.getElementById("resetBtn"),
    syncBtn: document.getElementById("syncBtn"),
    toConfigBtn: document.getElementById("toConfigBtn"),
    pillProject: document.getElementById("pillProject"),
    pillMode: document.getElementById("pillMode"),
    todayWork: document.getElementById("todayWork"),
    todayBreak: document.getElementById("todayBreak"),
    sessionElapsed: document.getElementById("sessionElapsed"),
    perProjectRows: document.getElementById("perProjectRows"),
    log: document.getElementById("log"),
    lastSync: document.getElementById("lastSync")
  };

  const syncLabel = () => {
    els.lastSync.textContent = store.lastSyncedAt ? new Date(store.lastSyncedAt).toLocaleString("es-ES") : "Nunca";
  };

  const currentSessionMs = () => store.running ? (store.accSessionMs + (Date.now() - store.startedAt)) : store.accSessionMs;

  const setMode = (mode) => {
    store.mode = mode;
    saveStore(store);
    els.pillMode.textContent = mode === "break" ? "Break global" : "Work";
    els.modeWork.classList.toggle("btn-primary", mode === "work");
    els.modeBreak.classList.toggle("btn-primary", mode === "break");
  };

  const setProject = (projectId) => {
    store.selectedProjectId = projectId;
    saveStore(store);
    const current = store.projects.find((p) => p.id === projectId);
    els.pillProject.textContent = current?.name || "-";
    applyTheme(store.projects, projectId);
    renderTotalsAndLog();
  };

  const startTimer = () => {
    if (store.running) return;
    store.running = true;
    store.startedAt = Date.now();
    saveStore(store);
    els.startBtn.disabled = true;
    els.stopBtn.disabled = false;
    els.statusText.textContent = store.mode === "break" ? "En break (global)" : "En foco";
    tick = setInterval(renderTime, 250);
  };

  const stopTimer = () => {
    if (!store.running) return;
    store.accSessionMs += Date.now() - store.startedAt;

    const day = ensureDay(store.days, nowISODate());
    if (store.mode === "break") {
      day.breakMs += store.accSessionMs;
      day.breakLogs.push({ ts: Date.now(), mode: "break", ms: store.accSessionMs });
    } else {
      const bucket = ensureDayProject(store, nowISODate(), store.selectedProjectId);
      bucket.workMs += store.accSessionMs;
      bucket.logs.push({ ts: Date.now(), mode: "work", ms: store.accSessionMs });
    }

    store.running = false;
    store.startedAt = null;
    store.accSessionMs = 0;
    saveStore(store);
    clearInterval(tick);
    els.startBtn.disabled = false;
    els.stopBtn.disabled = true;
    els.statusText.textContent = "Listo";
    renderTime();
    renderTotalsAndLog();
  };

  const renderTime = () => {
    const ms = currentSessionMs();
    els.timeText.textContent = fmtHMS(ms);
    els.sessionElapsed.textContent = fmtHMS(ms);
  };

  const renderTotalsAndLog = () => {
    const day = store.days[nowISODate()] || { projects: {}, breakMs: 0, breakLogs: [] };
    const current = day.projects[store.selectedProjectId] || { workMs: 0, logs: [] };

    els.todayWork.textContent = fmtHMS(current.workMs || 0);
    els.todayBreak.textContent = fmtHMS(day.breakMs || 0);

    els.perProjectRows.innerHTML = store.projects.map((p) => {
      const d = day.projects[p.id] || { workMs: 0 };
      return `<div class="row"><div><span class="swatch" style="background:${p.bgA}"></span> ${p.name}</div><div><span class="badge">Work ${fmtHMS(d.workMs || 0)}</span></div></div>`;
    }).join("") + `<div class="row"><div><span class="swatch" style="background:#f59e0b"></span> Break (global)</div><div><span class="badge">Break ${fmtHMS(day.breakMs || 0)}</span></div></div>`;

    const logs = [...(day.breakLogs || []), ...(current.logs || [])].slice(-20).reverse();
    els.log.innerHTML = logs.map((l) => `<div class="logitem"><div>${l.mode} · ${fmtHMS(l.ms)}</div><small>${new Date(l.ts).toLocaleTimeString("es-ES")}</small></div>`).join("") || "<div class='logitem'>No hay registros hoy.</div>";
  };

  const resetSession = () => {
    store.running = false;
    store.startedAt = null;
    store.accSessionMs = 0;
    saveStore(store);
    clearInterval(tick);
    els.startBtn.disabled = false;
    els.stopBtn.disabled = true;
    renderTime();
  };

  const init = () => {
    els.projectSelect.innerHTML = store.projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    els.projectSelect.value = store.selectedProjectId;
    setProject(store.selectedProjectId);
    setMode(store.mode);
    syncLabel();
    renderTotalsAndLog();
    renderTime();

    if (store.running && store.startedAt) {
      els.startBtn.disabled = true;
      els.stopBtn.disabled = false;
      tick = setInterval(renderTime, 250);
    }

    els.projectSelect.addEventListener("change", (e) => setProject(e.target.value));
    els.modeWork.addEventListener("click", () => setMode("work"));
    els.modeBreak.addEventListener("click", () => setMode("break"));
    els.startBtn.addEventListener("click", startTimer);
    els.stopBtn.addEventListener("click", stopTimer);
    els.resetBtn.addEventListener("click", resetSession);
    els.syncBtn.addEventListener("click", () => {
      syncStore(store);
      syncLabel();
    });
    els.toConfigBtn.addEventListener("click", () => { window.location.href = "./config.html"; });
  };

  init();
})();
