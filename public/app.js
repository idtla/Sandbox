const PROFILE_STORAGE_KEY = "suenolytics-profile-v2";

const state = {
  installEvent: null,
  profile: null,
  status: null,
  noticeTimeouts: new Map(),
  currentView: "sleep",
};

const refs = {
  installPwa: document.getElementById("installPwa"),
  profileForm: document.getElementById("profileForm"),
  babyName: document.getElementById("babyName"),
  caregiverName: document.getElementById("caregiverName"),
  defaultMethod: document.getElementById("defaultMethod"),
  timeZone: document.getElementById("timeZone"),
  refreshData: document.getElementById("refreshData"),
  profileNotice: document.getElementById("profileNotice"),
  stateMetric: document.getElementById("stateMetric"),
  stateHelper: document.getElementById("stateHelper"),
  timerMetric: document.getElementById("timerMetric"),
  timerHelper: document.getElementById("timerHelper"),
  timerPhaseLabel: document.getElementById("timerPhaseLabel"),
  sleepTodayMetric: document.getElementById("sleepTodayMetric"),
  latencyMetric: document.getElementById("latencyMetric"),
  onlineStatus: document.getElementById("onlineStatus"),
  startAction: document.getElementById("startAction"),
  markAsleepAction: document.getElementById("markAsleepAction"),
  markAwakeAction: document.getElementById("markAwakeAction"),
  cancelAction: document.getElementById("cancelAction"),
  quickMethod: document.getElementById("quickMethod"),
  updateMethodAction: document.getElementById("updateMethodAction"),
  actionNotice: document.getElementById("actionNotice"),
  manualForm: document.getElementById("manualForm"),
  manualIntent: document.getElementById("manualIntent"),
  manualSleep: document.getElementById("manualSleep"),
  manualWake: document.getElementById("manualWake"),
  manualMethod: document.getElementById("manualMethod"),
  resetManualForm: document.getElementById("resetManualForm"),
  manualNotice: document.getElementById("manualNotice"),
  recordsList: document.getElementById("recordsList"),
  lastSleepSummary: document.getElementById("lastSleepSummary"),
  lastSleepSub: document.getElementById("lastSleepSub"),
  appTitle: document.getElementById("appTitle"),
  profileGate: document.getElementById("profileGate"),
  sleepContent: document.getElementById("sleepContent"),
  viewSleep: document.getElementById("viewSleep"),
  viewToday: document.getElementById("viewToday"),
  viewMore: document.getElementById("viewMore"),
};

boot().catch((error) => {
  console.error(error);
  showNotice(refs.actionNotice, "No se ha podido iniciar la PWA.", true);
});

async function boot() {
  refs.timeZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  registerServiceWorker();
  bindInstallPrompt();
  bindEvents();
  bindTabNav();
  hydrateStoredProfile();
  setOnlineStatus(navigator.onLine);
  window.addEventListener("online", () => {
    setOnlineStatus(true);
    refreshStatus(false).catch(() => {});
  });
  window.addEventListener("offline", () => {
    setOnlineStatus(false);
    showNotice(refs.actionNotice, "Sin conexión: se muestra lo último guardado.", true);
  });
  setInterval(renderLiveTimer, 1000);
  updateProfileGate();
  if (state.profile) {
    await refreshStatus(false);
  } else {
    prefillManualForm();
  }
}

function bindTabNav() {
  document.querySelectorAll(".bottom-nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (!view) return;
      switchView(view);
    });
  });
}

function switchView(viewId) {
  state.currentView = viewId;
  const map = {
    sleep: refs.viewSleep,
    today: refs.viewToday,
    more: refs.viewMore,
  };

  document.querySelectorAll(".bottom-nav__item").forEach((btn) => {
    const active = btn.dataset.view === viewId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });

  Object.entries(map).forEach(([id, el]) => {
    const active = id === viewId;
    el.classList.toggle("view--active", active);
    el.hidden = !active;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("service-worker", error);
    });
  }
}

function bindInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installEvent = event;
    refs.installPwa.classList.remove("hidden");
  });

  refs.installPwa.addEventListener("click", async () => {
    if (!state.installEvent) {
      return;
    }
    state.installEvent.prompt();
    await state.installEvent.userChoice;
    state.installEvent = null;
    refs.installPwa.classList.add("hidden");
  });
}

