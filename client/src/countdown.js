export function startCountdown(targetIso, el) {
  function tick() {
    const diff = new Date(targetIso) - new Date();
    if (diff <= 0) {
      el.textContent = '00:00:00';
      return;
    }
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
    requestAnimationFrame(tick);
  }
  tick();
}
