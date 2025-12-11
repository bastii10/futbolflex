const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/', auth, reservationController.createReservation);
router.get('/user', auth, reservationController.getUserReservations);
router.get('/all', auth, admin, reservationController.getAllReservations);
// PATCH cancelar reserva
router.patch('/:id/cancel', auth, reservationController.cancelReservation);

module.exports = router;
