import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const Contact = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Prefill inmediato si ya existe el usuario
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: ''
  });

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  // Admin: listado de mensajes
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Bloquear edición si hay usuario logueado
  const lockPersonalData = !!user;

  // Mantener actualizado si el usuario cambia (login/logout)
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  // Admin: cargar mensajes
  const fetchMessages = async () => {
    if (!user || user.role !== 'admin') return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error(data?.message || 'Error al obtener mensajes');
      setMessages(data);
    } catch (err) {
      setMessages([]);
      setToast({ type: 'error', message: err.message || 'Error al obtener mensajes' });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchMessages();
  }, [user]);

  const handleChange = (e) => {
    // Evitar modificaciones en datos personales si hay usuario logueado
    if (lockPersonalData && ['name', 'email', 'phone'].includes(e.target.name)) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verificar que el usuario esté logueado
    if (!user) {
      setToast({ type: 'error', message: 'Debes iniciar sesión para enviar un mensaje' });
      setTimeout(() => {
        navigate('/login', { state: { from: '/contact' } });
      }, 2000);
      return;
    }

    if (!form.name || !form.email || !form.subject || !form.message) {
      setToast({ type: 'error', message: 'Completa los campos obligatorios.' });
      return;
    }
    
    setProcessing(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.message || 'Error al enviar mensaje');

      setToast({ type: 'success', message: 'Mensaje enviado. Te contactaremos pronto.' });
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        subject: '',
        message: ''
      });
      if (user?.role === 'admin') await fetchMessages();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Error al enviar mensaje' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.message || 'Error al eliminar mensaje');
      setMessages(prev => prev.filter(m => m._id !== id));
      setToast({ type: 'success', message: 'Mensaje eliminado' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Error al eliminar mensaje' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Contacto</h2>

      {/* Mensaje de advertencia si no está logueado */}
      {!user && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">ℹ️</div>
            <div>
              <h3 className="font-bold text-blue-800 mb-1">Inicia sesión para contactarnos</h3>
              <p className="text-blue-700 text-sm">Debes tener una cuenta para enviar mensajes de contacto.</p>
              <button
                onClick={() => navigate('/login', { state: { from: '/contact' } })}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de contacto con datos precargados */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nombre"
              autoComplete="name"
              readOnly={lockPersonalData}
              title={lockPersonalData ? 'Este dato no se puede modificar' : undefined}
              className={`p-3 border rounded ${lockPersonalData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
              readOnly={lockPersonalData}
              title={lockPersonalData ? 'Este dato no se puede modificar' : undefined}
              className={`p-3 border rounded ${lockPersonalData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Teléfono (opcional)"
              autoComplete="tel"
              readOnly={lockPersonalData}
              title={lockPersonalData ? 'Este dato no se puede modificar' : undefined}
              className={`p-3 border rounded md:col-span-2 ${lockPersonalData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Asunto"
              className="p-3 border rounded md:col-span-2"
              required
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Tu mensaje"
              className="p-3 border rounded md:col-span-2 h-32"
              required
            />
          </div>
          <button
            disabled={processing || !user}
            className="mt-4 w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? '⏳ Enviando...' : !user ? '🔒 Debes iniciar sesión' : 'Enviar mensaje'}
          </button>
        </form>

        {/* Información lateral */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-xl font-semibold mb-4">Información</h3>
          <p className="text-gray-600 mb-2">Email: contacto@futbolflex.cl</p>
          <p className="text-gray-600 mb-2">Teléfono: +56 9 1234 5678</p>
          <p className="text-gray-600">Horario: Lunes a Domingo 09:00–22:00</p>
        </div>
      </div>

      {/* Listado de mensajes (solo admin) */}
      {user && user.role === 'admin' && (
        <div className="mt-10">
          <h3 className="text-2xl font-bold mb-4">Mensajes recibidos</h3>
          {loadingList ? (
            <div className="text-gray-600">⏳ Cargando mensajes...</div>
          ) : messages.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">No hay mensajes aún</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Fecha</th>
                    <th className="p-2 border">Nombre</th>
                    <th className="p-2 border">Email</th>
                    <th className="p-2 border">Teléfono</th>
                    <th className="p-2 border">Asunto</th>
                    <th className="p-2 border">Mensaje</th>
                    <th className="p-2 border">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50">
                      <td className="p-2 border">{new Date(m.createdAt).toLocaleString('es-CL')}</td>
                      <td className="p-2 border">{m.name}</td>
                      <td className="p-2 border">{m.email}</td>
                      <td className="p-2 border">{m.phone || '-'}</td>
                      <td className="p-2 border">{m.subject}</td>
                      <td className="p-2 border max-w-xs truncate" title={m.message}>{m.message}</td>
                      <td className="p-2 border">
                        <button
                          onClick={() => handleDelete(m._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Contact;
