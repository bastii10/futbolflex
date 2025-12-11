const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // ← NUEVO
const fieldController = require('../controllers/fieldController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { subscribeFieldEvents } = require('../events/fieldEvents');

// públicas
router.get('/', fieldController.getAll);

// SSE eventos de canchas (solo admin) — IMPORTANTE: definir ANTES de '/:id'
router.get('/events', async (req, res) => {
  try {
    // Autenticación: token por query (?token=...) o header Authorization
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = req.query.token || bearer;
    if (!token) return res.status(401).end();

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    } catch {
      return res.status(401).end();
    }
    if (!payload || payload.role !== 'admin') return res.status(403).end();

    // Cabeceras SSE
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.flushHeaders?.();

    const send = (payload) => {
      // payload = { type, data, at }
      res.write(`event: ${payload.type}\n`);
      res.write(`data: ${JSON.stringify(payload.data)}\n\n`);
    };

    const unsubscribe = subscribeFieldEvents(send);

    // Ping inicial + keepalive
    res.write(`event: ping\ndata: "ok"\n\n`);
    const ka = setInterval(() => {
      res.write(`event: ping\ndata: "ok"\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(ka);
      unsubscribe();
      res.end();
    });
  } catch (e) {
    try { res.status(500).end(); } catch {}
  }
});

// detalle por id (debe ir después)
router.get('/:id', fieldController.getById);

// admin (REST)
router.post('/', auth, admin, fieldController.createField);
router.put('/:id', auth, admin, fieldController.updateField);
router.delete('/:id', auth, admin, fieldController.deleteField);

module.exports = router;
