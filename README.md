# ⚽ FutbolFlex - Sistema de Reservas de Canchas de Fútbol

Sistema completo de gestión y reservas de canchas de fútbol con autenticación, pagos y notificaciones por email.

## 🚀 Características

- ✅ Autenticación de usuarios (JWT)
- ⚽ Gestión de canchas (CRUD admin)
- 📅 Sistema de reservas con disponibilidad en tiempo real
- 💳 Pasarela de pagos (Tarjeta/Transferencia)
- 📧 Notificaciones por email con QR
- 🎫 Códigos QR para validación de entrada
- 📱 Diseño responsive
- 🔔 Notificaciones en tiempo real (SSE)
- 📊 Panel de administración
- 📜 Historial de reservas

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (autenticación)
- Nodemailer (emails)
- QRCode (generación de códigos)
- Server-Sent Events (notificaciones)

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- QRCode.react
- Vite

## 📋 Requisitos Previos

- Node.js v16+ 
- MongoDB v5+
- Cuenta Gmail con App Password (para emails)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/futbolflex.git
cd futbolflex
```

### 2. Instalar dependencias del Backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del Frontend

```bash
cd ../frontend
npm install
```

### 4. Configurar variables de entorno

#### Backend: `backend/.env`

```env
MONGO_URI=mongodb://127.0.0.1:27017/futbolflex
JWT_SECRET=tu_secreto_super_seguro_aqui_cambiar_en_produccion
PORT=4000

# Email (Gmail con App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_sin_espacios
EMAIL_FROM=FutbolFlex <tu_email@gmail.com>
EMAIL_DEBUG=0

# Opcional
SITE_URL=http://localhost:5173
```

**⚠️ IMPORTANTE - Configurar Gmail:**
1. Ir a [Google Account Security](https://myaccount.google.com/security)
2. Activar "Verificación en 2 pasos"
3. Generar "Contraseñas de aplicaciones"
4. Copiar la contraseña de 16 caracteres (sin espacios) en `EMAIL_PASS`

#### Frontend: `frontend/.env`

```env
VITE_GOOGLE_MAPS_API_KEY=TU_API_KEY_OPCIONAL
```

### 5. Iniciar MongoDB

```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
```

### 6. Ejecutar el proyecto

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Servidor corriendo en http://localhost:4000
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# Aplicación corriendo en http://localhost:5173
```

## 👤 Crear Usuario Administrador

### Opción 1: Desde MongoDB Compass / Shell

```javascript
db.users.insertOne({
  name: "Admin",
  email: "admin@futbolflex.cl",
  password: "$2a$10$xMkMCV7WOuxmvJ9WJbGgFuEpArUWDmSeiuQent.BRCLXypCb51F32", // password: admin123
  phone: "123456789",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Opción 2: Desde la aplicación
1. Registrarse como usuario normal
2. Conectar a MongoDB y cambiar manualmente el `role` a `"admin"`

## 📁 Estructura del Proyecto

```
futbolflex/
├── backend/
│   ├── config/          # Configuración DB
│   ├── controllers/     # Lógica de negocio
│   ├── events/          # Event Emitters (SSE)
│   ├── middleware/      # Auth, Admin, etc.
│   ├── models/          # Modelos Mongoose
│   ├── routes/          # Rutas API
│   ├── services/        # Email, QR, etc.
│   ├── .env.example     # Variables de entorno ejemplo
│   ├── server.js        # Punto de entrada
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── images/
    │       ├── fields/  # Imágenes de canchas
    │       └── b1.png   # Logo
    ├── src/
    │   ├── components/  # Componentes reutilizables
    │   ├── context/     # AuthContext
    │   ├── pages/       # Páginas/Vistas
    │   ├── utils/       # Helpers (apiClient)
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    ├── vite.config.js
    └── package.json
```

## 🔐 Roles de Usuario

- **user**: Usuario normal (puede reservar canchas)
- **admin**: Administrador (gestión completa)

## 🎯 Funcionalidades por Rol

### Usuario (`user`)
- ✅ Ver canchas disponibles
- ✅ Realizar reservas
- ✅ Ver historial de reservas
- ✅ Cancelar reservas (hasta 24h antes)
- ✅ Recibir QR por email

### Administrador (`admin`)
- ✅ Todo lo de usuario +
- ✅ Crear/Editar/Eliminar canchas
- ✅ Ver todas las reservas del sistema
- ✅ Filtrar reservas por fecha/cancha
- ✅ Ver estadísticas
- ✅ Gestionar mensajes de contacto
- ✅ Notificaciones en tiempo real (SSE)

## 📧 Configuración de Emails

El sistema soporta:
1. **Gmail** (requiere App Password)
2. **Ethereal** (fallback automático para desarrollo/testing)

Si las credenciales de Gmail fallan, el sistema creará automáticamente una cuenta de prueba en [Ethereal](https://ethereal.email) y mostrará el link de vista previa en consola.

## 🚢 Despliegue

### Backend (Railway, Render, Heroku)

```bash
# Variables de entorno requeridas
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/futbolflex
JWT_SECRET=secreto_produccion_seguro
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
PORT=4000
```

### Frontend (Vercel, Netlify)

```bash
npm run build
# Subir carpeta dist/
```

**⚠️ Configurar Proxy:** Actualizar `vite.config.js` con la URL del backend en producción.

## 🐛 Solución de Problemas

### Error: "Token inválido"
- Verificar que `JWT_SECRET` sea el mismo en `.env`
- Cerrar sesión y volver a iniciar

### Error: "Cannot connect to MongoDB"
- Verificar que MongoDB esté corriendo
- Revisar `MONGO_URI` en `.env`

### No llegan emails
- Verificar que `EMAIL_PASS` sea un App Password (no tu contraseña de Gmail)
- Activar verificación en 2 pasos de Google
- Revisar que no haya espacios en `EMAIL_PASS`

### Canchas no se ven
- Verificar que existan documentos en la colección `fields`
- Revisar consola del navegador (F12)

## 📝 Scripts Disponibles

### Backend
```bash
npm start       # Producción
npm run dev     # Desarrollo (nodemon)
```

### Frontend
```bash
npm run dev     # Desarrollo
npm run build   # Compilar para producción
npm run preview # Vista previa del build
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

MIT © 2025 FutbolFlex

## 👥 Autor

**Tu Nombre** - [GitHub](https://github.com/TU_USUARIO)

## 📞 Soporte

Si tienes problemas:
1. Revisa la sección "Solución de Problemas"
2. Abre un [Issue](https://github.com/TU_USUARIO/futbolflex/issues)
3. Contacta: tu_email@ejemplo.com