function bindEvents() {
  refs.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveProfile();
    } catch (error) {
      showNotice(refs.profileNotice, error.message, true);
    }
  });

  refs.refreshData.addEventListener("click", async () => {
    try {
      await refreshStatus(true);
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.startAction.addEventListener("click", async () => {
    try {
      await performAction("start_attempt", {
        method: refs.quickMethod.value || refs.defaultMethod.value,
      });
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.markAsleepAction.addEventListener("click", async () => {
    try {
      await performAction("mark_asleep");
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.markAwakeAction.addEventListener("click", async () => {
    try {
      await performAction("mark_awake");
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.cancelAction.addEventListener("click", async () => {
    try {
      await performAction("cancel_attempt");
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.updateMethodAction.addEventListener("click", async () => {
    try {
      await performAction("update_method", { method: refs.quickMethod.value });
    } catch (error) {
      showNotice(refs.actionNotice, error.message, true);
    }
  });

  refs.manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await performAction("create_manual_record", {
        hora_intento: refs.manualIntent.value,
        hora_sueno_efectivo: refs.manualSleep.value,
        hora_despertar: refs.manualWake.value,
        method: refs.manualMethod.value,
      });
      showNotice(refs.manualNotice, "Registro guardado.");
      prefillManualForm();
    } catch (error) {
      showNotice(refs.manualNotice, error.message, true);
    }
  });

  refs.resetManualForm.addEventListener("click", () => {
    prefillManualForm();
    hideNotice(refs.manualNotice);
  });
}

function hydrateStoredProfile() {
  const stored = loadStoredProfile();
  if (!stored) {
    return;
  }

  state.profile = stored;
  refs.babyName.value = stored.babyName || "";
  refs.caregiverName.value = stored.caregiverName || "";
  refs.defaultMethod.value = stored.defaultMethod || "cuna";
  refs.quickMethod.value = stored.defaultMethod || "cuna";
  refs.manualMethod.value = stored.defaultMethod || "cuna";
  const name = stored.babyName || "Suenolytics";
  document.title = `${name} · Sueño`;
  refs.appTitle.textContent = name;
}

function updateProfileGate() {
  const hasProfile = Boolean(state.profile?.userId);
  refs.profileGate.classList.toggle("hidden", hasProfile);
  refs.sleepContent.classList.toggle("hidden", !hasProfile);
}

async function saveProfile() {
  const payload = {
    caregiver_name: refs.caregiverName.value.trim(),
    baby_name: refs.babyName.value.trim(),
    default_method: refs.defaultMethod.value,
  };
  if (state.profile?.userId) {
    payload.user_id = state.profile.userId;
  }

  const response = await fetch("/api/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "No se ha podido guardar el perfil.");
  }

  state.profile = data.profile;
  saveStoredProfile(data.profile);
  hydrateStoredProfile();
  updateProfileGate();
  showNotice(refs.profileNotice, "Perfil guardado.");
  await refreshStatus(false);
}

async function refreshStatus(showMessage) {
  if (!state.profile?.userId) {
    throw new Error("Guarda primero un perfil local para esta PWA.");
  }

  const response = await fetch(`/api/status?user_id=${encodeURIComponent(state.profile.userId)}`);
  const data = await parseJsonResponse(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "No se ha podido cargar el estado.");
  }

  state.status = data.status;
  if (data.status.profile) {
    state.profile = {
      ...state.profile,
      ...data.status.profile,
      defaultMethod: state.profile.defaultMethod || "cuna",
    };
    saveStoredProfile(state.profile);
    hydrateStoredProfile();
  }

  renderStatus();
  updateProfileGate();
  if (showMessage) {
    showNotice(refs.actionNotice, "Datos actualizados.");
  }
}

async function performAction(action, extraPayload = {}) {
  if (!state.profile?.userId) {
    throw new Error("Guarda primero un perfil para usar la app.");
  }

  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action,
      user_id: state.profile.userId,
      timezone: refs.timeZone.value,
      ...extraPayload,
    }),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "No se ha podido ejecutar la acción.");
  }

  state.status = data.status;
  renderStatus();
  showNotice(refs.actionNotice, data.result?.message || "Listo.");
}

async function parseJsonResponse(response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) {
    throw new Error(
      response.ok
        ? "El servidor no devolvió JSON válido."
        : `Error del servidor (${response.status}). Prueba de nuevo o revisa el despliegue.`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Respuesta del servidor ilegible (no es JSON).");
  }
}

function renderLastSleepWelcome() {
  const last = state.status?.lastCompletedSleep;
  if (!last?.fellAsleepLabel) {
    refs.lastSleepSummary.textContent = "Sin datos todavía";
    refs.lastSleepSub.textContent = "Cuando cierres una siesta, verás aquí la hora y la duración.";
    return;
  }

  refs.lastSleepSummary.textContent = `Se durmió a las ${last.fellAsleepLabel}`;
  refs.lastSleepSub.textContent = `Duración: ${last.durationLabel || "—"}`;
}

function renderStatus() {
  const status = state.status;
  if (!status) {
    if (refs.stateMetric) refs.stateMetric.textContent = "En espera";
    if (refs.stateHelper) refs.stateHelper.textContent = "";
    refs.timerPhaseLabel.textContent = "Listo";
    refs.timerMetric.textContent = "00:00";
    refs.timerHelper.textContent = "";
    refs.sleepTodayMetric.textContent = "0 min";
    refs.latencyMetric.textContent = "—";
    refs.recordsList.innerHTML =
      '<div class="record-item record-item--empty">Aún no hay registros hoy.</div>';
    renderLastSleepWelcome();
    refs.startAction.classList.remove("hidden");
    refs.markAsleepAction.classList.add("hidden");
    refs.markAwakeAction.classList.add("hidden");
    refs.cancelAction.classList.add("hidden");
    refs.startAction.disabled = true;
    refs.markAsleepAction.disabled = true;
    refs.cancelAction.disabled = true;
    refs.markAwakeAction.disabled = true;
    return;
  }

  if (refs.stateMetric) refs.stateMetric.textContent = status.stateLabel;
  if (refs.stateHelper) refs.stateHelper.textContent = status.stateDescription;

  refs.timerHelper.textContent = status.stateDescription;
  refs.sleepTodayMetric.textContent = status.summary.sleepTodayLabel;
  refs.latencyMetric.textContent =
    status.summary.averageLatencyLabel === "0 min" && status.summary.attemptsToday === 0
      ? "—"
      : status.summary.averageLatencyLabel;

  refs.quickMethod.value = status.activeRecord?.metodo || state.profile?.defaultMethod || "cuna";
  refs.manualMethod.value = status.activeRecord?.metodo || state.profile?.defaultMethod || "cuna";
  renderLastSleepWelcome();
  renderActionState(status.state);
  renderRecentRecords(status.recentRecords || []);
  renderLiveTimer();
}

function renderActionState(stateLabel) {
  const waiting = stateLabel === "WAITING";
  const trying = stateLabel === "TRYING";
  const sleeping = stateLabel === "SLEEPING";

  refs.startAction.disabled = !waiting;
  refs.markAsleepAction.disabled = !trying;
  refs.cancelAction.disabled = !trying;
  refs.markAwakeAction.disabled = !sleeping;

  refs.startAction.classList.toggle("hidden", !waiting);
  refs.markAsleepAction.classList.toggle("hidden", !trying);
  refs.cancelAction.classList.toggle("hidden", !trying);
  refs.markAwakeAction.classList.toggle("hidden", !sleeping);
}

function renderRecentRecords(records) {
  if (!records.length) {
    refs.recordsList.innerHTML =
      '<div class="record-item record-item--empty">Aún no hay registros hoy.</div>';
    return;
  }

  refs.recordsList.innerHTML = records
    .map(
      (record) => `
        <article class="record-item">
          <div class="record-item__top">
            <strong>${escapeHtml(record.startLabel)}</strong>
            <span class="record-item__badge">${escapeHtml(record.estado)}</span>
          </div>
          <p>${escapeHtml(record.metodo || "sin método")} · latencia ${escapeHtml(record.latencyMinutes == null ? "—" : `${record.latencyMinutes} min`)}</p>
          <p>${escapeHtml(record.sleepDurationLabel || "sin cierre")}</p>
        </article>
      `,
    )
    .join("");
}

function renderLiveTimer() {
  const activeRecord = state.status?.activeRecord;
  if (!activeRecord) {
    refs.timerMetric.textContent = "00:00";
    refs.timerPhaseLabel.textContent = "Listo";
    return;
  }

  const now = Date.now();
  if (state.status.state === "TRYING" && activeRecord.hora_intento) {
    refs.timerPhaseLabel.textContent = "Intentando dormir";
    refs.timerMetric.textContent = formatBigDuration(now - Date.parse(activeRecord.hora_intento));
    return;
  }

  if (state.status.state === "SLEEPING" && activeRecord.hora_sueno_efectivo) {
    refs.timerPhaseLabel.textContent = "Durmiendo";
    refs.timerMetric.textContent = formatBigDuration(now - Date.parse(activeRecord.hora_sueno_efectivo));
    return;
  }

  refs.timerMetric.textContent = "00:00";
  refs.timerPhaseLabel.textContent = "Listo";
}

/** Reloj grande: MM:SS si &lt; 1 h, si no HH:MM:SS */
function formatBigDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function prefillManualForm() {
  refs.manualIntent.value = currentTimeSuggestion(18);
  refs.manualSleep.value = currentTimeSuggestion(6);
  refs.manualWake.value = currentTimeSuggestion(1);
  refs.manualMethod.value = refs.quickMethod.value || refs.defaultMethod.value || "cuna";
}

function currentTimeSuggestion(minutesAgo) {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date.toTimeString().slice(0, 5);
}

function setOnlineStatus(isOnline) {
  refs.onlineStatus.textContent = isOnline ? "En línea" : "Sin conexión";
  refs.onlineStatus.dataset.offline = String(!isOnline);
}

function showNotice(element, message, isError = false) {
  element.textContent = message;
  element.classList.remove("hidden");
  element.dataset.variant = isError ? "error" : "success";
  window.clearTimeout(state.noticeTimeouts.get(element.id));
  const timeoutId = window.setTimeout(() => {
    hideNotice(element);
  }, 4000);
  state.noticeTimeouts.set(element.id, timeoutId);
}

function hideNotice(element) {
  element.classList.add("hidden");
  element.textContent = "";
  delete element.dataset.variant;
}

function loadStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveStoredProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
