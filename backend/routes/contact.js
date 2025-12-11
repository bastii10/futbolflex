const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/', contactController.submit);
router.get('/messages', auth, admin, contactController.getAllMessages);

module.exports = router;
