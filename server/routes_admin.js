import { Router } from 'express';

const router = Router();

router.post('/login/request', (req, res) => res.json({ ok: true }));
router.post('/login/verify', (req, res) => res.json({ ok: true }));
router.post('/logout', (req, res) => res.json({ ok: true }));

router.get('/events', (req, res) => res.json([]));
router.post('/events', (req, res) => res.json({}));
router.put('/events/:id', (req, res) => res.json({}));
router.post('/inventory', (req, res) => res.json({ ok: true }));
router.get('/metrics', (req, res) => res.json({}));
router.get('/export', (req, res) => {
  res.type('text/csv').send('id\n');
});

router.get('/mock/toggles', (req, res) => res.json({}));
router.post('/mock/toggles', (req, res) => res.json({}));
router.post('/mock/clear-holds', (req, res) => res.json({ ok: true }));
router.post('/mock/reseed-inventory', (req, res) => res.json({ ok: true }));
router.post('/mock/generate-traffic', (req, res) => res.json({ ok: true }));
router.get('/mock/sse', (req, res) => res.end());

export default router;
