import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const AdminMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/contact/messages', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        if (!res.ok) throw new Error((data && data.message) || 'Error al obtener mensajes');
        setMessages(data);
      } catch (err) {
        setToast({ message: err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') fetchMessages();
  }, [user]);

  if (!user || user.role !== 'admin') return <div className="container mx-auto p-6">Acceso no autorizado</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Mensajes de Soporte</h2>
      
      {loading ? (
        <p>Cargando mensajes...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-600">No hay mensajes de soporte.</p>
      ) : (
        <div className="grid gap-4">
          {messages.map(msg => (
            <div key={msg._id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold">{msg.name}</h3>
                  <p className="text-gray-600">{msg.email}</p>
                  <p className="mt-2">{msg.message}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
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

export default AdminMessages;
