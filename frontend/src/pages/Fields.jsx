import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SmartImage from '../components/SmartImage';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Fields = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const emptyForm = { name: '', surfaceType: '', price: 30000, imgName: '' };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // ← NUEVO: modal de confirmación

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fields');
      const text = await res.text();
      let data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error((data && data.message) || `Error ${res.status}`);
      setFields(data);
    } catch (err) {
      console.error('Fetch fields error:', err);
      setToast({ type: 'error', message: err.message || 'Error cargando canchas' });
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFields(); }, []);

  // Suscripción a eventos de canchas (solo admin)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    let es = null;
    let closed = false;
    
    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('token') || '';
      es = new EventSource(`/api/fields/events?token=${encodeURIComponent(token)}`);
      
      const handle = (type, data) => {
        const map = {
          'field.created': `🟢 Cancha creada: ${data.name}`,
          'field.updated': `📝 Cancha actualizada: ${data.name}`,
          'field.deleted': `🗑️ Cancha eliminada: ${data.name}`
        };
        if (map[type]) {
          setToast({ type: 'success', message: map[type] });
          fetchFields();
        }
      };
      
      es.addEventListener('field.created', e => handle('field.created', JSON.parse(e.data)));
      es.addEventListener('field.updated', e => handle('field.updated', JSON.parse(e.data)));
      es.addEventListener('field.deleted', e => handle('field.deleted', JSON.parse(e.data)));
      es.addEventListener('ping', () => {}); // keepalive
      
      es.onerror = (e) => {
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

  const hasError = (name) => submitted && !String(form[name] || '').trim();

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.name || !form.surfaceType || !form.price) {
      setToast({ type: 'error', message: 'Completa los campos obligatorios.' });
      return;
    }
    if (!user || user.role !== 'admin') {
      setToast({ type: 'error', message: 'Solo administradores pueden realizar esta acción.' });
      return;
    }
    setProcessing(true);
    try {
      const url = editingId ? `/api/fields/${editingId}` : '/api/fields';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || text || `Error ${res.status}`);
      setToast({ type: 'success', message: editingId ? 'Cancha actualizada exitosamente' : 'Cancha creada exitosamente' });
      setForm(emptyForm);
      setEditingId(null);
      setSubmitted(false);
      await fetchFields();
    } catch (err) {
      console.error('Submit field error:', err);
      setToast({ type: 'error', message: err.message || 'Error procesando la solicitud' });
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (f) => {
    setEditingId(f._id);
    setForm({
      name: f.name || '',
      surfaceType: f.surfaceType || '',
      price: f.price || 30000,
      imgName: f.image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSubmitted(false);
  };

  const handleDelete = async (id) => {
    if (!user || user.role !== 'admin') {
      setToast({ type: 'error', message: 'Solo administradores pueden eliminar canchas.' });
      return;
    }
    const f = fields.find(x => x._id === id);
    setConfirmTarget({ id, name: f?.name || 'Cancha' }); // ← Abrir modal bonito
  };

  // NUEVO: ejecutar eliminación tras confirmar
  const performDelete = async () => {
    if (!confirmTarget) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/fields/${confirmTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data && data.message) || text || `Error ${res.status}`);
      setToast({ type: 'success', message: `🗑️ Cancha "${confirmTarget.name}" eliminada` });
      await fetchFields();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Error eliminando cancha' });
    } finally {
      setProcessing(false);
      setConfirmTarget(null);
    }
  };

  const handleReserve = (id, prefill = {}) => {
    const prefillUser = user
      ? {
          prefillName: user.name || '',
          prefillEmail: user.email || '',
          prefillPhone: user.phone || '',
        }
      : {};
    navigate('/reservas', { state: { prefillFieldId: id, ...prefillUser, ...prefill } });
  };

  const formatDayShort = (ymd) => {
    try {
      const [y,m,d] = ymd.split('-').map(Number);
      const date = new Date(y, m-1, d);
      return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
    } catch {
      return ymd;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Canchas disponibles</h2>

      {/* Form creación/edición (visible solo admin) */}
      {user && user.role === 'admin' && (
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h3 className="text-xl font-semibold mb-4">{editingId ? '✏️ Editar Cancha' : '➕ Crear Nueva Cancha'}</h3>
          <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="col-span-1">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nombre (ej: Cancha 1)"
                className={`p-3 border rounded w-full ${hasError('name') ? 'border-red-400' : ''}`}
                required
              />
              {hasError('name') && <p className="text-xs text-red-500 mt-1">Nombre es obligatorio</p>}
            </div>
            <div className="col-span-1">
              <input
                name="surfaceType"
                value={form.surfaceType}
                onChange={handleChange}
                placeholder="Tipo (ej: Sintético)"
                className={`p-3 border rounded w-full ${hasError('surfaceType') ? 'border-red-400' : ''}`}
                required
              />
              {hasError('surfaceType') && <p className="text-xs text-red-500 mt-1">Tipo es obligatorio</p>}
            </div>
            <div className="col-span-1">
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                placeholder="30000"
                className={`p-3 border rounded w-full ${hasError('price') ? 'border-red-400' : ''}`}
                required
              />
              {hasError('price') && <p className="text-xs text-red-500 mt-1">Precio es obligatorio</p>}
            </div>
            <div className="col-span-1">
              <input
                name="imgName"
                value={form.imgName}
                onChange={handleChange}
                placeholder="cancha1"
                className="p-3 border rounded w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Imagen en /public/images/fields/</p>
            </div>
            <div className="md:col-span-4 flex gap-3 mt-2">
              <button disabled={processing} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors">
                {processing ? '⏳ Procesando...' : editingId ? '💾 Guardar cambios' : '✓ Crear cancha'}
              </button>
              {editingId && <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded border hover:bg-gray-100">Cancelar</button>}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-8">⏳ Cargando canchas...</div>
      ) : fields.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-yellow-800 mb-2">No hay canchas registradas</h3>
          <p className="text-yellow-700">
            {user && user.role === 'admin' 
              ? 'Crea la primera cancha usando el formulario de arriba ⬆️' 
              : 'Aún no hay canchas disponibles. Vuelve más tarde.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((f) => {
            const days = f.availabilitySummary?.days || [];
            const today = days[0] || null;
            const slots = today?.slots || {};
            const hoursOrder = ['17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

            return (
              <div key={f._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <SmartImage
                  name={f.image || 'cancha1'}
                  alt={f.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{f.name}</h3>
                      <p className="text-sm text-gray-600">{f.surfaceType}</p>
                      <p className="text-green-600 font-bold mt-2 text-lg">${Number(f.price).toLocaleString()}/hora</p>
                      {user && user.role === 'admin' && (
                        <p className="text-xs text-gray-400 mt-1 font-mono">ID: {f._id}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => handleReserve(f._id)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        📅 Reservar
                      </button>
                      {user && user.role === 'admin' && (
                        <>
                          <button onClick={() => startEdit(f)} className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded hover:bg-yellow-500 transition-colors">
                            ✏️ Editar
                          </button>
                          <button onClick={() => handleDelete(f._id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" disabled={processing}>
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Días (verde si quedan horarios, rojo si día lleno) */}
                  {days.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">Disponibilidad próximos 7 días</p>
                      <div className="grid grid-cols-7 gap-2">
                        {days.map(d => {
                          const full = (d.availableCount || 0) === 0;
                          const color = full ? 'bg-red-100 border border-red-300 text-red-700' : 'bg-green-100 border border-green-300 text-green-700';
                          return (
                            <div key={`${f._id}-${d.date}`} className={`text-center rounded py-1 text-xs font-medium ${color}`} title={`${d.date} — ${d.availableCount} horarios disponibles`}>
                              {formatDayShort(d.date)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Horarios de hoy (verde disponible, rojo reservado) */}
                  {today && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">Hoy {today.date} · Horarios</p>
                      <div className="grid grid-cols-7 gap-2">
                        {hoursOrder.map(h => {
                          const available = Boolean(slots[h]);
                          const color = available ? 'bg-green-100 border border-green-300 text-green-700 hover:bg-green-200' : 'bg-red-100 border border-red-300 text-red-700';
                          return (
                            <button
                              key={`${f._id}-${h}`}
                              type="button"
                              disabled={!available}
                              onClick={() => handleReserve(f._id, { prefillDate: today.date, prefillTime: h })}
                              className={`rounded py-1 text-xs font-medium ${color} disabled:opacity-60 disabled:cursor-not-allowed`}
                              title={available ? 'Disponible' : 'Reservado'}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
    </div>
  );
};

export default Fields;
