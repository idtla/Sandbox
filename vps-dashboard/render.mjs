// Convierte la salida de collect.sh en un dashboard HTML autocontenido.
// Guarda cada captura en snapshots/ y compara con la anterior: lo que importa
// no es la foto, es el cambio.
//
//   node render.mjs <raw.txt> <salida.html>

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = import.meta.dirname;
const SNAPDIR = join(DIR, "snapshots");
const [, , rawPath, outPath] = process.argv;
if (!rawPath || !outPath) {
  console.error("uso: node render.mjs <raw.txt> <salida.html>");
  process.exit(1);
}

/* ------------------------------------------------------------------ parseo */

const raw = readFileSync(rawPath, "utf8");
const S = {};
{
  let cur = "_pre";
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^##::SECTION::(\w+)$/);
    if (m) { cur = m[1]; S[cur] = []; continue; }
    (S[cur] ||= []).push(line);
  }
  for (const k of Object.keys(S)) {
    while (S[k].length && !S[k][0].trim()) S[k].shift();
    while (S[k].length && !S[k].at(-1).trim()) S[k].pop();
  }
}
const sec = (n) => S[n] || [];
const lines = (n) => sec(n).filter((l) => l.trim());
const text = (n) => sec(n).join("\n");

if (!lines("end").includes("OK")) {
  console.error("AVISO: la captura parece incompleta (falta el marcador final).");
}

