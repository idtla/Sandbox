(function () {
  const STORAGE_KEY = "project_timer_glass_v4";
  const DEFAULT_PROJECTS = [
    { id: "vass", name: "VASS", bgA: "#4bbcee", bgB: "#0d3b4a" },
    { id: "sapos", name: "Sapos y Princesas", bgA: "#00a632", bgB: "#003d14" },
    { id: "knowmad", name: "Knowmad Project", bgA: "#2a9d8f", bgB: "#124e47" }
  ];

  const nowISODate = () => new Date().toISOString().slice(0, 10);
  const fmtHMS = (ms) => {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const createDay = () => ({ projects: {}, breakMs: 0, breakLogs: [] });

  const newStore = () => ({
    selectedProjectId: DEFAULT_PROJECTS[0].id,
    mode: "work",
    running: false,
    startedAt: null,
    accSessionMs: 0,
    days: {},
    syncedDays: {},
    lastSyncedAt: null,
    projects: DEFAULT_PROJECTS
  });

  const ensureDay = (container, dayKey) => {
    container[dayKey] ??= createDay();
    container[dayKey].projects ??= {};
    container[dayKey].breakMs ??= 0;
    container[dayKey].breakLogs ??= [];
    return container[dayKey];
  };

  const ensureDayProject = (store, dayKey, projectId) => {
    const day = ensureDay(store.days, dayKey);
    day.projects[projectId] ??= { workMs: 0, logs: [] };
    return day.projects[projectId];
  };

  const migrateLegacyDays = (days) => {
    const migrated = {};
    Object.entries(days || {}).forEach(([dayKey, dayValue]) => {
      if (dayValue && dayValue.projects) {
        migrated[dayKey] = dayValue;
        return;
      }
      const target = createDay();
      Object.entries(dayValue || {}).forEach(([projectId, bucket]) => {
        target.projects[projectId] = {
          workMs: bucket.workMs || 0,
          logs: (bucket.logs || []).filter((l) => l.mode === "work")
        };
        target.breakMs += bucket.breakMs || 0;
        target.breakLogs.push(...(bucket.logs || []).filter((l) => l.mode === "break"));
      });
      migrated[dayKey] = target;
    });
    return migrated;
  };

  const loadStore = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const store = newStore();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        return store;
      }
      const parsed = JSON.parse(raw);
      parsed.projects = parsed.projects?.length ? parsed.projects : DEFAULT_PROJECTS;
      parsed.days = migrateLegacyDays(parsed.days || {});
      parsed.syncedDays = migrateLegacyDays(parsed.syncedDays || parsed.days || {});
      if (!parsed.days || Object.keys(parsed.days).length === 0) {
        parsed.days = JSON.parse(JSON.stringify(parsed.syncedDays || {}));
      }
      return parsed;
    } catch {
      return newStore();
    }
  };

  const saveStore = (store) => localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

  const syncStore = (store) => {
    store.syncedDays = JSON.parse(JSON.stringify(store.days));
    store.lastSyncedAt = Date.now();
    saveStore(store);
    return store;
  };

  const exportSyncedJSON = (store) => {
    const payload = {
      projects: store.projects,
      syncedDays: store.syncedDays,
      lastSyncedAt: store.lastSyncedAt
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-timer-sync-${nowISODate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const applyTheme = (projects, projectId) => {
    const p = projects.find((x) => x.id === projectId) || projects[0];
    if (!p) return;
    document.documentElement.style.setProperty("--bg-a", p.bgA);
    document.documentElement.style.setProperty("--bg-b", p.bgB);
  };

  window.TimerData = {
    STORAGE_KEY,
    nowISODate,
    fmtHMS,
    loadStore,
    saveStore,
    ensureDay,
    ensureDayProject,
    syncStore,
    exportSyncedJSON,
    applyTheme
  };
})();
