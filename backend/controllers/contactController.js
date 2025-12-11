const Contact = require('../models/Contact');

const submit = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'Faltan campos' });
    const c = new Contact({ name, email, message });
    await c.save();
    res.status(201).json({ message: 'Mensaje enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Error al obtener mensajes' });
  }
};

module.exports = { submit, getAllMessages };
