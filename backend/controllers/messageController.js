const Message = require('../models/Message');

const createMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    const doc = await Message.create({
      name, email, phone: phone || '', subject, message,
      userId: req.user ? req.user.id : null
    });
    return res.status(201).json(doc);
  } catch (err) {
    console.error('Create message error:', err);
    return res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};

const getAllMessages = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const items = await Message.find().sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Error al obtener mensajes' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Mensaje no encontrado' });
    return res.json({ message: 'Mensaje eliminado' });
  } catch (err) {
    console.error('Delete message error:', err);
    return res.status(500).json({ message: 'Error al eliminar mensaje' });
  }
};

module.exports = { createMessage, getAllMessages, deleteMessage };
