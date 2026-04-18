const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
document.getElementById("tz-text").textContent = tz;

const registroTab = document.getElementById("tab-registro");
const analiticasTab = document.getElementById("tab-analiticas");
const btnRegistro = document.getElementById("tab-btn-registro");
const btnAnaliticas = document.getElementById("tab-btn-analiticas");

btnRegistro.addEventListener("click", () => setTab("registro"));
btnAnaliticas.addEventListener("click", () => setTab("analiticas"));

function setTab(tab) {
  const isRegistro = tab === "registro";
  registroTab.classList.toggle("active", isRegistro);
  analiticasTab.classList.toggle("active", !isRegistro);
  btnRegistro.classList.toggle("active", isRegistro);
  btnAnaliticas.classList.toggle("active", !isRegistro);
}

const form = document.getElementById("registro-form");
const formMsg = document.getElementById("form-msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    user_id: v("userId"),
    estado: v("estado"),
    hora_intento: dt("horaIntento"),
    hora_sueno_efectivo: dt("horaDormido"),
    hora_despertar: dt("horaDespertar"),
    metodo: v("metodo") || null,
  };

  const res = await fetch("/api/registros", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    formMsg.textContent = `❌ ${data.error || "Error al guardar"}`;
    formMsg.style.color = "#b91c1c";
    return;
  }

  formMsg.textContent = "✅ Registro guardado";
  formMsg.style.color = "#166534";
  await Promise.all([loadRegistros(), loadAnaliticas()]);
});

document.getElementById("reload-registros").addEventListener("click", loadRegistros);
document.getElementById("reload-analiticas").addEventListener("click", loadAnaliticas);

async function loadRegistros() {
  const userId = v("userId");
  if (!userId) return;

  const res = await fetch(`/api/registros?user_id=${encodeURIComponent(userId)}`);
  const data = await res.json();
  const lista = document.getElementById("registros-lista");

  if (!res.ok) {
    lista.innerHTML = `<p>❌ ${data.error || "Error cargando registros"}</p>`;
    return;
  }

  if (!data.data.length) {
    lista.innerHTML = "<p>Sin registros todavía.</p>";
    return;
  }

  lista.innerHTML = data.data
    .map((r) => `
      <div class="row">
        <strong>${r.estado}</strong> · método: ${r.metodo || "-"}<br/>
        intento: ${fmt(r.hora_intento)}<br/>
        dormido: ${fmt(r.hora_sueno_efectivo)} · despertó: ${fmt(r.hora_despertar)}
      </div>
    `)
    .join("");
}

async function loadAnaliticas() {
  const userId = v("userId");
  if (!userId) return;

  const res = await fetch(`/api/analiticas?user_id=${encodeURIComponent(userId)}&tz=${encodeURIComponent(tz)}`);
  const data = await res.json();
  if (!res.ok) return;

  document.getElementById("stat-registros").textContent = String(data.registros);
  document.getElementById("stat-latencia").textContent = `${data.latencia_media_min} min`;
  document.getElementById("stat-sueno").textContent = formatMinutes(data.sueno_total_min);
}

function v(id) {
  return document.getElementById(id).value.trim();
}

function dt(id) {
  const raw = document.getElementById(id).value;
  return raw ? new Date(raw).toISOString() : null;
}

function fmt(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-ES");
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
