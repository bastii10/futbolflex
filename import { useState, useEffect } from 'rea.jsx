import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Contact = () => {
  const API = '/api';
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estado para mensajes admin
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Cargar mensajes si es admin
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || user.role !== 'admin') return;
      
      setLoadingMessages(true);
      try {
        const res = await fetch('/api/contact/messages', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        if (!res.ok) throw new Error((data && data.message) || 'Error al obtener mensajes');
        setMessages(data);
      } catch (err) {
        console.error('Error cargando mensajes:', err);
        setToast({ type: 'error', message: 'Error al cargar mensajes de soporte' });
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || text || `Error ${res.status}`);
      setToast({ type: 'success', message: '¡Mensaje enviado exitosamente!' });
      setForm({ name: '', email: '', message: '' });
      
      // Recargar mensajes si es admin
      if (user && user.role === 'admin') {
        const resMessages = await fetch('/api/contact/messages', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const textMessages = await resMessages.text();
        const dataMessages = textMessages ? JSON.parse(textMessages) : [];
        setMessages(dataMessages);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Error enviando mensaje' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className={`grid grid-cols-1 ${user && user.role === 'admin' ? 'lg:grid-cols-2' : ''} gap-8`}>
        {/* Formulario de contacto */}
        <div>
          <h1 className="text-3xl font-bold mb-6">Contacto y Soporte</h1>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="Tu nombre completo" 
                className="w-full p-3 border rounded-lg" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
              <input 
                name="email" 
                type="email"
                value={form.email} 
                onChange={handleChange} 
                placeholder="tu@email.com" 
                className="w-full p-3 border rounded-lg" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
              <textarea 
                name="message" 
                value={form.message} 
                onChange={handleChange} 
                placeholder="Escribe tu mensaje o consulta" 
                rows="6" 
                className="w-full p-3 border rounded-lg" 
                required 
              />
            </div>
            <button 
              type="submit"
              disabled={loading} 
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
          </form>
        </div>

        {/* Panel de mensajes para administrador */}
        {user && user.role === 'admin' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Mensajes de Soporte Recibidos</h2>
            <div className="bg-white p-6 rounded-xl shadow">
              {loadingMessages ? (
                <p className="text-gray-600">Cargando mensajes...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-600">No hay mensajes de soporte.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg._id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">{msg.name}</h3>
                          <p className="text-sm text-gray-600">{msg.email}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
