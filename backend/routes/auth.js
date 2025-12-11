const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// Validar token (protegido)
router.get('/validate', auth, (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, role: req.user.role } });
});

module.exports = router;
