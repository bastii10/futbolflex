const Reservation = require('../models/Reservation');
const Field = require('../models/Field');
const mongoose = require('mongoose');
const { sendReservationConfirmation } = require('../services/emailService');

const createReservation = async (req, res) => {
  try {
    console.log('=== CREAR RESERVA ===');
    console.log('Body recibido:', req.body);
    
    const { fieldId, date, startTime, endTime, userName, userEmail, userPhone, paymentMethod } = req.body;
    
    // Validar campos obligatorios
    if (!fieldId || !date || !startTime || !userName || !userEmail || !userPhone) {
      console.log('❌ Faltan campos obligatorios');
      return res.status(400).json({ 
        message: 'Faltan campos obligatorios',
        received: { fieldId: !!fieldId, date: !!date, startTime: !!startTime, userName: !!userName, userEmail: !!userEmail, userPhone: !!userPhone }
      });
    }

    // Validar que fieldId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(fieldId)) {
      console.log('❌ fieldId inválido:', fieldId);
      return res.status(400).json({ message: 'ID de cancha inválido' });
    }

    // Verificar que la cancha existe
    console.log('Buscando cancha con ID:', fieldId);
    const fieldExists = await Field.findById(fieldId);
    if (!fieldExists) {
      console.log('❌ Cancha no encontrada con ID:', fieldId);
      return res.status(404).json({ message: 'Cancha no encontrada en la base de datos' });
    }

    console.log('✓ Cancha encontrada:', fieldExists.name);

    // Crear fecha en formato correcto (sin problemas de zona horaria)
    const dateObj = new Date(date);
    
    // Si la fecha viene en formato YYYY-MM-DD, crear correctamente
    if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      dateObj.setFullYear(parseInt(year));
      dateObj.setMonth(parseInt(month) - 1);
      dateObj.setDate(parseInt(day));
      dateObj.setHours(12, 0, 0, 0);
    }

    // Validar que la hora esté dentro del rango permitido (17:00 - 23:00)
    const [hours] = startTime.split(':');
    const hourNum = parseInt(hours);
    if (hourNum < 17 || hourNum > 23) {
      return res.status(400).json({ 
        message: 'Solo se pueden reservar canchas entre las 17:00 y las 23:00 horas' 
      });
    }

    // Validar que no sea una fecha/hora pasada
    const now = new Date();
    const reservationDateTime = new Date(dateObj);
    reservationDateTime.setHours(hourNum, 0, 0, 0);
    
    if (reservationDateTime < now) {
      return res.status(400).json({ 
        message: 'No se puede reservar una fecha y hora que ya pasó' 
      });
    }

    // Verificar si ya existe una reserva confirmada para esa cancha en ese horario
    const existingReservation = await Reservation.findOne({
      fieldId: fieldExists._id,
      date: dateObj,
      startTime: startTime,
      status: 'confirmado'
    });

    if (existingReservation) {
      console.log('❌ Ya existe una reserva para este horario');
      return res.status(409).json({ 
        message: `La cancha ya está reservada para el ${date} a las ${startTime}. Por favor elige otro horario.` 
      });
    }

    console.log('✓ Horario disponible');

    // Crear la reserva
    const reservation = new Reservation({
      userId: req.user.id,
      fieldId: fieldExists._id,
      date: dateObj,
      startTime,
      endTime: endTime || startTime,
      userName,
      userEmail,
      userPhone,
      status: 'confirmado',
      paymentMethod: paymentMethod || 'transferencia',
      qrCode: `QR-${Date.now()}-${req.user.id}`
    });

    console.log('Guardando reserva con método de pago:', paymentMethod);
    await reservation.save();
    
    console.log('✓ Reserva guardada con ID:', reservation._id);
    
    const populated = await Reservation.findById(reservation._id).populate('fieldId');
    
    // Enviar email de confirmación
    console.log('📧 Enviando email de confirmación...');
    if (!process.env.EMAIL_PASS) {
      console.warn('⚠️ EMAIL_PASS no definido: se omite envío de correo.');
    } else {
      const emailResult = await sendReservationConfirmation(populated, fieldExists.name);
      if (emailResult.success) {
        console.log('✓ Email enviado exitosamente a:', userEmail);
        if (emailResult.info) {
          console.log('✉️ messageId:', emailResult.info.messageId);
          console.log('✅ accepted:', emailResult.info.accepted);
          console.log('❌ rejected:', emailResult.info.rejected);
        }
        if (emailResult.previewUrl) console.log('🔗 Vista previa (Ethereal):', emailResult.previewUrl);
      } else if (emailResult.authError) {
        console.warn('⚠️ Fallo autenticación SMTP (535). Verifica: Gmail con 2FA + App Password sin espacios, y EMAIL_USER correcto.');
      } else {
        console.warn('⚠️ No se pudo enviar el email:', emailResult.error);
      }
    }
    
    console.log('✓ Reserva creada exitosamente con pago:', populated.paymentMethod);
    
    return res.status(201).json(populated);
  } catch (err) {
    console.error('❌ Error al crear reserva:', err);
    console.error('Stack:', err.stack);
    return res.status(500).json({ 
      message: 'Error al crear reserva', 
      error: err.message
    });
  }
};

const getUserReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.user.id })
      .populate('fieldId')
      .sort({ date: -1 });
    
    // Filtrar reservas con cancha eliminada (fieldId null) y devolver con placeholder
    const sanitized = reservations.map(r => {
      const obj = r.toObject();
      if (!obj.fieldId) {
        obj.fieldId = { 
          _id: null, 
          name: '(Cancha eliminada)', 
          surfaceType: 'N/A', 
          price: 0,
          image: '' 
        };
      }
      return obj;
    });
    
    return res.json(sanitized);
  } catch (err) {
    console.error('Get user reservations error:', err);
    return res.status(500).json({ message: 'Error al obtener reservas' });
  }
};

const getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('fieldId')
      .populate('userId', 'name email')
      .sort({ date: -1 });
    
    // Sanitizar fieldId null
    const sanitized = reservations.map(r => {
      const obj = r.toObject();
      if (!obj.fieldId) {
        obj.fieldId = { 
          _id: null, 
          name: '(Cancha eliminada)', 
          surfaceType: 'N/A', 
          price: 0,
          image: '' 
        };
      }
      return obj;
    });
    
    return res.json(sanitized);
  } catch (err) {
    console.error('Get all reservations error:', err);
    return res.status(500).json({ message: 'Error al obtener reservas' });
  }
};

const cancelReservation = async (req, res) => {
  try {
    console.log('=== CANCELAR RESERVA ===');
    console.log('ID de reserva:', req.params.id);
    console.log('Usuario:', req.user.id);
    
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    
    // Verificar que la reserva pertenece al usuario
    if (reservation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para cancelar esta reserva' });
    }
    
    // Verificar que la reserva no esté ya cancelada
    if (reservation.status === 'cancelado') {
      return res.status(400).json({ message: 'La reserva ya está cancelada' });
    }
    
    // Combinar fecha y hora de la reserva en zona horaria local
    const [hours, minutes] = reservation.startTime.split(':');
    const reservationDateTime = new Date(reservation.date);
    reservationDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Calcular 24 horas antes de la reserva
    const twentyFourHoursBefore = new Date(reservationDateTime.getTime() - (24 * 60 * 60 * 1000));
    const now = new Date();
    
    console.log('Fecha/hora de reserva:', reservationDateTime);
    console.log('24 horas antes:', twentyFourHoursBefore);
    console.log('Ahora:', now);
    
    // Verificar que falten más de 24 horas para la reserva
    if (now >= twentyFourHoursBefore) {
      const hoursLeft = Math.round((reservationDateTime - now) / (1000 * 60 * 60));
      return res.status(400).json({ 
        message: `No se puede cancelar. Debes cancelar con al menos 24 horas de anticipación. Solo quedan ${hoursLeft} hora(s).` 
      });
    }
    
    // Actualizar el estado a cancelado y eliminar el QR
    reservation.status = 'cancelado';
    reservation.qrCode = null; // ← eliminar código QR al cancelar
    await reservation.save();
    
    const populated = await Reservation.findById(reservation._id).populate('fieldId');
    
    console.log('✓ Reserva cancelada exitosamente');
    
    return res.json(populated);
  } catch (err) {
    console.error('❌ Error al cancelar reserva:', err);
    return res.status(500).json({ 
      message: 'Error al cancelar la reserva', 
      error: err.message 
    });
  }
};

module.exports = {
  createReservation,
  getUserReservations,
  getAllReservations,
  cancelReservation
};
