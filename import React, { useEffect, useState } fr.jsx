import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import SmartImage from '../components/SmartImage';
import Toast from '../components/Toast';

const Reservations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const prefillFieldId = location.state?.prefillFieldId || null;

  const fields = [
    { id: 'f1', name: 'Cancha Central', surface: 'Sintético', price: 30000, imgName: 'cancha1' },
    { id: 'f2', name: 'Cancha Norte', surface: 'Césped', price: 30000, imgName: 'cancha2' },
    { id: 'f3', name: 'Cancha Sur', surface: 'Sintético', price: 30000, imgName: 'cancha3' },
    { id: 'f4', name: 'Cancha 4', surface: 'Sintético', price: 30000, imgName: 'cancha4' },
    { id: 'f5', name: 'Cancha 5', surface: 'Césped', price: 30000, imgName: 'cancha5' },
    { id: 'f6', name: 'Cancha 6', surface: 'Sintético', price: 30000, imgName: 'cancha6' },
  ];

  const [form, setForm] = useState({
    fieldId: prefillFieldId || '',
    date: '',
    time: '',
    name: '',
    email: '',
    phone: '',
    payment: 'transferencia',
  });

  const [confirmed, setConfirmed] = useState(false);
  const [reservationPayload, setReservationPayload] = useState(null);
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/reservas', prefillFieldId } });
    } else {
      // AUTOCOMPLETAR TODOS LOS DATOS INCLUYENDO TELÉFONO
      setForm(f => ({ 
        ...f, 
        name: user.name || '', 
        email: user.email || '', 
        phone: user.phone || '' 
      }));
    }
  }, [user, navigate, prefillFieldId]);

  useEffect(() => {
    if (prefillFieldId) setForm((s) => ({ ...s, fieldId: prefillFieldId }));
  }, [prefillFieldId]);

  if (!user) {
    return null;
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const field = fields.find((f) => f.id === form.fieldId);
    if (!field) {
      setToast({ type: 'error', message: 'Selecciona una cancha válida.' });
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fieldId: field.id,
          date: form.date,
          startTime: form.time,
          endTime: form.time,
          userName: form.name,
          userEmail: form.email,
          userPhone: form.phone
        })
      });

      const text = await res.text();
      let data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error((data && data.message) || 'Error al crear reserva');

      const payload = {
        id: data._id || `res-${Date.now()}`,
        field: { id: field.id, name: field.name, price: field.price },
        date: form.date,
        time: form.time,
        user: { name: form.name, email: form.email, phone: form.phone },
        payment: form.payment,
        qrCode: data.qrCode || `QR-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      setReservationPayload(payload);
      setConfirmed(true);
      setToast({ type: 'success', message: '¡Reserva confirmada exitosamente!' });
    } catch (err) {
      console.error('Reservation error:', err);
      setToast({ type: 'error', message: err.message || 'Error al crear la reserva' });
    } finally {
      setProcessing(false);
    }
  };

  const selectedField = fields.find((f) => f.id === form.fieldId);

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Realizar Reserva</h2>

      {!confirmed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-6 rounded-xl shadow">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona Cancha</label>
              <select
                name="fieldId"
                value={form.fieldId}
                onChange={handleChange}
                className="w-full p-3 rounded border border-gray-300"
                required
              >
                <option value="">-- Elige una cancha --</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.surface} — ${f.price.toLocaleString()}/h
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Galería rápida</label>
              <div className="flex gap-3 overflow-x-auto">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, fieldId: f.id }))}
                    className={`w-24 h-16 flex-shrink-0 overflow-hidden rounded-lg border ${form.fieldId === f.id ? 'ring-2 ring-green-400' : 'border-gray-200'}`}
                  >
                    <SmartImage name={f.imgName} alt={f.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} className="w-full p-3 rounded border border-gray-300" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                <select name="time" value={form.time} onChange={handleChange} className="w-full p-3 rounded border border-gray-300" required>
                  <option value="">-- Elige hora --</option>
                  <option>09:00</option>
                  <option>10:00</option>
                  <option>11:00</option>
                  <option>17:00</option>
                  <option>18:00</option>
                  <option>19:00</option>
                  <option>20:00</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input name="name" value={form.name} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
              <p className="text-xs text-gray-500 mt-1">Datos obtenidos automáticamente de tu cuenta</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input name="email" value={form.email} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input name="phone" type="tel" value={form.phone} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
              <p className="text-xs text-gray-500 mt-1">Este dato se obtiene automáticamente de tu cuenta</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
              <select name="payment" value={form.payment} onChange={handleChange} className="w-full p-3 rounded border border-gray-300">
                <option value="transferencia">Transferencia bancaria</option>
                <option value="tarjeta">Tarjeta de crédito/débito</option>
                <option value="webpay">WebPay</option>
              </select>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button type="submit" disabled={processing} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                {processing ? 'Procesando...' : 'Confirmar y Generar QR'}
              </button>
            </div>
          </form>

          <aside className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Vista previa cancha</h3>
            {selectedField ? (
              <div>
                <SmartImage name={selectedField.imgName} alt={selectedField.name} className="w-full h-40 object-cover rounded mb-3" />
                <h4 className="font-bold">{selectedField.name}</h4>
                <p className="text-sm text-gray-600">{selectedField.surface}</p>
                <p className="text-green-600 font-bold mt-2">${selectedField.price.toLocaleString()}/hora</p>
              </div>
            ) : (
              <div className="text-gray-500">Selecciona una cancha para ver la vista previa.</div>
            )}
          </aside>
        </div>
      )}

      {confirmed && reservationPayload && (
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-start gap-6">
            <div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Reserva Confirmada</h3>
              <p className="text-gray-700 mb-2">Código: <span className="font-mono">{reservationPayload.id}</span></p>
              <p className="text-gray-700">Cancha: <strong>{reservationPayload.field.name}</strong></p>
              <p className="text-gray-700">Fecha: <strong>{reservationPayload.date}</strong> — Hora: <strong>{reservationPayload.time}</strong></p>
              <p className="text-gray-700">Teléfono: <strong>{reservationPayload.user.phone}</strong></p>
              <p className="text-gray-700">Pago: <strong>{reservationPayload.payment}</strong></p>
            </div>

            <div className="ml-auto p-4 bg-green-50 rounded">
              <QRCode value={JSON.stringify(reservationPayload)} size={140} />
            </div>
          </div>
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

export default Reservations;