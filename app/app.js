/* ============================================================
   ctOS MOBILE — atrezzo audiovisual (software de ficción)
   Todo lo que muestra es SIMULADO. No accede a nada real.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => Math.random() * (b - a) + a;
  const ri = (a, b) => Math.floor(rnd(a, b));
  const pick = (a) => a[ri(0, a.length)];

  // --- "Objetivo" ficticio (puedes editarlo para tu escena) ---
  const TARGET = {
    name: 'OBJETIVO_01',
    meta: 'IMEI 35·7782·••• · Android 14 · 4G/5G',
    lat: 40.4168, lon: -3.7038,                 // Madrid por defecto
  };

  const els = {
    tapStart: $('#tapStart'),
    boot: $('#screen-boot'),
    bootLog: $('#bootLog'),
    bootBar: $('#bootBar'),
    bootPct: $('#bootPct'),
    takeover: $('#takeover'),
    dash: $('#screen-dash'),
    glitch: $('#glitchFlash'),
    clock: $('#dashClock'),
    targetName: $('#targetName'),
    targetMeta: $('#targetMeta'),
    profileBar: $('#profileBar'),
    profileStatus: $('#profileStatus'),
    vLoc: $('#vLoc'), vMsg: $('#vMsg'), vContacts: $('#vContacts'), vBat: $('#vBat'),
    console: $('#liveConsole'),
    btnBg: $('#btnBackground'),
    widget: $('#floatWidget'),
  };

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
  }
  document.addEventListener('visibilitychange', () => {
    if (wakeLock === null && document.visibilityState === 'visible') keepAwake();
  });

  async function goFullscreen() {
    const el = document.documentElement;
    try { if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (_) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('portrait'); } catch (_) {}
  }

  function glitch() {
    els.glitch.classList.remove('fire');
    void els.glitch.offsetWidth;
    els.glitch.classList.add('fire');
    if (navigator.vibrate) navigator.vibrate(ri(20, 60));
  }

  // ---------- escritura tipo terminal ----------
  async function typeLine(target, text, cls = '', speed = 8) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    target.appendChild(span);
    for (const ch of text) { span.textContent += ch; await sleep(speed); }
    target.appendChild(document.createTextNode('\n'));
    target.scrollTop = target.scrollHeight;
  }

  // ============ SECUENCIA DE INTRUSIÓN ============
  const BOOT = [
    ['[ctOS] Inicializando enlace remoto...', 'dim', 6],
    ['[net] Buscando torre de telefonía más cercana...', '', 6],
    ['[net] BTS-4471 enganchada · -67 dBm', 'ok', 6],
    ['[exploit] Inyectando payload en banda base...', 'warn', 10],
    ['[exploit] CVE-2024-•••• → root', 'warn', 10],
    ['[*] Escalando privilegios..............', '', 4],
    ['[+] ACCESO ROOT OBTENIDO', 'ok', 14],
    ['[sys] Desactivando antivirus del dispositivo', 'err', 8],
    ['[sys] Silenciando notificaciones de seguridad', 'err', 8],
    ['[data] Montando /sdcard del objetivo...', '', 6],
    ['[data] Volcando contactos · mensajes · galería', '', 6],
    ['[cam] Activando cámara frontal (sin LED)', 'err', 10],
    ['[mic] Abriendo micrófono · 48kHz', 'err', 10],
    ['[gps] Suscripción a ubicación en tiempo real', '', 8],
    ['[persist] Instalando servicio residente...', 'warn', 8],
    ['[persist] Se ejecutará en SEGUNDO PLANO al reiniciar', 'warn', 8],
    ['[ctOS] Control total del terminal establecido.', 'ok', 12],
  ];

  async function runBoot() {
    let pct = 0;
    for (let i = 0; i < BOOT.length; i++) {
      const [txt, cls, sp] = BOOT[i];
      if (cls === 'err' || cls === 'warn') glitch();
      await typeLine(els.bootLog, txt, cls, sp);
      pct = Math.round(((i + 1) / BOOT.length) * 100);
      els.bootBar.style.width = pct + '%';
      els.bootPct.textContent = pct + '%';
      await sleep(rnd(120, 320));
    }
    await sleep(400);
    glitch();
    els.takeover.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    await sleep(2600);
    els.boot.classList.add('hidden');
    startDashboard();
  }

  // ============ DASHBOARD ============
  let dashTimer = null, consoleTimer = null;
  let counters = { msg: 0, contacts: 0, bat: 100 };

  function startClock() {
    const t0 = Date.now();
    setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      els.clock.textContent = `${hh}:${mm}:${ss}`;
    }, 1000);
  }

  async function profileTarget() {
    els.targetName.textContent = TARGET.name;
    els.targetMeta.textContent = TARGET.meta;
    let p = 0;
    const states = ['Perfilando objetivo…', 'Cruzando bases de datos…', 'Reconocimiento facial…', 'PERFIL COMPLETO'];
    const iv = setInterval(() => {
      p = Math.min(100, p + ri(4, 14));
      els.profileBar.style.width = p + '%';
      els.profileStatus.textContent = states[Math.min(states.length - 1, Math.floor(p / 26))];
      if (p >= 100) { clearInterval(iv); els.profileStatus.textContent = '● OBJETIVO BAJO CONTROL'; }
    }, 350);
  }

  const CONSOLE_LINES = [
    () => `<span class="a">[gps]</span> ${fmtCoord()} · v=${ri(0,7)} km/h`,
    () => `<span class="b">[cam]</span> frame capturado ${ri(640,1920)}x${ri(480,1080)} → buffer`,
    () => `<span class="c">[mic]</span> audio ${ri(2,9)}s exfiltrado (${ri(40,260)} KB)`,
    () => `<span class="a">[msg]</span> WhatsApp: nuevo mensaje interceptado`,
    () => `<span class="b">[key]</span> keylog: ${pick(['••••••', 'pin: 4 díg.', 'patrón: L', '"ok nos vemos"'])}`,
    () => `<span class="c">[net]</span> ${pick(['WiFi','4G','5G'])} ${ri(2,40)} paquetes → C2 ${ip()}`,
    () => `<span class="a">[fs]</span> /DCIM/IMG_${ri(1000,9999)}.jpg copiado`,
    () => `<span class="b">[sys]</span> intento de cierre bloqueado · servicio residente OK`,
  ];
  function ip(){return `${ri(10,220)}.${ri(0,255)}.${ri(0,255)}.${ri(2,254)}`;}
  function fmtCoord(){
    TARGET.lat += rnd(-0.0004,0.0004); TARGET.lon += rnd(-0.0004,0.0004);
    return `${TARGET.lat.toFixed(6)}, ${TARGET.lon.toFixed(6)}`;
  }
  async function pushConsole() {
    const line = pick(CONSOLE_LINES)();
    const div = document.createElement('div');
    div.innerHTML = line;
    els.console.appendChild(div);
    while (els.console.childElementCount > 18) els.console.firstChild.remove();
    els.console.scrollTop = els.console.scrollHeight;
  }

  function startDashboard() {
    els.dash.classList.remove('hidden');
    startClock();
    profileTarget();
    els.vLoc.textContent = fmtCoord();

    dashTimer = setInterval(() => {
      counters.msg += ri(0, 3);
      counters.contacts = Math.min(847, counters.contacts + ri(0, 9));
      if (Math.random() < 0.25) counters.bat = Math.max(3, counters.bat - 1);
      els.vMsg.textContent = counters.msg;
      els.vContacts.textContent = counters.contacts;
      els.vBat.textContent = counters.bat + '%';
      els.vLoc.textContent = fmtCoord();
    }, 1400);

    consoleTimer = setInterval(pushConsole, 650);
    for (let i = 0; i < 4; i++) setTimeout(pushConsole, i * 200);
  }

  // ============ "SEGUNDO PLANO" ============
  els.btnBg.addEventListener('click', () => {
    els.dash.classList.add('hidden');
    els.widget.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(30);
  });
  els.widget.addEventListener('click', () => {
    els.widget.classList.add('hidden');
    els.dash.classList.remove('hidden');
    glitch();
  });

  // ============ ARRANQUE ============
  els.tapStart.addEventListener('click', async () => {
    els.tapStart.classList.add('hidden');
    await goFullscreen();
    keepAwake();
    els.boot.classList.remove('hidden');
    runBoot();
  });

  // Service worker (hace que sea "instalable" y funcione sin red en rodaje)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