function humanUptime(secs) {
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d} día${d === 1 ? "" : "s"}`);
  if (h) parts.push(`${h} h`);
  if (!d && m) parts.push(`${m} min`);
  return parts.join(" ") || "menos de un minuto";
}

const meta = (() => {
  const l = lines("meta");
  const secs = +(text("meta").match(/UPTIME_S=(\d+)/)?.[1] ?? 0);
  return {
    capturedAt: l[0] || new Date().toISOString(),
    host: l[1] || "?",
    os: l[2] || "?",
    kernel: l[3] || "?",
    uptime: secs ? humanUptime(secs) : (l[4] || "").replace(/^up /, ""),
    load: l[5] || "",
    rebootRequired: /REBOOT_REQUIRED=si/.test(text("meta")),
  };
})();

const disks = lines("disk").slice(1).map((l) => {
  const p = l.split(/\s+/);
  return { fs: p[0], type: p[1], size: p[2], used: p[3], avail: p[4], pct: parseInt(p[5], 10) || 0, mount: p[6] };
});
const inodes = lines("inodes").slice(1).map((l) => {
  const p = l.split(/\s+/);
  return { fs: p[0], pct: parseInt(p[4], 10) || 0, mount: p[5] };
});
const duList = (n) => lines(n).map((l) => {
  const [mb, ...rest] = l.split(/\t|\s{2,}|\s+/);
  return { mb: parseInt(mb, 10) || 0, path: rest.join(" ") };
}).filter((d) => d.path);

const duRoot = duList("du_root");
const duHomes = duList("du_homes");

const mem = (() => {
  const l = lines("mem")[1] || "";
  const p = l.split(/\s+/);
  const swap = (lines("mem")[2] || "").split(/\s+/);
  return { total: +p[1] || 0, used: +p[2] || 0, available: +p[6] || 0, swapTotal: +swap[1] || 0 };
})();

const SCOPE_RANK = { todas: 0, otra: 1, tailscale: 2, loopback: 3 };

const parseJson = (n) => { try { return JSON.parse(lines(n)[0] || "[]"); } catch { return []; } };
const pm2 = [...parseJson("pm2").map((p) => ({ ...p, owner: "claude" })),
             ...parseJson("pm2_arcack").map((p) => ({ ...p, owner: "arcack" }))];

const services = lines("services_running").map((l) => {
  const m = l.match(/^(\S+)\s+loaded\s+active\s+running\s+(.*)$/);
  return m ? { unit: m[1], desc: m[2].trim() } : null;
}).filter(Boolean);

const unitsLocal = lines("units_local").map((l) => {
  const m = l.match(/^(\S+)\s+\S+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(\S+)(?:\s+->\s+(\S+))?$/);
  if (!m) return null;
  return { mtime: `${m[3]} ${m[4]}`, path: m[5], link: m[6] || null, isLink: l.startsWith("l") };
}).filter(Boolean);

// --- puertos y exposición ---------------------------------------------------
const TAILSCALE_V4 = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;
function classifyAddr(addr) {
  if (/^127\./.test(addr) || addr === "[::1]" || /^127\.0\.0\.\d+%/.test(addr)) return "loopback";
  if (TAILSCALE_V4.test(addr) || /^\[?fd7a:/.test(addr)) return "tailscale";
  if (addr === "0.0.0.0" || addr === "[::]" || addr === "*") return "todas";
  return "otra";
}
const ports = lines("ports").map((l) => {
  const m = l.match(/^(\w+)\s+(\S+)\s+\d+\s+\d+\s+(\S+):(\d+)\s+\S+\s*(?:users:\((.*)\))?/);
  if (!m) return null;
  const procs = [...(m[5] || "").matchAll(/\("([^"]+)",pid=(\d+)/g)].map((x) => ({ name: x[1], pid: +x[2] }));
  return { proto: m[1], addr: m[3], port: +m[4], scope: classifyAddr(m[3]), procs };
}).filter(Boolean);

// --- cortafuegos ------------------------------------------------------------
const ufwActive = /Status:\s*active/.test(text("ufw"));
const ufwDenyIn = /Default:\s*deny \(incoming\)/.test(text("ufw"));
const ufwRules = lines("ufw")
  .filter((l) => /ALLOW|DENY|REJECT|LIMIT/.test(l) && !/^Default:/.test(l))
  .map((l) => l.replace(/\s+/g, " ").trim());
// Puertos realmente alcanzables desde internet: reglas sin "on <iface>"
const internetOpen = new Set();
for (const r of ufwRules) {
  if (!/ALLOW IN/.test(r)) continue;
  if (/\bon \S+/.test(r)) continue;              // limitada a una interfaz (p.ej. tailscale0)
  const to = r.split(/ALLOW IN/)[0];
  for (const num of to.matchAll(/\b(\d{1,5})(?:\/tcp|\/udp)?\b/g)) internetOpen.add(+num[1]);
}
const publicPorts = ports.filter((p) => p.scope === "todas" || p.scope === "otra");
const reachablePorts = publicPorts.filter((p) => internetOpen.has(p.port));
const shieldedPorts = publicPorts.filter((p) => !internetOpen.has(p.port));

// --- ssh --------------------------------------------------------------------
const sshd = Object.fromEntries(lines("sshd").map((l) => {
  const i = l.indexOf(" ");
  return [l.slice(0, i), l.slice(i + 1)];
}));
const sshAccepts = lines("ssh_accept_agg").map((l) => {
  const m = l.match(/^\s*(\d+)\s+Accepted (\w+) for (\S+) from (\S+)$/);
  return m ? { count: +m[1], method: m[2], user: m[3], from: m[4] } : null;
}).filter(Boolean);
const sshRecent = lines("ssh_accept_recent").map((l) => {
  const m = l.match(/^(\w{3} +\d+ [\d:]+).*Accepted (\w+) for (\S+) from (\S+) port.*?(SHA256:\S+)?$/);
  return m ? { when: m[1], method: m[2], user: m[3], from: m[4], key: m[5] || "" } : null;
}).filter(Boolean).reverse();
const sshFailed = +(text("ssh_failed").match(/FAILED=(\d+)/)?.[1] ?? 0);
const sshInvalid = +(text("ssh_failed").match(/INVALID=(\d+)/)?.[1] ?? 0);

// --- cuentas ----------------------------------------------------------------
const users = lines("users").map((l) => {
  const m = l.match(/^(\S+) uid=(\d+) shell=(\S+)$/);
  return m ? { name: m[1], uid: +m[2], shell: m[3] } : null;
}).filter(Boolean);
const uid0 = users.filter((u) => u.uid === 0).map((u) => u.name);
const sudoers = lines("groups_priv").find((l) => l.startsWith("sudo:"))?.split(":")[3]?.split(",").filter(Boolean) || [];
const authKeys = lines("authkeys").map((l) => {
  const m = l.match(/^(\S+) :: (\d+) (SHA256:\S+) (.*) \((\w+)\)$/);
  return m ? { file: m[1], bits: +m[2], fp: m[3], comment: m[4], type: m[5] } : null;
}).filter(Boolean);
const nopasswd = lines("sudoers");

// --- web --------------------------------------------------------------------
const serverNames = lines("nginx_conf").filter((l) => l.startsWith("server_name")).map((l) => l.replace(/server_name\s+|;/g, "").trim());
const webRoots = lines("nginx_conf").filter((l) => /^root /.test(l)).map((l) => l.replace(/^root\s+|;/g, "").trim());
const proxyPass = lines("nginx_conf").filter((l) => l.startsWith("proxy_pass")).map((l) => l.replace(/proxy_pass\s+|;/g, "").trim());
const webFp = Object.fromEntries(lines("web_fingerprint").map((l) => l.split("=")));
const webRecent = lines("web_recent");
const webSuspicious = lines("web_suspicious");

// --- señales varias ---------------------------------------------------------
const tmpExec = lines("tmp_exec");
const procDeleted = lines("proc_deleted").map((l) => l.replace(/^.*?(\/proc\/\S+ -> .*)$/, "$1"));
const procTop = lines("proc_top").slice(1).map((l) => {
  const p = l.trim().split(/\s+/);
  return { user: p[0], pid: p[1], cpu: p[2], mem: p[3], secs: +p[4], cmd: p.slice(5).join(" ") };
});
const suid = lines("suid");
const integrity = lines("integrity").map((l) => {
  const m = l.match(/^(\S+)\s+(\S+ \S+)\s+(\S+)$/);
  return m ? { hash: m[1], mtime: m[2], path: m[3] } : null;
}).filter(Boolean);
const aptRaw = text("updates").match(/APT_CHECK=(\d+);(\d+)/);
const apt = { total: +(aptRaw?.[1] ?? 0), security: +(aptRaw?.[2] ?? 0) };
const unattended = /UNATTENDED=enabled/.test(text("updates"));
const established = lines("established").map((l) => {
  const m = l.match(/^\S+\s+\d+\s+\d+\s+(\S+):(\d+)\s+(\S+):(\d+)\s*(?:users:\((.*)\))?/);
  if (!m) return null;
  const proc = (m[5] || "").match(/\("([^"]+)"/)?.[1] || "?";
  return { local: `${m[1]}:${m[2]}`, remote: m[3].replace(/^\[::ffff:/, "").replace(/\]$/, ""), rport: +m[4], proc };
}).filter(Boolean);
const tailscalePeers = lines("tailscale").filter((l) => /^\d/.test(l)).map((l) => {
  const p = l.trim().split(/\s{2,}/);
  return { ip: p[0], name: p[1], user: p[2], os: p[3], state: p[4] || "" };
});
const tsServe = text("tailscale").split("--- serve ---")[1]?.trim() || "";
const cron = lines("cron");
const sudoRecent = lines("sudo_recent");
const accountChanges = lines("account_changes");

/* ---------------------------------------------------------------- snapshot */

const snapshot = {
  capturedAt: meta.capturedAt,
  host: meta.host,
  diskPct: disks.find((d) => d.mount === "/")?.pct ?? 0,
  keys: {
    usuarios: users.map((u) => `${u.name} uid=${u.uid} ${u.shell}`),
    grupo_sudo: sudoers,
    sudo_sin_password: nopasswd,
    claves_ssh: authKeys.map((k) => `${k.fp} ${k.comment} → ${k.file}`),
    puertos: ports.map((p) => `${p.proto} ${p.addr}:${p.port} (${p.scope}) ${p.procs.map((x) => x.name).join(",")}`),
    reglas_firewall: ufwRules,
    ssh_config: Object.entries(sshd).map(([k, v]) => `${k} ${v}`),
    servicios: services.map((s) => s.unit),
    unidades_systemd: unitsLocal.map((u) => `${u.path} (${u.mtime})`),
    pm2: pm2.map((p) => `${p.name} [${p.status}] ${p.script}`),
    cron: cron,
    webs_nginx: [...serverNames, ...webRoots, ...proxyPass],
    huella_web: [`FILES=${webFp.FILES} BYTES=${webFp.BYTES} HASH=${webFp.HASH}`],
    binarios_suid: suid,
    ficheros_criticos: integrity.map((f) => `${f.hash} ${f.path}`),
  },
};

mkdirSync(SNAPDIR, { recursive: true });
const prevFiles = readdirSync(SNAPDIR).filter((f) => f.endsWith(".json")).sort();
const prev = prevFiles.length ? JSON.parse(readFileSync(join(SNAPDIR, prevFiles.at(-1)), "utf8")) : null;
const history = prevFiles.slice(-40).map((f) => {
  try { const s = JSON.parse(readFileSync(join(SNAPDIR, f), "utf8")); return { at: s.capturedAt, diskPct: s.diskPct, score: s.score ?? null }; }
  catch { return null; }
}).filter(Boolean);

// diff frente a la captura anterior
const diff = [];
if (prev) {
  for (const [k, now] of Object.entries(snapshot.keys)) {
    const before = prev.keys?.[k] || [];
    const added = now.filter((x) => !before.includes(x));
    const removed = before.filter((x) => !now.includes(x));
    if (added.length || removed.length) diff.push({ area: k.replace(/_/g, " "), added, removed });
  }
}

/* ------------------------------------------------------------------ chequeos */

const checks = [];
const check = (label, state, detail) => checks.push({ label, state, detail });
const OK = "ok", WARN = "warn", BAD = "bad";

check("SSH sin contraseña (solo clave)",
  sshd.passwordauthentication === "no" ? OK : BAD,
  `passwordauthentication ${sshd.passwordauthentication}, pubkey ${sshd.pubkeyauthentication}`);

check("Acceso root por SSH deshabilitado",
  sshd.permitrootlogin === "no" ? OK : BAD, `permitrootlogin ${sshd.permitrootlogin}`);

check("Cortafuegos activo y cerrado por defecto",
  ufwActive && ufwDenyIn ? OK : BAD,
  ufwActive ? (ufwDenyIn ? "ufw activo, deny incoming" : "ufw activo pero NO deniega por defecto") : "ufw inactivo");

check("SSH no alcanzable desde internet",
  internetOpen.has(22) ? BAD : OK,
  internetOpen.has(22) ? "el puerto 22 está abierto a Anywhere" : "el puerto 22 solo se acepta por la interfaz tailscale0");

check("Solo los puertos previstos abiertos al exterior",
  reachablePorts.every((p) => [80, 443].includes(p.port)) ? OK : WARN,
  reachablePorts.length
    ? `alcanzables: ${[...new Set(reachablePorts.map((p) => p.port))].sort((a, b) => a - b).join(", ")}`
    : "ninguno");

check("Sin cuentas root adicionales",
  uid0.length === 1 ? OK : BAD, `uid 0: ${uid0.join(", ")}`);

check("Claves SSH autorizadas conocidas",
  diff.find((d) => d.area === "claves ssh")?.added.length ? BAD : OK,
  `${authKeys.length} clave(s): ${authKeys.map((k) => k.comment).join(", ")}`);

check("Sin intentos de acceso fallidos",
  sshFailed + sshInvalid === 0 ? OK : (sshFailed + sshInvalid < 50 ? WARN : BAD),
  `${sshFailed} contraseñas fallidas, ${sshInvalid} usuarios inválidos en 30 días`);

check("Contenido web sin cambios recientes",
  webRecent.length === 0 ? OK : WARN,
  webRecent.length ? `${webRecent.length} fichero(s) modificados en 14 días bajo /var/www` : "nada tocado en 14 días");

check("Sin scripts ejecutables sospechosos en la web",
  webSuspicious.length === 0 ? OK : BAD,
  webSuspicious.length ? webSuspicious.slice(0, 3).join(" · ") : "ni .php/.cgi/.sh ni directorios escribibles por todos");

check("Huella del contenido publicado estable",
  diff.find((d) => d.area === "huella web") ? WARN : OK,
  `${webFp.FILES} ficheros, huella ${webFp.HASH}`);

check("Binarios SUID sin alteraciones",
  diff.find((d) => d.area === "binarios suid")?.added.length ? BAD : OK,
  `${suid.length} binarios SUID, los estándar de Ubuntu`);

check("Ficheros críticos del sistema sin cambios",
  diff.find((d) => d.area === "ficheros criticos")?.added.length ? BAD : OK,
  "/etc/passwd, /etc/shadow, /etc/sudoers, sshd_config, authorized_keys");

check("Sin procesos ejecutando binarios borrados",
  procDeleted.length === 0 ? OK : WARN,
  procDeleted.length ? `${procDeleted.length} proceso(s) con el binario ya borrado en disco` : "ninguno");

check("Sin ejecutables extraños en /tmp",
  tmpExec.length === 0 ? OK : WARN,
  tmpExec.length ? `${tmpExec.length} fichero(s) ejecutables o scripts en /tmp` : "limpio");

check("Actualizaciones de seguridad al día",
  apt.security === 0 ? OK : (apt.security < 10 ? WARN : BAD),
  `${apt.security} de seguridad pendientes, ${apt.total} en total`);

check("Actualizaciones automáticas activadas",
  unattended ? OK : WARN, unattended ? "unattended-upgrades habilitado" : "unattended-upgrades desactivado");

check("Sin reinicio pendiente",
  meta.rebootRequired ? WARN : OK,
  meta.rebootRequired ? `hay un reinicio pendiente y el equipo lleva ${meta.uptime} sin reiniciar` : "no hace falta reiniciar");

const nopasswdUsers = nopasswd.map((l) => l.trim().split(/\s+/)[0]).filter((u) => u !== "root");
check("Sudo sin contraseña acotado",
  nopasswdUsers.length === 0 ? OK : (nopasswdUsers.length <= 1 ? WARN : BAD),
  nopasswdUsers.length
    ? `${nopasswdUsers.join(", ")} puede hacer cualquier cosa como root sin teclear contraseña`
    : "solo root tiene NOPASSWD");

check("Sin cuentas nuevas ni cambios de grupo",
  accountChanges.length === 0 && !diff.find((d) => d.area === "usuarios") ? OK : WARN,
  accountChanges.length ? `${accountChanges.length} evento(s) en el journal` : "sin altas ni modificaciones en 30 días");

const nOk = checks.filter((c) => c.state === OK).length;
const nWarn = checks.filter((c) => c.state === WARN).length;
const nBad = checks.filter((c) => c.state === BAD).length;
const score = Math.round((nOk / checks.length) * 100);
snapshot.score = score;

const stamp = meta.capturedAt.replace(/[:+]/g, "-").slice(0, 19);
writeFileSync(join(SNAPDIR, `${stamp}.json`), JSON.stringify(snapshot, null, 1));
history.push({ at: meta.capturedAt, diskPct: snapshot.diskPct, score });

/* -------------------------------------------------------------------- html */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gb = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
const ICON = { ok: "✓", warn: "!", bad: "✕" };
const WORD = { ok: "correcto", warn: "aviso", bad: "revisar" };

function meterRow(label, pct, right) {
  return `<div class="meter">
    <div class="meter-head"><span>${esc(label)}</span><span class="num">${esc(right)}</span></div>
    <div class="meter-track"><div class="meter-fill" style="width:${Math.max(pct, 0.8)}%"></div></div>
  </div>`;
}

function barChart(items, { unit = "GB", width = 560 } = {}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const rowH = 26, gap = 6, labelW = 190, valueW = 62;
  const plotW = width - labelW - valueW;
  const h = items.length * (rowH + gap);
  const bars = items.map((it, i) => {
    const y = i * (rowH + gap);
    const w = Math.max((it.value / max) * plotW, 2);
    return `<g><title>${esc(it.label)} — ${it.value.toFixed(1)} ${unit}</title>
      <text class="cat" x="${labelW - 10}" y="${y + rowH / 2}" text-anchor="end" dominant-baseline="central">${esc(it.label)}</text>
      <rect class="bar" x="${labelW}" y="${y + 3}" width="${w}" height="${rowH - 6}" rx="4"/>
      <text class="val" x="${labelW + w + 8}" y="${y + rowH / 2}" dominant-baseline="central">${it.value.toFixed(1)}</text>
    </g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${h}" role="img" aria-label="Tamaño en ${unit} por directorio">${bars}</svg>`;
}

