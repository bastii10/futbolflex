const express = require('express');
const router = express.Router();
const { createMessage, getAllMessages, deleteMessage } = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Crear mensaje (público; si hay token se adjunta userId)
router.post('/', createMessage);

// Listar (solo admin)
router.get('/', auth, getAllMessages);

// Eliminar (solo admin)
router.delete('/:id', auth, deleteMessage);

module.exports = router;
