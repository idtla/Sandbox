/* ============================================================
   remote-shell — atrezzo terminal (software de ficción)
   Simula una sesión adb/shell remota. No accede a nada real.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => Math.random() * (b - a) + a;
  const ri = (a, b) => Math.floor(rnd(a, b));
  const pick = (a) => a[ri(0, a.length)];
  const hex = (n) => n.toString(16).padStart(8, '0');

  const TARGET = {
    host: '192.168.43.127',
    port: 5555,
    device: 'SM-G991B',
    serial: 'R5CR90XXXX',
    android: '14',
    imei: '357782012345678',
    name: 'u0_a142',
    lat: 40.4168,
    lon: -3.7038,
  };

  const SESSION_ID = hex(ri(0x10000000, 0xffffffff));

  const els = {
    tapStart: $('#tapStart'),
    tapTarget: $('#tapTarget'),
    boot: $('#screen-boot'),
    bootLog: $('#bootLog'),
    bootBar: $('#bootBar'),
    bootPct: $('#bootPct'),
    takeover: $('#takeover'),
    takeoverMsg: $('#takeoverMsg'),
    takeoverSub: $('#takeoverSub'),
    dash: $('#screen-dash'),
    dashHost: $('#dashHost'),
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

  els.tapTarget.textContent = `${TARGET.host}:${TARGET.port}`;

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

  async function typeLine(target, text, cls = '', speed = 6) {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    target.appendChild(span);
    for (const ch of text) { span.textContent += ch; await sleep(speed); }
    target.appendChild(document.createTextNode('\n'));
    target.scrollTop = target.scrollHeight;
  }

  const BOOT = [
    ['* daemon not running; starting now at tcp:5037', 'dim', 4],
    ['* daemon started successfully', 'dim', 4],
    [`connected to ${TARGET.host}:${TARGET.port}`, 'ok', 5],
    ['', '', 0],
    [`$ adb -s ${TARGET.host}:${TARGET.port} shell`, 'cmd', 8],
    [`${TARGET.name}@${TARGET.device}:/ $ id`, 'dim', 6],
    ['uid=2000(shell) gid=2000(shell) groups=2000(shell),1004(input),...', '', 4],
    [`${TARGET.name}@${TARGET.device}:/ $ getprop ro.product.model`, 'cmd', 7],
    [TARGET.device, 'ok', 5],
    [`${TARGET.name}@${TARGET.device}:/ $ getprop ro.build.version.release`, 'cmd', 7],
    [TARGET.android, 'ok', 5],
    [`${TARGET.name}@${TARGET.device}:/ $ dumpsys iphonesubinfo | grep DeviceId`, 'cmd', 6],
    [`    DeviceId=${TARGET.imei.slice(0, 8)}••••••`, 'dim', 5],
    [`${TARGET.name}@${TARGET.device}:/ $ pm list packages -3 | wc -l`, 'cmd', 7],
    ['47', 'ok', 4],
    [`${TARGET.name}@${TARGET.device}:/ $ ls /sdcard/DCIM/Camera | wc -l`, 'cmd', 7],
    ['1284', 'ok', 4],
    [`${TARGET.name}@${TARGET.device}:/ $ content query --uri content://sms/inbox --projection _id | wc -l`, 'cmd', 6],
    ['312', 'ok', 4],
    [`${TARGET.name}@${TARGET.device}:/ $ am start-service com.android.shell/.BugreportWarningActivity 2>/dev/null`, 'cmd', 5],
    ['', '', 0],
    [`${TARGET.name}@${TARGET.device}:/ $ nohup /data/local/tmp/.svc > /dev/null 2>&1 &`, 'cmd', 8],
    ['[1] 28471', 'warn', 5],
    [`${TARGET.name}@${TARGET.device}:/ $ ps -A | grep .svc`, 'cmd', 7],
    ['u0_a142      28471  892  ... /data/local/tmp/.svc', 'ok', 4],
    ['', '', 0],
    ['session attached — forwarding streams', 'ok', 8],
  ];

  async function runBoot() {
    await typeLine(els.bootLog, `$ adb connect ${TARGET.host}:${TARGET.port}`, 'cmd', 10);
    await sleep(300);

    let pct = 0;
    const total = BOOT.length;
    for (let i = 0; i < BOOT.length; i++) {
      const [txt, cls, sp] = BOOT[i];
      if (!txt) { await sleep(80); continue; }
      await typeLine(els.bootLog, txt, cls, sp);
      pct = Math.round(((i + 1) / total) * 100);
      els.bootBar.style.width = pct + '%';
      els.bootPct.textContent = pct + '%';
      await sleep(rnd(60, 200));
    }

    await sleep(500);
    els.takeoverMsg.textContent = `shell@${TARGET.device}: session open`;
    els.takeoverSub.textContent = `session id: ${SESSION_ID}`;
    els.takeover.classList.remove('hidden');
    await sleep(1800);
    els.boot.classList.add('hidden');
    startDashboard();
  }

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
    els.dashHost.textContent = `${TARGET.name}@${TARGET.device}`;
    els.targetName.textContent = `${TARGET.serial} · ${TARGET.device}`;
    els.targetMeta.textContent = `android ${TARGET.android} · imei ${TARGET.imei.slice(0, 8)}••••••`;
    let p = 0;
    const states = ['leyendo getprop…', 'dumpsys battery…', 'content://contacts…', 'listo'];
    const iv = setInterval(() => {
      p = Math.min(100, p + ri(3, 12));
      els.profileBar.style.width = p + '%';
      els.profileStatus.textContent = states[Math.min(states.length - 1, Math.floor(p / 26))];
      if (p >= 100) { clearInterval(iv); els.profileStatus.textContent = 'device profile complete'; }
    }, 400);
  }

  function ts() {
    const d = new Date();
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  const CONSOLE_LINES = [
    () => {
      const c = fmtCoord().split(',');
      return `<span class="ts">${ts()}</span> <span class="a">gps</span> lat=${c[0]} lon=${c[1].trim()} acc=${ri(3, 18)}m`;
    },
    () => `<span class="ts">${ts()}</span> <span class="b">pull</span> /sdcard/DCIM/CIMG_${ri(1000, 9999)}.jpg → /tmp/ (${ri(800, 4200)} KB)`,
    () => `<span class="ts">${ts()}</span> <span class="c">audio</span> chunk ${ri(1, 99)}/${ri(100, 200)} ${ri(40, 260)} KB → ${ip()}:443`,
    () => `<span class="ts">${ts()}</span> <span class="a">sms</span> content://sms/inbox _id=${ri(100, 9999)} read`,
    () => `<span class="ts">${ts()}</span> <span class="b">tcp</span> ${ip()}:443 ← ${TARGET.host}:${ri(40000, 65000)} ${ri(12, 890)} bytes`,
    () => `<span class="ts">${ts()}</span> <span class="c">cam</span> frame ${ri(640, 1920)}x${ri(480, 1080)} yuv420`,
    () => `<span class="ts">${ts()}</span> <span class="a">db</span> contacts row ${ri(1, 847)} exported`,
    () => `<span class="ts">${ts()}</span> <span class="b">svc</span> .svc pid 28471 heartbeat ok`,
  ];

  function ip() { return `${ri(10, 220)}.${ri(0, 255)}.${ri(0, 255)}.${ri(2, 254)}`; }
  function fmtCoord() {
    TARGET.lat += rnd(-0.0003, 0.0003);
    TARGET.lon += rnd(-0.0003, 0.0003);
    return `${TARGET.lat.toFixed(6)}, ${TARGET.lon.toFixed(6)}`;
  }

  async function pushConsole() {
    const line = pick(CONSOLE_LINES)();
    const div = document.createElement('div');
    div.innerHTML = line;
    els.console.appendChild(div);
    while (els.console.childElementCount > 20) els.console.firstChild.remove();
    els.console.scrollTop = els.console.scrollHeight;
  }

  function startDashboard() {
    els.dash.classList.remove('hidden');
    startClock();
    profileTarget();
    els.vLoc.textContent = fmtCoord();

    dashTimer = setInterval(() => {
      counters.msg += ri(0, 2);
      counters.contacts = Math.min(847, counters.contacts + ri(0, 7));
      if (Math.random() < 0.18) counters.bat = Math.max(3, counters.bat - 1);
      els.vMsg.textContent = counters.msg;
      els.vContacts.textContent = counters.contacts;
      els.vBat.textContent = counters.bat + '%';
      els.vLoc.textContent = fmtCoord();
    }, 1600);

    consoleTimer = setInterval(pushConsole, 900);
    for (let i = 0; i < 3; i++) setTimeout(pushConsole, i * 250);
  }

  els.btnBg.addEventListener('click', () => {
    els.dash.classList.add('hidden');
    els.widget.classList.remove('hidden');
  });
  els.widget.addEventListener('click', () => {
    els.widget.classList.add('hidden');
    els.dash.classList.remove('hidden');
  });

  els.tapStart.addEventListener('click', async () => {
    els.tapStart.classList.add('hidden');
    await goFullscreen();
    keepAwake();
    els.boot.classList.remove('hidden');
    runBoot();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
