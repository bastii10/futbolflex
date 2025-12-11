import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const AdminDashboard = () => {
  const API = '/api/fields';
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ name: '', surfaceType: '', price: 30000, imgName: '' });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // ← NUEVO
  const [processing, setProcessing] = useState(false); // ← NUEVO (para botones modal)

  const fetchFields = async () => {
    const res = await fetch(API);
    const data = await res.json();
    setFields(data);
  };

  useEffect(() => { fetchFields(); }, []);

  // SSE para notificaciones admin
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    let es = null;
    let closed = false;
    
    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('token') || '';
      es = new EventSource(`/api/fields/events?token=${encodeURIComponent(token)}`);

      const notify = (type, data) => {
        const msgMap = {
          'field.created': `✅ Creada: ${data.name}`,
          'field.updated': `✏️ Actualizada: ${data.name}`,
          'field.deleted': `🗑️ Eliminada: ${data.name}`
        };
        if (msgMap[type]) {
          setToast({ type: 'success', message: msgMap[type] });
          fetchFields();
        }
      };

      es.addEventListener('field.created', e => notify('field.created', JSON.parse(e.data)));
      es.addEventListener('field.updated', e => notify('field.updated', JSON.parse(e.data)));
      es.addEventListener('field.deleted', e => notify('field.deleted', JSON.parse(e.data)));
      es.addEventListener('ping', () => {});

      es.onerror = () => {
        if (!closed && es.readyState === EventSource.CLOSED) {
          console.warn('SSE desconectado, reconectando en 3s...');
          setTimeout(connect, 3000);
        }
      };
    };
    
    connect();
    
    return () => {
      closed = true;
      if (es) es.close();
    };
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const opts = {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      };
      const url = editingId ? `${API}/${editingId}` : API;
      const res = await fetch(url, opts);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || text || `Error ${res.status}`);
      setMsg(editingId ? 'Cancha actualizada' : 'Cancha creada');
      setForm({ name: '', surfaceType: '', price: 30000, imgName: '' });
      setEditingId(null);
      fetchFields();
    } catch (err) {
      setMsg(err.message || 'Error');
    }
  };

  const edit = (f) => {
    setEditingId(f._id);
    setForm({ name: f.name, surfaceType: f.surfaceType, price: f.price, imgName: f.image ? f.image.split('/').pop() : '' });
  };

  const del = async (id) => {
    // Reemplazar confirm nativo por modal
    const f = fields.find(x => x._id === id);
    setConfirmTarget({ id, name: f?.name || 'Cancha' });
  };

  // NUEVO: ejecutar borrado tras confirmar
  const performDelete = async () => {
    if (!confirmTarget) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API}/${confirmTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }});
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || text || `Error ${res.status}`);
      setMsg('Cancha eliminada');
      setToast({ type: 'success', message: `🗑️ Cancha "${confirmTarget.name}" eliminada` });
      fetchFields();
    } catch (err) {
      setMsg(err.message || 'Error');
      setToast({ type: 'error', message: err.message || 'Error eliminando cancha' });
    } finally {
      setProcessing(false);
      setConfirmTarget(null);
    }
  };

  if (!user || user.role !== 'admin') return <div className="container mx-auto p-6">Acceso denegado.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-3">{editingId ? 'Editar cancha' : 'Crear cancha'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre" className="w-full p-3 border rounded" required />
            <input name="surfaceType" value={form.surfaceType} onChange={handleChange} placeholder="Tipo de superficie" className="w-full p-3 border rounded" required />
            <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="Precio" className="w-full p-3 border rounded" required />
            <input name="imgName" value={form.imgName} onChange={handleChange} placeholder="Nombre archivo imagen (ej: cancha4.jpg -> cancha4)" className="w-full p-3 border rounded" />
            <button className="bg-green-600 text-white px-4 py-2 rounded">{editingId ? 'Actualizar' : 'Crear'}</button>
          </form>
          {msg && <div className="mt-3 text-sm text-green-700">{msg}</div>}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Listado de canchas</h2>
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f._id} className="flex items-center justify-between border p-3 rounded">
                <div>
                  <div className="font-bold">{f.name}</div>
                  <div className="text-sm text-gray-600">{f.surfaceType} — ${f.price}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => edit(f)} className="px-3 py-1 bg-yellow-400 rounded">Editar</button>
                  <button onClick={() => del(f._id)} className="px-3 py-1 bg-red-500 text-white rounded">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmación bonito */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗑️</span>
                <h3 className="text-lg font-extrabold">Confirmar eliminación</h3>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-gray-700">
                ¿Seguro que deseas eliminar la cancha
                <span className="font-bold"> "{confirmTarget.name}"</span>? Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>⚠️</span>
                <span>Las reservas históricas no se eliminan.</span>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={processing}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={performDelete}
                disabled={processing}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-gray-400"
              >
                {processing ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;
