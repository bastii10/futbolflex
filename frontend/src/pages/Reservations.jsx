import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import SmartImage from '../components/SmartImage';
import Toast from '../components/Toast';

const Reservations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const prefillFieldId = location.state?.prefillFieldId || null;
  const prefillDate = location.state?.prefillDate || null;
  const prefillTime = location.state?.prefillTime || null;

  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const [form, setForm] = useState({
    fieldId: '',
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
  const [paymentStep, setPaymentStep] = useState(null); // null, 'card', 'transfer'
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    cardType: '' // Nuevo: tipo de tarjeta detectado
  });

  const hoursOrder = ['17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

  // Generar horarios disponibles (17:00 - 23:00)
  const generateAvailableHours = () => {
    const hours = [];
    for (let i = 17; i <= 23; i++) {
      hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return hours;
  };

  const availableHours = generateAvailableHours();

  // Validar si una hora ya pasó
  const isTimePassed = (selectedDate, selectedTime) => {
    if (!selectedDate || !selectedTime) return false;
    
    const [hours, minutes] = selectedTime.split(':');
    const [year, month, day] = selectedDate.split('-');
    const reservationDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes));
    
    return reservationDate < new Date();
  };

  const selectedField = fields.find((f) => f._id === form.fieldId);
  const days = selectedField?.availabilitySummary?.days || [];
  const selectedDay = form.date || (days[0]?.date ?? '');
  // ANTES:
  // const slots = (days.find(d => d.date === selectedDay)?.slots) || {};
  // AHORA: fallback “todos disponibles” si la fecha no está en el resumen de 7 días
  const slots = (() => {
    const found = days.find(d => d.date === selectedDay)?.slots;
    if (found) return found;
    const all = {};
    hoursOrder.forEach(h => { all[h] = true; });
    return all;
  })();

  useEffect(() => {
    const fetchFields = async () => {
      try {
        console.log('🔄 Cargando canchas desde API...');
        const res = await fetch('/api/fields');
        const data = await res.json();
        console.log('✓ Canchas recibidas del backend:', data);
        
        if (res.ok && data.length > 0) {
          setFields(data);
          console.log('✓ Total de canchas cargadas:', data.length);
          if (prefillFieldId) {
            console.log('Intentando preseleccionar cancha:', prefillFieldId);
            setForm(f => ({ ...f, fieldId: prefillFieldId }));
          }
        } else {
          console.warn('⚠️ No hay canchas disponibles');
          setFields([]);
          setToast({ type: 'error', message: 'No hay canchas disponibles.' });
        }
      } catch (err) {
        console.error('❌ Error cargando canchas:', err);
        setFields([]);
        setToast({ type: 'error', message: 'Error al cargar las canchas.' });
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [prefillFieldId]);

  useEffect(() => {
    if (!user) {
      // No redirigir inmediatamente; esperar a que el usuario intente hacer algo
      console.warn('Usuario no autenticado en /reservas');
    } else {
      console.log('✓ Usuario logueado:', user);
      setForm(f => ({ 
        ...f, 
        name: user.name || '', 
        email: user.email || '', 
        phone: user.phone || '' 
      }));
    }
  }, [user, navigate, prefillFieldId]);

  useEffect(() => {
    // aplicar prefills desde la navegación (Fields.jsx)
    if (prefillFieldId) {
      setForm(s => ({ ...s, fieldId: prefillFieldId }));
    }
  }, [prefillFieldId]);

  useEffect(() => {
    if (prefillDate) {
      setForm(s => ({ ...s, date: prefillDate }));
    }
    if (prefillTime) {
      setForm(s => ({ ...s, time: prefillTime }));
    }
  }, [prefillDate, prefillTime]);

  if (!user) {
    // Mostrar aviso en lugar de redirigir automáticamente
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-2xl font-bold text-blue-800 mb-2">Inicia sesión para reservar</h3>
          <p className="text-blue-700 mb-6">Debes tener una cuenta para realizar reservas.</p>
          <button
            onClick={() => navigate('/login', { state: { from: '/reservas', prefillFieldId } })}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== CREAR RESERVA ===');
    
    const field = fields.find((f) => f._id === form.fieldId);
    
    if (!field) {
      setToast({ type: 'error', message: 'Selecciona una cancha válida.' });
      return;
    }

    if (!form.date || !form.time) {
      setToast({ type: 'error', message: 'Completa fecha y hora.' });
      return;
    }

    if (!form.phone) {
      setToast({ type: 'error', message: 'Tu cuenta no tiene teléfono.' });
      return;
    }

    // Mostrar paso de pago según método seleccionado
    if (form.payment === 'tarjeta') {
      setPaymentStep('card');
    } else if (form.payment === 'transferencia') {
      setPaymentStep('transfer');
    }
  };

  // Función para detectar tipo de tarjeta
  const detectCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');
    
    // Visa: empieza con 4
    if (/^4/.test(cleaned)) {
      return 'visa';
    }
    // Mastercard: empieza con 51-55 o 2221-2720
    if (/^5[1-5]/.test(cleaned) || /^2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20))/.test(cleaned)) {
      return 'mastercard';
    }
    // American Express: empieza con 34 o 37
    if (/^3[47]/.test(cleaned)) {
      return 'amex';
    }
    
    return '';
  };

  const handleCardChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;
    
    if (name === 'cardNumber') {
      // Solo números
      value = value.replace(/\D/g, '');
      // Detectar tipo de tarjeta
      const cardType = detectCardType(value);
      // Formato con espacios cada 4 dígitos
      value = value.replace(/(\d{4})/g, '$1 ').trim();
      // Limitar a 19 caracteres (16 dígitos + 3 espacios)
      if (value.length > 19) value = value.slice(0, 19);
      
      setCardData({ ...cardData, cardNumber: value, cardType });
      return;
    }
    
    if (name === 'cardName') {
      // Solo letras y espacios
      value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase();
      setCardData({ ...cardData, [name]: value });
      return;
    }
    
    if (name === 'expiryDate') {
      // Solo números
      value = value.replace(/\D/g, '');
      // Formato MM/AA
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      if (value.length > 5) value = value.slice(0, 5);
      setCardData({ ...cardData, [name]: value });
      return;
    }
    
    if (name === 'cvv') {
      // Solo números, siempre máximo 3 dígitos
      value = value.replace(/\D/g, '');
      if (value.length > 3) value = value.slice(0, 3);
      setCardData({ ...cardData, [name]: value });
      return;
    }
    
    setCardData({ ...cardData, [name]: value });
  };

  // Validar fecha de vencimiento
  const isValidExpiryDate = (expiry) => {
    if (!expiry || expiry.length !== 5) return false;
    
    const [month, year] = expiry.split('/').map(Number);
    if (!month || !year || month < 1 || month > 12) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Últimos 2 dígitos
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  };

  const processPayment = async () => {
    setProcessing(true);
    
    const field = fields.find((f) => f._id === form.fieldId);
    const [year, month, day] = form.date.split('-');
    const localDate = new Date(year, month - 1, day);
    const dateString = localDate.toISOString().split('T')[0];
    
    const reservationData = {
      fieldId: field._id,
      date: dateString,
      startTime: form.time,
      endTime: form.time,
      userName: form.name,
      userEmail: form.email,
      userPhone: form.phone,
      paymentMethod: form.payment
    };

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reservationData)
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!res.ok) {
        throw new Error(data?.message || `Error ${res.status}`);
      }

      const [y, m, d] = form.date.split('-');
      const displayDate = new Date(y, m - 1, d);
      const formattedDate = displayDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const payload = {
        id: data._id,
        field: { id: field._id, name: field.name, price: field.price },
        date: form.date,
        displayDate: formattedDate,
        time: form.time,
        user: { name: form.name, email: form.email, phone: form.phone },
        payment: form.payment,
        qrCode: data.qrCode,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setReservationPayload(payload);
      setConfirmed(true);
      setPaymentStep(null);
      setToast({ type: 'success', message: '¡Reserva y pago confirmados!' });
    } catch (err) {
      console.error('❌ ERROR:', err);
      setToast({ 
        type: 'error', 
        message: err.message || 'Error al procesar el pago' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const redirectToPayment = (paymentMethod, reservationData) => {
    const amount = reservationData.field.price;
    const description = `Reserva ${reservationData.field.name} - ${reservationData.displayDate} a las ${reservationData.time}`;
    
    switch(paymentMethod) {
      case 'transferencia':
        // Mostrar información de transferencia
        alert(`INFORMACIÓN DE TRANSFERENCIA:\n\nBanco: Banco Estado\nCuenta Corriente: 123456789\nRUT: 12.345.678-9\nNombre: FutbolFlex\nMonto: $${amount.toLocaleString()}\n\nDescripción: ${description}\n\nCódigo de reserva: ${reservationData.id}`);
        break;
      
      case 'webpay':
        // Simular redirección a WebPay (en producción sería la URL real de WebPay)
        const webpayUrl = `https://webpay.cl/pago?amount=${amount}&description=${encodeURIComponent(description)}&order=${reservationData.id}`;
        console.log('Redirigiendo a WebPay:', webpayUrl);
        alert(`Redirigiendo a WebPay para pagar $${amount.toLocaleString()}...\n\nEn producción, serías redirigido a la pasarela de pago real.`);
        // window.location.href = webpayUrl; // Descomentar en producción
        break;
      
      case 'tarjeta':
        // Mostrar formulario de tarjeta o redirigir a procesador de pagos
        alert(`PAGO CON TARJETA:\n\nMonto: $${amount.toLocaleString()}\nDescripción: ${description}\n\nEn producción, se mostraría un formulario seguro para ingresar los datos de la tarjeta.`);
        break;
      
      default:
        console.log('Método de pago no reconocido:', paymentMethod);
    }
  };

  useEffect(() => {
    if (selectedField) {
      const fieldDays = selectedField.availabilitySummary.days;
      const today = new Date();
      const next7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return date.toISOString().split('T')[0];
      });
      
      // Marcar como no disponible los días que no están en el rango de los próximos 7 días
      const updatedDays = fieldDays.map(day => {
        const isInRange = next7Days.includes(day.date);
        return { ...day, availableCount: isInRange ? day.availableCount : 0 };
      });
      
      // Si la fecha seleccionada no está en los próximos 7 días, ajustar a la primera fecha disponible
      if (!next7Days.includes(selectedDay)) {
        const firstAvailableDay = updatedDays.find(day => day.availableCount > 0);
        if (firstAvailableDay) {
          setForm(s => ({ ...s, date: firstAvailableDay.date, time: '' }));
        }
      }
    }
  }, [selectedField, selectedDay]);

  if (loadingFields) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">⏳ Cargando canchas...</div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-yellow-800 mb-2">No hay canchas disponibles</h3>
          <p className="text-yellow-700">No se pueden realizar reservas. Contacta al administrador.</p>
          <Link to="/" className="mt-6 inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Realizar Reserva</h2>

      {/* Paso 1: Formulario de reserva */}
      {!confirmed && !paymentStep && (
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
                  <option key={f._id} value={f._id}>
                    {f.name} — {f.surfaceType} — ${f.price.toLocaleString()}/h
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Galería rápida</label>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {fields.map((f) => (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, fieldId: f._id }))}
                    className={`w-24 h-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${form.fieldId === f._id ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <SmartImage 
                      name={f.image || 'cancha1'} 
                      alt={f.name} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Disponibilidad próximos 7 días con color */}
            {selectedField && days.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad próximos 7 días</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {days.map(d => {
                    const full = (d.availableCount || 0) === 0;
                    const isSelected = form.date ? form.date === d.date : selectedDay === d.date;
                    const cls = full
                      ? 'bg-red-100 border border-red-300 text-red-700'
                      : 'bg-green-100 border border-green-300 text-green-700';
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setForm(s => ({ ...s, date: d.date, time: '' }))}
                        className={`rounded py-2 text-xs font-medium ${cls} ${isSelected ? 'ring-2 ring-offset-1 ring-green-500' : ''}`}
                        title={`${d.date} — ${d.availableCount} horarios disponibles`}
                      >
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'2-digit' })}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                <input 
                  name="date" 
                  type="date" 
                  value={form.date || selectedDay} 
                  onChange={handleChange} 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 rounded border border-gray-300" 
                  required 
                />
              </div>

              {/* Horarios con color por disponibilidad y pasado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horarios (17:00 - 23:00)</label>

                {/* Grid de horarios coloreados */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {hoursOrder.map(h => {
                    const available = Boolean(slots[h]); // ahora true si fecha fuera de 7 días
                    const passed = isTimePassed(form.date || selectedDay, h);
                    const isActive = form.time === h;
                    const disabled = !available || passed;
                    const color = disabled
                      ? 'bg-red-100 border border-red-300 text-red-700'
                      : 'bg-green-100 border border-green-300 text-green-700 hover:bg-green-200';
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={disabled}
                        onClick={() => setForm(s => ({ ...s, time: h }))}
                        className={`rounded py-2 text-xs font-medium ${color} ${isActive ? 'ring-2 ring-offset-1 ring-green-500' : ''} disabled:opacity-60 disabled:cursor-not-allowed`}
                        title={disabled ? (passed ? 'Ya pasó' : 'Reservado') : 'Disponible'}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>

                {/* Selector nativo como respaldo (mantener seleccion sincronizada) */}
                <select
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full p-3 rounded border border-gray-300"
                  required
                >
                  <option value="">-- Elige hora --</option>
                  {hoursOrder.map(h => {
                    const available = Boolean(slots[h]);
                    const passed = isTimePassed(form.date || selectedDay, h);
                    return (
                      <option key={h} value={h} disabled={!available || passed}>
                        {h} {passed ? '(Ya pasó)' : (!available ? '(Reservado)' : '')}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">Verde: disponible — Rojo: reservado o ya pasó</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
              <input name="name" value={form.name} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input name="email" value={form.email} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input name="phone" type="tel" value={form.phone} className="w-full p-3 rounded border border-gray-300 bg-gray-50" readOnly />
              <p className="text-xs text-gray-500 mt-1">✓ Autocompletado desde tu cuenta</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, payment: 'transferencia' })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.payment === 'transferencia' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-3xl mb-2">🏦</div>
                  <div className="font-semibold">Transferencia</div>
                  <div className="text-xs text-gray-600">Bancaria</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setForm({ ...form, payment: 'tarjeta' })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.payment === 'tarjeta' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="text-3xl mb-2">💳</div>
                  <div className="font-semibold">Tarjeta</div>
                  <div className="text-xs text-gray-600">Crédito/Débito</div>
                </button>
              </div>
            </div>

            <div className="mt-6">
              <button 
                type="submit" 
                disabled={processing || !form.payment} 
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Continuar al pago →
              </button>
            </div>
          </form>

          <aside className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Vista previa</h3>
            {selectedField ? (
              <div>
                <SmartImage 
                  name={selectedField.image || 'cancha1'} 
                  alt={selectedField.name} 
                  className="w-full h-40 object-cover rounded mb-3" 
                />
                <h4 className="font-bold">{selectedField.name}</h4>
                <p className="text-sm text-gray-600">{selectedField.surfaceType}</p>
                <p className="text-green-600 font-bold mt-2">${selectedField.price.toLocaleString()}/hora</p>
              </div>
            ) : (
              <div className="text-gray-500">Selecciona una cancha</div>
            )}
          </aside>
        </div>
      )}

      {/* Paso 2: Pago con Tarjeta */}
      {!confirmed && paymentStep === 'card' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-6">💳 Pago con Tarjeta</h3>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total a pagar:</strong> ${fields.find(f => f._id === form.fieldId)?.price.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              {/* Número de tarjeta con detección de tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de tarjeta
                  {cardData.cardType && (
                    <span className="ml-2 text-xs font-semibold">
                      {cardData.cardType === 'visa' && '(Visa)'}
                      {cardData.cardType === 'mastercard' && '(Mastercard)'}
                      {cardData.cardType === 'amex' && '(American Express)'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardNumber"
                    value={cardData.cardNumber}
                    onChange={handleCardChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    className={`w-full p-3 pr-16 border-2 rounded-lg focus:outline-none ${
                      cardData.cardNumber && !cardData.cardType 
                        ? 'border-yellow-400 focus:border-yellow-500' 
                        : 'border-gray-300 focus:border-green-500'
                    }`}
                    required
                  />
                  {/* Logos de tarjetas */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    {cardData.cardType === 'visa' && (
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-6" />
                    )}
                    {cardData.cardType === 'mastercard' && (
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                    )}
                    {cardData.cardType === 'amex' && (
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="American Express" className="h-6" />
                    )}
                    {!cardData.cardType && cardData.cardNumber.length > 0 && (
                      <span className="text-xs text-gray-400">❓</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Solo números. Aceptamos Visa, Mastercard y American Express</p>
              </div>

              {/* Nombre del titular */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del titular</label>
                <input
                  type="text"
                  name="cardName"
                  value={cardData.cardName}
                  onChange={handleCardChange}
                  placeholder="NOMBRE APELLIDO"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none uppercase"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras. Tal como aparece en la tarjeta</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fecha de expiración */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de expiración</label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={cardData.expiryDate}
                    onChange={handleCardChange}
                    placeholder="MM/AA"
                    maxLength="5"
                    className={`w-full p-3 border-2 rounded-lg focus:outline-none ${
                      cardData.expiryDate && !isValidExpiryDate(cardData.expiryDate)
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 focus:border-green-500'
                    }`}
                    required
                  />
                  {cardData.expiryDate && !isValidExpiryDate(cardData.expiryDate) && (
                    <p className="text-xs text-red-500 mt-1">Fecha inválida o vencida</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Formato: MM/AA</p>
                </div>

                {/* CVV - Siempre 3 dígitos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV / CVC
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={cardData.cvv}
                    onChange={handleCardChange}
                    placeholder="123"
                    maxLength="3"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    3 dígitos al reverso de la tarjeta
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPaymentStep(null)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={processing}
                >
                  ← Volver
                </button>
                <button
                  onClick={processPayment}
                  disabled={
                    processing || 
                    !cardData.cardNumber || 
                    !cardData.cardName || 
                    !cardData.expiryDate || 
                    !cardData.cvv ||
                    !cardData.cardType ||
                    !isValidExpiryDate(cardData.expiryDate) ||
                    cardData.cardNumber.replace(/\s/g, '').length < 13 ||
                    cardData.cvv.length !== 3
                  }
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing ? '⏳ Procesando...' : '✓ Pagar y Confirmar'}
                </button>
              </div>
            </div>

            {/* Indicadores de seguridad */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>🔒</span>
                <span>Pago seguro. Tus datos están protegidos con encriptación SSL</span>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-300">
                <span className="text-xs text-gray-500">Aceptamos:</span>
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-5" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="American Express" className="h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Pago con Transferencia */}
      {!confirmed && paymentStep === 'transfer' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-6">🏦 Pago por Transferencia</h3>
            
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-lg font-bold text-green-800 mb-2">
                Monto a transferir: ${fields.find(f => f._id === form.fieldId)?.price.toLocaleString()}
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">Banco:</span>
                <span className="font-bold">Banco Estado</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">Tipo de cuenta:</span>
                <span className="font-bold">Cuenta Corriente</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">Número de cuenta:</span>
                <span className="font-mono font-bold text-lg">123-456-789</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">RUT:</span>
                <span className="font-mono font-bold">12.345.678-9</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="font-bold">FutbolFlex SpA</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-semibold text-gray-700">Email:</span>
                <span className="font-bold">pagos@futbolflex.cl</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Importante:</strong> Una vez realizada la transferencia, haz clic en "Confirmar Pago" para completar tu reserva.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaymentStep(null)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                ← Volver
              </button>
              <button
                onClick={processPayment}
                disabled={processing}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {processing ? '⏳ Confirmando...' : 'Ya transferí, Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Confirmación con QR */}
      {confirmed && reservationPayload && (
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-green-50 to-green-100 p-8 rounded-xl shadow-lg">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">✓</div>
            <h3 className="text-3xl font-bold text-green-600">¡Reserva Confirmada!</h3>
            <p className="text-gray-600 mt-2">Tu pago ha sido procesado exitosamente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-lg mb-4 text-gray-800">Detalles de la Reserva</h4>
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Código:</span>
                  <span className="font-mono font-bold">{reservationPayload.id}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Cancha:</span>
                  <span className="font-bold">{reservationPayload.field.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-bold">{reservationPayload.displayDate}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-bold">{reservationPayload.time}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Nombre:</span>
                  <span className="font-bold">{reservationPayload.user.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Teléfono:</span>
                  <span className="font-bold">{reservationPayload.user.phone}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Método de pago:</span>
                  <span className="font-bold capitalize">{reservationPayload.payment === 'transferencia' ? 'Transferencia' : 'Tarjeta'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto pagado:</span>
                  <span className="font-bold text-green-600 text-lg">${reservationPayload.field.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow text-center">
              <h4 className="font-bold text-lg mb-4 text-gray-800">Código QR</h4>
              <div className="flex justify-center mb-4">
                <QRCode value={JSON.stringify(reservationPayload)} size={200} />
              </div>
              <p className="text-sm text-gray-600">Presenta este código QR en la entrada</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setConfirmed(false);
                setPaymentStep(null);
                setForm({ ...emptyForm, name: user.name, email: user.email, phone: user.phone, payment: 'transferencia' });
                setCardData({ cardNumber: '', cardName: '', expiryDate: '', cvv: '' });
              }}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700"
            >
              Hacer otra reserva
            </button>
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
