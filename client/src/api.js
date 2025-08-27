const demo = typeof window !== 'undefined' && (new URLSearchParams(location.search).get('demo') || localStorage.getItem('demoMode'));

export async function getTime(event) {
  if (demo) {
    const now = new Date();
    return { serverNowUtc: now.toISOString(), saleOpensAtUtc: new Date(now.getTime() + 30000).toISOString(), state: 'pre' };
  }
  const r = await fetch(`/api/time?event=${event}`);
  return r.json();
}

export async function getState(event) {
  if (demo) return { remaining: 50, perUserLimit: 2, state: 'pre' };
  const r = await fetch(`/api/state?event=${event}`);
  return r.json();
}

export async function emailCheck(body) {
  if (demo) {
    return { exists: false, missing: ['nombre'], prefill: {} };
  }
  const r = await fetch('/api/email/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export async function reserve(body) {
  if (demo) {
    const now = new Date();
    return { ok: true, holdId: 'demo-hold', expiresAt: new Date(now.getTime() + 3000).toISOString() };
  }
  const r = await fetch('/api/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export async function confirm(body) {
  if (demo) {
    return { ok: true, tickets: [{ code: 'DEMO-QR-1', qrUrl: '/assets/demo-qr.svg' }], locator: 'DEMO-LOC-123' };
  }
  const r = await fetch('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