function statusBar(counts) {
  const total = counts.reduce((a, c) => a + c.n, 0) || 1;
  const width = 560, h = 34, gap = 2;
  let x = 0;
  const segs = counts.filter((c) => c.n > 0).map((c) => {
    const w = (c.n / total) * width - gap;
    const seg = `<g><title>${c.n} ${c.label}</title>
      <rect x="${x}" y="0" width="${Math.max(w, 2)}" height="${h}" rx="4" fill="${c.color}"/>
      ${w > 74 ? `<text class="seg" x="${x + 10}" y="${h / 2}" dominant-baseline="central">${c.icon} ${c.n} ${esc(c.label)}</text>` : ""}
    </g>`;
    x += w + gap;
    return seg;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${h}" role="img" aria-label="Reparto de comprobaciones por estado">${segs}</svg>`;
}

function lineChart(points, { label, unit = "", max = 100 }) {
  if (points.length < 2) {
    return `<p class="empty">Se dibujará a partir de la segunda captura — hoy solo hay ${points.length}.</p>`;
  }
  const width = 270, height = 110, pad = { t: 12, r: 34, b: 20, l: 30 };
  const pw = width - pad.l - pad.r, ph = height - pad.t - pad.b;
  const X = (i) => pad.l + (i / (points.length - 1)) * pw;
  const Y = (v) => pad.t + ph - (v / max) * ph;
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const grid = [0, 0.5, 1].map((f) => `<line class="grid" x1="${pad.l}" x2="${pad.l + pw}" y1="${pad.t + ph * f}" y2="${pad.t + ph * f}"/>`).join("");
  const dots = points.map((p, i) => `<g><title>${esc(p.at)} — ${p.v}${unit}</title><circle class="dot" cx="${X(i)}" cy="${Y(p.v)}" r="4.5"/></g>`).join("");
  const last = points.at(-1);
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
    ${grid}
    <text class="axis" x="${pad.l - 6}" y="${pad.t}" text-anchor="end" dominant-baseline="central">${max}${unit}</text>
    <text class="axis" x="${pad.l - 6}" y="${pad.t + ph}" text-anchor="end" dominant-baseline="central">0</text>
    <path class="line" d="${d}"/>${dots}
    <text class="val" x="${X(points.length - 1) + 8}" y="${Y(last.v)}" dominant-baseline="central">${last.v}${unit}</text>
  </svg>`;
}

const tbl = (headers, rows) => `<div class="tw"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

const scopeTag = (p) => {
  if (p.scope === "loopback") return `<span class="tag tag-ok">solo local</span>`;
  if (p.scope === "tailscale") return `<span class="tag tag-ok">solo Tailscale</span>`;
  return internetOpen.has(p.port)
    ? `<span class="tag tag-bad">✕ abierto a internet</span>`
    : `<span class="tag tag-warn">! escucha en todas, pero el firewall lo tapa</span>`;
};

const fmtDate = new Date(meta.capturedAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });
const prevDate = prev ? new Date(prev.capturedAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : null;

const rootDisk = disks.find((d) => d.mount === "/") || disks[0];
const topDirs = duHomes.filter((d) => d.path !== "/home" && d.mb >= 20 && d.path.split("/").length <= 4)
  .sort((a, b) => b.mb - a.mb).slice(0, 9)
  .map((d) => ({ label: d.path.replace("/home/", "~"), value: d.mb / 1024 }));

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VPS ${esc(meta.host)} — estado y bastionado</title>
<style>
:root{
  color-scheme: light;
  --surface:#fcfcfb; --plane:#f9f9f7; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781;
  --grid:#e1e0d9; --axis:#c3c2b7; --border:rgba(11,11,11,.10);
  --accent:#2a78d6; --track:#e1e0d9;
  --good:#0ca30c; --warn:#fab219; --bad:#d03b3b;
}
@media (prefers-color-scheme:dark){ :root:where(:not([data-theme=light])){
  color-scheme: dark;
  --surface:#1a1a19; --plane:#0d0d0d; --ink:#fff; --ink2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --axis:#383835; --border:rgba(255,255,255,.10);
  --accent:#3987e5; --track:#2c2c2a;
}}
:root[data-theme=dark]{
  color-scheme: dark;
  --surface:#1a1a19; --plane:#0d0d0d; --ink:#fff; --ink2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --axis:#383835; --border:rgba(255,255,255,.10);
  --accent:#3987e5; --track:#2c2c2a;
}
*{box-sizing:border-box}
body{margin:0;background:var(--plane);color:var(--ink);
  font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:28px 20px 60px}
.wrap{max-width:1180px;margin:0 auto}
header{display:flex;flex-wrap:wrap;gap:16px;align-items:baseline;justify-content:space-between;margin-bottom:6px}
h1{font-size:22px;margin:0;font-weight:650}
h2{font-size:15px;margin:0 0 14px;font-weight:650;letter-spacing:.01em}
.sub{color:var(--ink2);font-size:13px;overflow-wrap:anywhere}
.wrap div{min-width:0}
code,.mono,.pill,.tag{overflow-wrap:anywhere}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));margin-top:18px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 18px 20px}
.card.wide{grid-column:1/-1}
.tw{overflow-x:auto;max-width:100%}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{text-align:left;font-weight:600;color:var(--ink2);padding:5px 10px 5px 0;border-bottom:1px solid var(--grid);white-space:nowrap}
td{padding:6px 10px 6px 0;border-bottom:1px solid var(--grid);vertical-align:top}
tr:last-child td{border-bottom:0}
code,.mono{font-family:ui-monospace,"Cascadia Code",Consolas,monospace;font-size:12.5px}
.num{font-variant-numeric:tabular-nums}
.kpis{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:18px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.kpi .v{font-size:30px;font-weight:600;line-height:1.15;margin-top:2px}
.kpi .k{font-size:12.5px;color:var(--ink2)}
.kpi .n{font-size:12px;color:var(--muted);margin-top:3px}
.meter{margin-bottom:13px}
.meter-head{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}
.meter-track{height:9px;background:var(--track);border-radius:5px;overflow:hidden}
.meter-fill{height:100%;background:var(--accent);border-radius:5px}
.chart{width:100%;height:auto;overflow:visible}
.chart .bar{fill:var(--accent)}
.chart .cat{fill:var(--ink2);font-size:12px}
.chart .val{fill:var(--ink2);font-size:12px;font-variant-numeric:tabular-nums}
.chart .seg{fill:#fff;font-size:12.5px;font-weight:600}
.chart .grid{stroke:var(--grid);stroke-width:1}
.chart .axis{fill:var(--muted);font-size:10.5px}
.chart .line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round}
.chart .dot{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.chart g:hover .bar{opacity:.82}
.check{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--grid)}
.check:last-child{border-bottom:0}
.badge{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:700;margin-top:1px}
.b-ok{background:var(--good)} .b-warn{background:var(--warn);color:#3a2a00} .b-bad{background:var(--bad)}
.check .d{font-size:12.5px;color:var(--ink2)}
.state{font-size:11.5px;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;padding-top:2px}
.tag{display:inline-block;font-size:11.5px;padding:1px 8px;border-radius:99px;border:1px solid var(--border);white-space:nowrap}
.tag-ok{color:var(--good)} .tag-warn{color:var(--ink)} .tag-bad{color:var(--bad);font-weight:600}
.pill{display:inline-block;font-size:11.5px;padding:1px 8px;border-radius:99px;background:var(--track);color:var(--ink2)}
.diff{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:12px;padding:16px 18px;margin-top:18px}
.diff.none{border-left-color:var(--good)}
.diff.some{border-left-color:var(--warn)}
.diff ul{margin:6px 0 0;padding-left:18px}
.diff li{font-size:13px;margin-bottom:3px}
.add{color:var(--bad);font-weight:600} .rem{color:var(--ink2)}
.empty{color:var(--muted);font-size:13px;margin:10px 0 0}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);margin-top:12px}
.legend span{display:flex;align-items:center;gap:6px}
.dotl{width:10px;height:10px;border-radius:3px;display:inline-block}
.two{display:grid;gap:20px;grid-template-columns:1fr 1fr}
@media(max-width:620px){.two{grid-template-columns:1fr}}
footer{color:var(--muted);font-size:12px;margin-top:26px;text-align:center}
</style></head><body><div class="wrap">

