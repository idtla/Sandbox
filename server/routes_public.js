import { Router } from 'express';
import { getEventBySlug } from './repo/events.js';
import { nowUtc } from './services/clock.js';

const router = Router();

router.get('/time', (req, res) => {
  const { event } = req.query;
  const ev = getEventBySlug(event);
  if (!ev) return res.status(404).json({ error: 'evento no encontrado' });
  res.json({
    serverNowUtc: nowUtc().toISOString(),
    saleOpensAtUtc: ev.opens_at,
    state: ev.state,
  });
});

router.get('/state', (req, res) => {
  const { event } = req.query;
  const ev = getEventBySlug(event);
  if (!ev) return res.status(404).json({ error: 'evento no encontrado' });
  res.json({ remaining: ev.remaining, perUserLimit: ev.per_user_limit, state: ev.state });
});

router.post('/email/check', (req, res) => {
  // TODO: conectar con Sendy
  res.json({ exists: false, missing: ['nombre'], prefill: {} });
});

router.post('/profile/upsert', (req, res) => {
  res.json({ ok: true });
});

router.post('/reserve', (req, res) => {
  res.json({ ok: true, holdId: 'mock-hold', expiresAt: nowUtc().toISOString() });
});

router.post('/confirm', (req, res) => {
  res.json({ ok: true, tickets: [{ code: 'MOCK', qrUrl: '/assets/demo-qr.svg' }], locator: 'MOCK-LOC', emailSent: true });
});

export default router;
