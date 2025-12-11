require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const fieldsRoutes = require('./routes/fields');
const contactRoutes = require('./routes/contact');
const reservationsRoutes = require('./routes/reservations');
const messagesRouter = require('./routes/messages');
const { sendReservationConfirmation } = require('./services/emailService'); // asegura carga del módulo

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// rutas
app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/messages', messagesRouter);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// middleware para rutas no encontradas
app.use((req, res, next) => {
	res.status(404).json({ message: 'Ruta no encontrada' });
});

// middleware global de errores (captura excepciones y responde JSON)
app.use((err, req, res, next) => {
	console.error('Error global:', err);
	const status = err.status || 500;
	const message = err.message || 'Error interno del servidor';
	res.status(status).json({ message });
});

// conectar DB y arrancar
// usar 127.0.0.1 por defecto para evitar resolución IPv6 (::1) en algunos sistemas
const defaultUri = 'mongodb://127.0.0.1:27017/futbolflex';
const mongoUri = process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '' ? process.env.MONGO_URI : defaultUri;

connectDB(mongoUri)
  .then(async () => {
    // Verificar transporte email una sola vez (silencioso si falla)
    try {
      require('./services/emailService');
      console.log('⏳ Verificando transporte de email (lazy)...');
      // Se crea en primer envío; aquí solo log informativo
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar servicio de email:', e.message);
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('No se pudo iniciar el servidor por error en la DB:', err && err.message ? err.message : err);
    // dejar el proceso en vivo para depuración; si prefieres salir:
    // process.exit(1);
  });
