(() => {
  const { loadStore, saveStore, syncStore, exportSyncedJSON } = window.TimerData;
  let store = loadStore();

  const els = {
    projectForm: document.getElementById("projectForm"),
    projectName: document.getElementById("projectName"),
    colorA: document.getElementById("colorA"),
    colorB: document.getElementById("colorB"),
    projectList: document.getElementById("projectList"),
    syncBtn: document.getElementById("syncBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    uploadJson: document.getElementById("uploadJson"),
    syncInfo: document.getElementById("syncInfo")
  };

  const updateSyncText = () => {
    els.syncInfo.textContent = `Última sincronización: ${store.lastSyncedAt ? new Date(store.lastSyncedAt).toLocaleString("es-ES") : "Nunca"}`;
  };

  const renderProjects = () => {
    els.projectList.innerHTML = store.projects.map((p) => `
      <div class="project-item">
        <div><strong>${p.name}</strong><br><small>${p.id}</small></div>
        <div>
          <span class="swatch" style="background:${p.bgA}"></span> A
          <span class="swatch" style="background:${p.bgB}"></span> B
          <button data-remove="${p.id}" type="button">Eliminar</button>
        </div>
      </div>
    `).join("");

    els.projectList.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove");
        if (store.projects.length === 1) return;
        store.projects = store.projects.filter((p) => p.id !== id);
        if (store.selectedProjectId === id) store.selectedProjectId = store.projects[0].id;
        saveStore(store);
        renderProjects();
      });
    });
  };

  els.projectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.projectName.value.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (store.projects.some((p) => p.id === id)) return;
    store.projects.push({ id, name, bgA: els.colorA.value, bgB: els.colorB.value });
    saveStore(store);
    els.projectForm.reset();
    renderProjects();
  });

  els.syncBtn.addEventListener("click", () => {
    syncStore(store);
    updateSyncText();
  });

  els.downloadBtn.addEventListener("click", () => exportSyncedJSON(store));

  els.uploadJson.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text);
    store.projects = json.projects || store.projects;
    store.syncedDays = json.syncedDays || {};
    store.days = JSON.parse(JSON.stringify(store.syncedDays));
    store.lastSyncedAt = json.lastSyncedAt || Date.now();
    saveStore(store);
    renderProjects();
    updateSyncText();
  });

  renderProjects();
  updateSyncText();
})();
