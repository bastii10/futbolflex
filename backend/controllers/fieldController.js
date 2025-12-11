const Field = require('../models/Field');
const Reservation = require('../models/Reservation');
const { emitFieldEvent } = require('../events/fieldEvents'); // ← añadido

// Bandera para deshabilitar modificaciones
const EDIT_DISABLED = false;

const getAll = async (req, res) => {
  try {
    const fields = await Field.find().sort({ name: 1 });

    // Rango de días (hoy + 6 días)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const daysCount = 7;
    const hours = ['17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

    const addDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    };
    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Obtener reservas confirmadas por campo dentro del rango
    const end = addDays(start, daysCount - 1);
    const allFieldIds = fields.map(f => f._id);
    const reservations = await Reservation.find({
      fieldId: { $in: allFieldIds },
      status: 'confirmado',
      date: { $gte: start, $lte: end }
    }).select('fieldId date startTime');

    // Normalizar reservas en un Set por clave "fieldId|YYYY-MM-DD|HH:mm"
    const reservedSet = new Set();
    for (const r of reservations) {
      const d = new Date(r.date);
      const key = `${String(r.fieldId)}|${toYMD(d)}|${r.startTime}`;
      reservedSet.add(key);
    }

    // Construir respuesta con availabilitySummary
    const result = fields.map(f => {
      const fObj = f.toObject();
      const days = [];
      for (let i = 0; i < daysCount; i++) {
        const dayDate = addDays(start, i);
        const ymd = toYMD(dayDate);
        const slots = {};
        let availableCount = 0;
        for (const h of hours) {
          const key = `${String(f._id)}|${ymd}|${h}`;
          const isReserved = reservedSet.has(key);
          const isAvailable = !isReserved;
          slots[h] = isAvailable;
          if (isAvailable) availableCount++;
        }
        days.push({ date: ymd, availableCount, slots });
      }
      fObj.availabilitySummary = { days };
      return fObj;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener canchas' });
  }
};

const getById = async (req, res) => {
  try {
    const field = await Field.findById(req.params.id);
    if (!field) return res.status(404).json({ message: 'Cancha no encontrada' });
    res.json(field);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener cancha' });
  }
};

const createField = async (req, res) => {
  try {
    if (EDIT_DISABLED) return res.status(403).json({ message: 'Edición de canchas deshabilitada' });
    const { name, surfaceType, price, imgName, location, availableHours } = req.body;
    const field = new Field({
      name,
      surfaceType,
      price,
      image: imgName || '', // Solo guardar el nombre sin ruta
      location: location || '',
      availableHours: availableHours || []
    });
    await field.save();
    emitFieldEvent('field.created', { id: field._id, name: field.name }); // ← evento
    res.status(201).json(field);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear cancha' });
  }
};

const updateField = async (req, res) => {
  try {
    if (EDIT_DISABLED) return res.status(403).json({ message: 'Edición de canchas deshabilitada' });
    const updates = req.body;
    if (updates.imgName) updates.image = updates.imgName; // Solo el nombre
    const field = await Field.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!field) return res.status(404).json({ message: 'Cancha no encontrada' });
    emitFieldEvent('field.updated', { id: field._id, name: field.name }); // ← evento
    res.json(field);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar cancha' });
  }
};

const deleteField = async (req, res) => {
  try {
    if (EDIT_DISABLED) return res.status(403).json({ message: 'Edición de canchas deshabilitada' });
    const field = await Field.findByIdAndDelete(req.params.id);
    if (!field) return res.status(404).json({ message: 'Cancha no encontrada' });
    emitFieldEvent('field.deleted', { id: field._id, name: field.name }); // ← evento
    res.json({ message: 'Cancha eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar cancha' });
  }
};

module.exports = { getAll, getById, createField, updateField, deleteField };