<header>
  <div>
    <h1>${esc(meta.host)} <span class="pill">${esc(meta.os)}</span></h1>
    <div class="sub">${esc(fmtDate)} · kernel ${esc(meta.kernel)} · en marcha ${esc(meta.uptime)} · carga ${esc(meta.load)}</div>
  </div>
  <div class="sub">IP pública ${esc(text("listen_check").replace("PUBLIC_IP=", ""))} · Tailscale ${esc(tailscalePeers.find((p) => p.name === meta.host)?.ip || "")}</div>
</header>

<div class="kpis">
  <div class="kpi"><div class="k">Disco libre</div><div class="v num">${esc(rootDisk.avail)}</div><div class="n">de ${esc(rootDisk.size)} · ${rootDisk.pct}% usado</div></div>
  <div class="kpi"><div class="k">Bastionado</div><div class="v num">${score}<span style="font-size:17px;color:var(--ink2)">/100</span></div><div class="n">${nOk} correctos · ${nWarn} avisos · ${nBad} a revisar</div></div>
  <div class="kpi"><div class="k">Apps activas</div><div class="v num">${pm2.filter((p) => p.status === "online").length}<span style="font-size:17px;color:var(--ink2)">/${pm2.length}</span></div><div class="n">PM2 · ${services.length} servicios systemd</div></div>
  <div class="kpi"><div class="k">Abierto a internet</div><div class="v num">${[...new Set(reachablePorts.map((p) => p.port))].length}</div><div class="n">puerto(s): ${[...new Set(reachablePorts.map((p) => p.port))].sort((a, b) => a - b).join(", ") || "ninguno"}</div></div>
  <div class="kpi"><div class="k">Accesos SSH fallidos</div><div class="v num">${sshFailed + sshInvalid}</div><div class="n">en los últimos 30 días</div></div>
