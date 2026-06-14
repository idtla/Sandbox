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
    matrix: $('#matrix'),
    clock: $('#dashClock'),
    targetName: $('#targetName'),
    targetMeta: $('#targetMeta'),
    profileBar: $('#profileBar'),
    profileStatus: $('#profileStatus'),
    vLoc: $('#vLoc'), vMsg: $('#vMsg'), vContacts: $('#vContacts'), vBat: $('#vBat'),
    console: $('#liveConsole'),
    codeStream: $('#codeStream'),
    btnBg: $('#btnBackground'),
    widget: $('#floatWidget'),
  };

  /* =================== GENERADORES "REALISTAS" =================== */
  const HEX = '0123456789ABCDEF';
  const hx = (n) => Array.from({ length: n }, () => HEX[ri(0, 16)]).join('');
  const addr = () => '0x' + hx(2) + hx(2) + hx(2) + hx(2);
  const byte = () => hx(2);
  function ip() { return `${ri(10, 220)}.${ri(0, 255)}.${ri(0, 255)}.${ri(2, 254)}`; }
  function mac() { return Array.from({ length: 6 }, byte).join(':'); }

  function hexdump() {
    const bytes = Array.from({ length: 16 }, byte).join(' ');
    const ascii = Array.from({ length: 16 }, () => {
      const c = ri(33, 127); return Math.random() < 0.42 ? String.fromCharCode(c) : '.';
    }).join('');
    return `<span class="ad">${addr()}</span>  ${bytes}  |${ascii}|`;
  }

  const OPS = ['mov', 'lea', 'push', 'pop', 'call', 'jmp', 'xor', 'add', 'sub', 'cmp',
    'test', 'jne', 'je', 'syscall', 'ret', 'and', 'or', 'shl', 'shr', 'inc', 'dec', 'nop'];
  const REG = ['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp', 'r8', 'r9',
    'r10', 'r11', 'r12', 'eax', 'ebx', 'ecx', 'edx'];
  function asm() {
    const op = pick(OPS);
    const a = pick(REG);
    const b = Math.random() < 0.5 ? pick(REG) : '0x' + hx(ri(2, 6));
    const noArg = ['ret', 'nop', 'syscall', 'push', 'pop'].includes(op);
    const args = noArg ? (op === 'push' || op === 'pop' ? a : '') : `${a}, ${b}`;
    return `<span class="ad">${addr()}</span>  <span class="op">${op.padEnd(7)}</span> ${args}`;
  }

  const SVC = { 21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'http',
    110: 'pop3', 139: 'netbios-ssn', 143: 'imap', 443: 'https', 445: 'microsoft-ds',
    993: 'imaps', 3306: 'mysql', 3389: 'ms-wbt-server', 5060: 'sip', 8080: 'http-proxy' };
  function portScan() {
    const p = pick(Object.keys(SVC));
    const st = Math.random() < 0.82 ? 'open  ' : 'filtered';
    return `${String(p).padStart(5)}/tcp  ${st}  ${SVC[p]}`;
  }

  function packet() {
    const proto = pick(['TCP', 'UDP', 'TLSv1.3', 'HTTP/2', 'QUIC']);
    const flags = pick(['SYN', 'SYN,ACK', 'ACK', 'PSH,ACK', 'FIN,ACK', 'RST']);
    return `${proto.padEnd(8)} ${ip()}:${ri(1024, 65535)} > ${ip()}:${pick([443, 80, 22, 8443, 53])} [${flags}] seq=${ri(1e6, 9e9)} len=${ri(0, 1460)}`;
  }

  /* =================== UTILIDADES UI =================== */
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

  /* =================== LLUVIA MATRIX =================== */
  function startMatrix() {
    const c = els.matrix, ctx = c.getContext('2d');
    const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF#$%&@<>{}[]/\\=+*ctOS';
    let cols, drops, fs;
    function resize() {
      c.width = innerWidth; c.height = innerHeight;
      fs = Math.max(12, Math.round(innerWidth / 28));
      cols = Math.ceil(c.width / fs);
      drops = Array.from({ length: cols }, () => ri(-40, 0));
    }
    resize(); addEventListener('resize', resize);
    setInterval(() => {
      ctx.fillStyle = 'rgba(4,7,13,0.10)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = fs + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const ch = GLYPHS[ri(0, GLYPHS.length)];
        const x = i * fs, y = drops[i] * fs;
        ctx.fillStyle = Math.random() < 0.04 ? '#eafffb' : '#19e6ff';
        ctx.fillText(ch, x, y);
        if (y > c.height && Math.random() > 0.975) drops[i] = ri(-20, 0);
        drops[i]++;
      }
    }, 55);
  }

  /* =================== ESCRITURA TIPO TERMINAL =================== */
  async function typeLine(target, text, cls = '', speed = 8) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    target.appendChild(span);
    for (const ch of text) { span.textContent += ch; await sleep(speed); }
    target.appendChild(document.createTextNode('\n'));
    target.scrollTop = target.scrollHeight;
  }
  function rawLine(target, html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    target.appendChild(div);
    target.scrollTop = target.scrollHeight;
  }
  async function dump(target, gen, n, speed = 26) {
    for (let i = 0; i < n; i++) { rawLine(target, gen()); await sleep(speed); }
  }

  /* =================== SECUENCIA DE INTRUSIÓN =================== */
  // t:'line' (typed) | t:'dump' (volcado rápido) | t:'crack' (descifrado)
  const SCRIPT = [
    { t: 'line', s: '[ctOS] inicializando enlace remoto…', c: 'dim', sp: 6 },
    { t: 'line', s: `[net] objetivo=${'$IP'} mac=${'$MAC'} via BTS-4471 (-67 dBm)`, c: '', sp: 5 },
    { t: 'line', s: '[recon] nmap -sS -Pn -p- --min-rate 5000 $IP', c: 'dim', sp: 4 },
    { t: 'dump', gen: portScan, n: 7, sp: 70 },
    { t: 'line', s: '[recon] 7 puertos abiertos · servicio vulnerable: 5060/sip', c: 'ok', sp: 5 },
    { t: 'line', s: '[exploit] cargando módulo: baseband_heap_overflow', c: 'warn', sp: 8, gl: 1 },
    { t: 'line', s: '[exploit] CVE-2024-•••• → ejecución remota (RCE)', c: 'warn', sp: 8 },
    { t: 'dump', gen: asm, n: 9, sp: 34 },
    { t: 'line', s: '[*] ROP chain construida · saltando a shellcode…', c: '', sp: 6, gl: 1 },
    { t: 'line', s: '[+] ACCESO ROOT OBTENIDO (uid=0)', c: 'ok', sp: 12 },
    { t: 'line', s: '[mem] volcando keystore / secure enclave', c: '', sp: 6 },
    { t: 'dump', gen: hexdump, n: 10, sp: 26 },
    { t: 'line', s: '[crypt] descifrando bóveda AES-256-GCM…', c: '', sp: 6 },
    { t: 'crack' },
    { t: 'line', s: '[sys] desactivando antivirus y SELinux', c: 'err', sp: 7, gl: 1 },
    { t: 'line', s: '[sys] silenciando alertas de seguridad', c: 'err', sp: 7 },
    { t: 'line', s: '[sniff] tcpdump -i any -nn  (interceptando tráfico)', c: 'dim', sp: 4 },
    { t: 'dump', gen: packet, n: 8, sp: 40 },
    { t: 'line', s: '[data] volcando contactos · mensajes · galería', c: '', sp: 6 },
    { t: 'line', s: '[cam] activando cámara frontal (LED off)', c: 'err', sp: 8, gl: 1 },
    { t: 'line', s: '[mic] abriendo micrófono · PCM 48kHz', c: 'err', sp: 8 },
    { t: 'line', s: '[gps] suscripción a ubicación en tiempo real', c: '', sp: 6 },
    { t: 'line', s: '[persist] instalando servicio residente (sobrevive a reinicio)', c: 'warn', sp: 6 },
    { t: 'line', s: '[c2] canal cifrado establecido → 185.•••.•••.41:443', c: 'warn', sp: 6 },
    { t: 'line', s: '[ctOS] CONTROL TOTAL DEL TERMINAL ESTABLECIDO.', c: 'ok', sp: 10 },
  ];

  async function crackKey() {
    const span = document.createElement('span');
    span.className = 'warn';
    els.bootLog.appendChild(span);
    const key = hx(32);
    let shown = '';
    for (let i = 0; i < key.length; i++) {
      // "barajar" antes de fijar el dígito
      for (let f = 0; f < 3; f++) { span.textContent = `    KEY: ${shown}${hx(key.length - i)}`; await sleep(14); }
      shown += key[i];
      span.textContent = `    KEY: ${shown}${'·'.repeat(key.length - shown.length)}`;
    }
    span.textContent = `    KEY: ${shown}  ✓`;
    els.bootLog.appendChild(document.createTextNode('\n'));
    els.bootLog.scrollTop = els.bootLog.scrollHeight;
  }

  async function runBoot() {
    els.matrix.classList.add('intense');
    const tip = ip(), tmac = mac();
    for (let i = 0; i < SCRIPT.length; i++) {
      const step = SCRIPT[i];
      if (step.t === 'line') {
        if (step.gl) glitch();
        const txt = step.s.replace('$IP', tip).replace('$MAC', tmac);
        await typeLine(els.bootLog, txt, step.c, step.sp);
      } else if (step.t === 'dump') {
        await dump(els.bootLog, step.gen, step.n, step.sp);
      } else if (step.t === 'crack') {
        await crackKey();
      }
      const pct = Math.round(((i + 1) / SCRIPT.length) * 100);
      els.bootBar.style.width = pct + '%';
      els.bootPct.textContent = pct + '%';
      // recortar log para que no crezca infinito
      while (els.bootLog.childNodes.length > 220) els.bootLog.removeChild(els.bootLog.firstChild);
      await sleep(rnd(80, 220));
    }
    await sleep(350);
    glitch();
    els.takeover.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([60, 40, 120, 40, 200]);
    await sleep(2600);
    els.boot.classList.add('hidden');
    els.matrix.classList.remove('intense');
    startDashboard();
  }

  /* =================== DASHBOARD =================== */
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

  function profileTarget() {
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

  function fmtCoord() {
    TARGET.lat += rnd(-0.0004, 0.0004); TARGET.lon += rnd(-0.0004, 0.0004);
    return `${TARGET.lat.toFixed(6)}, ${TARGET.lon.toFixed(6)}`;
  }

  const CONSOLE_LINES = [
    () => `<span class="a">[gps]</span> ${fmtCoord()} · v=${ri(0, 7)} km/h`,
    () => `<span class="b">[cam]</span> frame ${ri(640, 1920)}x${ri(480, 1080)} → buffer C2`,
    () => `<span class="c">[mic]</span> audio ${ri(2, 9)}s exfiltrado (${ri(40, 260)} KB)`,
    () => `<span class="a">[msg]</span> WhatsApp · mensaje interceptado [E2E roto]`,
    () => `<span class="b">[key]</span> keylog: ${pick(['••••••', 'pin: 4 díg.', 'patrón: L', '"ok nos vemos"', 'usuario+passwd'])}`,
    () => `<span class="c">[net]</span> ${pick(['WiFi', '4G', '5G'])} ${ri(2, 40)} pkts → C2 ${ip()}`,
    () => `<span class="a">[fs]</span> /DCIM/IMG_${ri(1000, 9999)}.jpg copiado`,
    () => `<span class="b">[sys]</span> intento de cierre bloqueado · servicio OK`,
    () => `<span class="c">[bank]</span> token sesión bancaria capturado`,
    () => `<span class="a">[auth]</span> 2FA SMS interceptado: ${ri(100000, 999999)}`,
  ];
  function pushConsole() {
    rawLine(els.console, pick(CONSOLE_LINES)());
    while (els.console.childElementCount > 16) els.console.firstChild.remove();
  }
  function pushCode() {
    rawLine(els.codeStream, Math.random() < 0.55 ? asm() : hexdump());
    while (els.codeStream.childElementCount > 12) els.codeStream.firstChild.remove();
  }

  function startDashboard() {
    els.dash.classList.remove('hidden');
    startClock();
    profileTarget();
    els.vLoc.textContent = fmtCoord();

    setInterval(() => {
      counters.msg += ri(0, 3);
      counters.contacts = Math.min(847, counters.contacts + ri(0, 9));
      if (Math.random() < 0.25) counters.bat = Math.max(3, counters.bat - 1);
      els.vMsg.textContent = counters.msg;
      els.vContacts.textContent = counters.contacts;
      els.vBat.textContent = counters.bat + '%';
      els.vLoc.textContent = fmtCoord();
    }, 1400);

    setInterval(pushConsole, 650);
    setInterval(pushCode, 130);          // desensamblado corriendo rápido
    for (let i = 0; i < 4; i++) setTimeout(pushConsole, i * 200);
    for (let i = 0; i < 12; i++) setTimeout(pushCode, i * 60);
  }

  /* =================== "SEGUNDO PLANO" =================== */
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

  /* =================== ARRANQUE =================== */
  startMatrix();
  els.tapStart.addEventListener('click', async () => {
    els.tapStart.classList.add('hidden');
    await goFullscreen();
    keepAwake();
    els.boot.classList.remove('hidden');
    runBoot();
  });

  // Service worker (instalable + funciona sin red en rodaje)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