</div>

<div class="diff ${diff.length ? "some" : "none"}">
  <h2 style="margin-bottom:8px">${diff.length ? `⚠ ${diff.length} área(s) han cambiado` : "✓ Nada ha cambiado"} desde la captura anterior</h2>
  ${prev ? `<div class="sub">Comparado con ${esc(prevDate)}.</div>` : `<div class="sub">Esta es la primera captura: a partir de la siguiente, aquí aparecerá todo lo que se mueva (usuarios, claves, puertos, servicios, contenido web, ficheros críticos).</div>`}
  ${diff.map((d) => `<div style="margin-top:10px"><strong>${esc(d.area)}</strong><ul>
      ${d.added.map((x) => `<li class="add mono">+ ${esc(x)}</li>`).join("")}
      ${d.removed.map((x) => `<li class="rem mono">− ${esc(x)}</li>`).join("")}
    </ul></div>`).join("")}
</div>

<div class="grid">

  <div class="card">
    <h2>Quién puede entrar</h2>
    ${tbl(["Cuenta", "UID", "Sudo", "Shell"], users.map((u) => [
      `<strong>${esc(u.name)}</strong>`, `<span class="num">${u.uid}</span>`,
      u.uid === 0 ? "root" : (sudoers.includes(u.name) ? (nopasswd.some((l) => l.startsWith(u.name)) ? `<span class="tag tag-warn">sí, sin contraseña</span>` : "sí") : "no"),
      `<code>${esc(u.shell)}</code>`]))}
    <h2 style="margin:18px 0 10px">Claves SSH autorizadas</h2>
    ${tbl(["Clave", "Para", "Huella"], authKeys.map((k) => [
      esc(k.comment), `<code>${esc(k.file.replace("/.ssh/authorized_keys", ""))}</code>`,
      `<code>${esc(k.fp.slice(7, 24))}…</code>`]))}
  </div>

  <div class="card">
    <h2>Accesos reales (30 días)</h2>
    ${tbl(["Veces", "Usuario", "Desde"], sshAccepts.map((a) => [
      `<span class="num">${a.count}</span>`, esc(a.user),
      `<code>${esc(a.from)}</code> ${TAILSCALE_V4.test(a.from) ? `<span class="tag tag-ok">Tailscale</span>` : `<span class="tag tag-bad">externa</span>`}`]))}
    <div class="sub" style="margin-top:12px">Último acceso: ${sshRecent[0] ? `${esc(sshRecent[0].when)} — ${esc(sshRecent[0].user)} desde ${esc(sshRecent[0].from)}` : "sin registro"}</div>
    <h2 style="margin:18px 0 10px">Dispositivos en la Tailnet</h2>
    ${tbl(["Equipo", "IP", "Estado"], tailscalePeers.map((p) => [
      esc(p.name), `<code>${esc(p.ip)}</code>`,
      /offline/.test(p.state) ? `<span class="pill">${esc(p.state)}</span>` : `<span class="tag tag-ok">conectado</span>`]))}
  </div>

  <div class="card wide">
    <h2>Puertos a la escucha — quién puede llegar a cada cosa</h2>
    ${tbl(["Puerto", "Proceso", "Escucha en", "Alcance"], ports
      .filter((p) => ![53, 323, 68].includes(p.port))
      .sort((a, b) => SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope] || a.port - b.port)
      .map((p) => [
        `<strong class="num">${p.port}</strong> <span class="pill">${esc(p.proto)}</span>`,
        `<code>${esc(p.procs.map((x) => x.name).join(", ") || "?")}</code>`,
        `<code>${esc(p.addr)}</code>`, scopeTag(p)]))}
    <div class="sub" style="margin-top:10px">Reglas del cortafuegos: ${ufwRules.map((r) => `<span class="pill">${esc(r.replace(/ALLOW IN Anywhere.*/, "").trim())}</span>`).join(" ")}</div>
  </div>

  <div class="card wide">
    <h2>Qué se está ejecutando</h2>
    <div class="two">
      <div>
        <div class="sub" style="margin-bottom:8px">PM2 (usuario <code>claude</code>)</div>
        ${tbl(["App", "Estado", "Puerto", "RAM", "Reinicios", "Código en"], pm2.map((p) => [
          `<strong>${esc(p.name)}</strong>`,
          p.status === "online" ? `<span class="tag tag-ok">activo</span>` : `<span class="tag tag-warn">parado</span>`,
          `<span class="num">${esc(p.port ?? "—")}</span>`,
          `<span class="num">${p.mem_mb ? p.mem_mb + " MB" : "—"}</span>`,
          `<span class="num">${p.restarts ?? 0}</span>`,
          `<code>${esc((p.cwd || "").replace("/home/", "~"))}</code>`]))}
      </div>
      <div>
        <div class="sub" style="margin-bottom:8px">Servicios systemd propios</div>
        ${tbl(["Unidad", "Estado", "Modificada"], unitsLocal.filter((u) => !u.isLink).map((u) => {
          const name = u.path.split("/").pop();
          const running = services.find((s) => s.unit === name);
          return [`<code>${esc(name.replace(".service", ""))}</code>`,
            running ? `<span class="tag tag-ok">activo</span>` : `<span class="tag tag-warn">parado</span>`,
            `<span class="num">${esc(u.mtime)}</span>`];
        }))}
      </div>
    </div>
  </div>

  <div class="card wide">
    <h2>Superficie web pública</h2>
    <div class="two">
      <div>
        ${tbl(["Dominio servido por nginx"], serverNames.map((s) => [s === "_" ? `<em>por defecto (sin dominio)</em>` : `<code>${esc(s)}</code>`]))}
        <div class="sub" style="margin-top:10px">Ficheros servidos desde disco: ${webRoots.map((r) => `<code>${esc(r)}</code>`).join(", ")} — ${esc(webFp.FILES)} ficheros, huella <code>${esc(webFp.HASH)}</code></div>
      </div>
      <div>
        <div class="sub" style="margin-bottom:8px">Cambios en el contenido publicado (14 días)</div>
        ${webRecent.length
          ? `<pre class="mono" style="margin:0;white-space:pre-wrap">${esc(webRecent.slice(0, 12).join("\n"))}</pre>`
          : `<p class="empty">Ningún fichero modificado. Si alguien te colara una página de casinos, aquí aparecería el fichero y su fecha.</p>`}
        ${webSuspicious.length ? `<div class="sub add" style="margin-top:10px">Scripts ejecutables detectados: <code>${esc(webSuspicious.join(" · "))}</code></div>` : ""}
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Ocupación del disco</h2>
    ${disks.map((d) => meterRow(d.mount, d.pct, `${d.used} / ${d.size} · ${d.pct}%`)).join("")}
    <div class="sub" style="margin-top:14px">Inodos: ${inodes.map((i) => `${esc(i.mount)} ${i.pct}%`).join(" · ")}</div>
    <div class="sub">Memoria: ${mem.available} MB disponibles de ${mem.total} MB${mem.swapTotal === 0 ? " · sin swap" : ` · swap ${mem.swapTotal} MB`}</div>
  </div>

  <div class="card">
    <h2>Qué ocupa el espacio</h2>
    ${barChart(topDirs, { unit: "GB" })}
    <div class="sub" style="margin-top:10px">Gigabytes por directorio. Total en <code>/</code>: ${gb(duRoot.find((d) => d.path === "/")?.mb || 0)}.</div>
  </div>

  <div class="card wide">
    <h2>Bastionado — ${nOk} de ${checks.length} comprobaciones correctas</h2>
    ${statusBar([
      { n: nOk, label: "correctos", color: "var(--good)", icon: "✓" },
      { n: nWarn, label: "avisos", color: "var(--warn)", icon: "!" },
      { n: nBad, label: "a revisar", color: "var(--bad)", icon: "✕" },
    ])}
    <div class="legend">
      <span><i class="dotl" style="background:var(--good)"></i> ✓ correcto — ${nOk}</span>
      <span><i class="dotl" style="background:var(--warn)"></i> ! aviso — ${nWarn}</span>
      <span><i class="dotl" style="background:var(--bad)"></i> ✕ a revisar — ${nBad}</span>
    </div>
    <div style="margin-top:16px">
      ${[...checks].sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.state] - { bad: 0, warn: 1, ok: 2 }[b.state])).map((c) => `
        <div class="check">
          <div class="badge b-${c.state}">${ICON[c.state]}</div>
          <div><div>${esc(c.label)}</div><div class="d">${esc(c.detail)}</div></div>
          <div class="state">${WORD[c.state]}</div>
        </div>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Evolución del bastionado</h2>
    ${lineChart(history.map((h) => ({ at: new Date(h.at).toLocaleDateString("es-ES"), v: h.score ?? 0 })), { label: "Puntuación de bastionado por captura", unit: "" })}
    <div class="sub" style="margin-top:6px">Puntuación sobre 100 en cada captura.</div>
  </div>

  <div class="card">
    <h2>Evolución del disco</h2>
    ${lineChart(history.map((h) => ({ at: new Date(h.at).toLocaleDateString("es-ES"), v: h.diskPct })), { label: "Uso del disco raíz por captura", unit: "%" })}
    <div class="sub" style="margin-top:6px">Porcentaje usado de <code>/</code> en cada captura.</div>
  </div>

  <div class="card wide">
    <h2>Señales sueltas que conviene mirar</h2>
    <div class="two">
      <div>
        <div class="sub" style="margin-bottom:6px">Conexiones salientes establecidas</div>
        ${tbl(["Proceso", "Hacia"], established.filter((e) => !TAILSCALE_V4.test(e.remote)).map((e) => [
          `<code>${esc(e.proc)}</code>`, `<code>${esc(e.remote)}:${e.rport}</code>`]))}
      </div>
      <div>
        <div class="sub" style="margin-bottom:6px">Ejecutables en /tmp</div>
        ${tmpExec.length ? `<pre class="mono" style="margin:0;white-space:pre-wrap">${esc(tmpExec.slice(0, 8).join("\n"))}</pre>` : `<p class="empty">Ninguno.</p>`}
        <div class="sub" style="margin:12px 0 6px">Procesos con el binario borrado</div>
        ${procDeleted.length ? `<pre class="mono" style="margin:0;white-space:pre-wrap">${esc(procDeleted.join("\n"))}</pre>` : `<p class="empty">Ninguno.</p>`}
      </div>
    </div>
  </div>

</div>

<footer>Captura ${esc(meta.capturedAt)} · ${prevFiles.length + 1} capturas guardadas en <code>snapshots/</code> · datos recogidos en solo lectura</footer>
</div></body></html>`;

writeFileSync(outPath, html, "utf8");
console.log(`Dashboard: ${outPath}`);
console.log(`Bastionado: ${score}/100 — ${nOk} correctos, ${nWarn} avisos, ${nBad} a revisar`);
if (diff.length) console.log(`Cambios detectados en: ${diff.map((d) => d.area).join(", ")}`);
else if (prev) console.log("Sin cambios respecto a la captura anterior.");
