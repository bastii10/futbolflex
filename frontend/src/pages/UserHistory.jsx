import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import QRCode from 'qrcode.react';
import { fetchWithAuth } from '../utils/apiClient';

const UserHistory = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [qrOpen, setQrOpen] = useState({}); // NUEVO: estado para ver/ocultar QR por reserva
  const toggleQr = (id) => setQrOpen(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleOnKey = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleQr(id);
    }
  };

  // Estado para filtros admin
  const [selectedFieldFilter, setSelectedFieldFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [fields, setFields] = useState([]);

  // Cargar reservas propias
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/reservations/user');
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error((data && data.message) || 'Error al obtener reservas');
      setReservations(data);
    } catch (err) {
      console.error('Error cargando reservas:', err);
      if (err.message !== 'Sesión expirada') {
        setToast({ message: err.message, type: 'error' });
      }
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar todas las reservas (solo admin)
  const fetchAllReservations = async () => {
    try {
      const res = await fetchWithAuth('/api/reservations/all');
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (!res.ok) throw new Error((data && data.message) || 'Error al obtener reservas de todos los usuarios');
      setAllReservations(data);
    } catch (err) {
      console.error('Error cargando todas las reservas:', err);
      if (err.message !== 'Sesión expirada') {
        setToast({ message: err.message, type: 'error' });
      }
      setAllReservations([]);
    }
  };

  // Cargar canchas para el filtro (solo admin)
  useEffect(() => {
    const fetchFields = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        const res = await fetch('/api/fields');
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        if (res.ok) setFields(data);
      } catch (err) {
        console.error('Error cargando canchas para filtro:', err);
      }
    };
    
    if (user?.role === 'admin') fetchFields();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchReservations();
    if (user.role === 'admin') fetchAllReservations();
  }, [user]);

  const handleCancel = async (reservationId) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;
    
    setCancelling(reservationId);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      
      if (!res.ok) throw new Error((data && data.message) || 'Error al cancelar reserva');
      
      setToast({ message: 'Reserva cancelada exitosamente', type: 'success' });
      await fetchReservations(); // Recargar la lista
    } catch (err) {
      setToast({ message: err.message || 'Error al cancelar la reserva', type: 'error' });
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      // Si es string tipo 'YYYY-MM-DD', crear con new Date(year, month-1, day)
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const parts = dateString.split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Fecha no disponible';
    }
  };

  const isPastReservation = (dateString, time) => {
    if (!dateString || !time) return false;
    
    try {
      const date = new Date(dateString);
      const [hours, minutes] = time.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date < new Date();
    } catch (err) {
      return false;
    }
  };

  const getHoursUntilReservation = (dateString, time) => {
    if (!dateString || !time) return 0;
    
    try {
      const date = new Date(dateString);
      const [hours, minutes] = time.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const now = new Date();
      const diffMs = date - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours;
    } catch (err) {
      return 0;
    }
  };

  const canCancelReservation = (reservation) => {
    if (!reservation || reservation.status !== 'confirmado') return false;
    const hoursUntil = getHoursUntilReservation(reservation.date, reservation.startTime);
    return hoursUntil > 24;
  };

  const getTimeUntilReservation = (date, time) => {
    if (!date || !time) return 'N/A';
    
    const hoursUntil = getHoursUntilReservation(date, time);
    
    if (hoursUntil < 0) return 'Reserva pasada';
    if (hoursUntil < 1) return `${Math.round(hoursUntil * 60)} minutos`;
    if (hoursUntil < 24) return `${Math.round(hoursUntil)} horas`;
    
    const days = Math.floor(hoursUntil / 24);
    const remainingHours = Math.round(hoursUntil % 24);
    
    if (days === 1) return `${days} día y ${remainingHours} horas`;
    return `${days} días y ${remainingHours} horas`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'confirmado': return 'Confirmado';
      case 'cancelado': return 'Cancelado';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  };

  // Agrupar reservas por fecha para el calendario
  const groupByDate = (reservationsList) => {
    const grouped = {};
    reservationsList.forEach(res => {
      let dateKey = 'Sin fecha';
      if (res.date) {
        if (typeof res.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(res.date)) {
          dateKey = res.date.slice(0, 10);
        } else {
          const d = new Date(res.date);
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(res);
    });
    return grouped;
  };

  const sortedDates = (grouped) => Object.keys(grouped).sort();

  // Ordenar reservas: pendientes primero (ascendente), luego pasadas (descendente)
  const sortedReservations = [...reservations].sort((a, b) => {
    const aIsPast = isPastReservation(a.date, a.startTime);
    const bIsPast = isPastReservation(b.date, b.startTime);
    
    // Si una es pasada y la otra no, la no pasada va primero
    if (aIsPast && !bIsPast) return 1;
    if (!aIsPast && bIsPast) return -1;
    
    // Si ambas son futuras, ordenar por fecha/hora ascendente (más cercanas primero)
    if (!aIsPast && !bIsPast) {
      const dateA = new Date(a.date);
      const [hoursA, minA] = a.startTime.split(':');
      dateA.setHours(parseInt(hoursA), parseInt(minA), 0, 0);
      
      const dateB = new Date(b.date);
      const [hoursB, minB] = b.startTime.split(':');
      dateB.setHours(parseInt(hoursB), parseInt(minB), 0, 0);
      
      return dateA - dateB;
    }
    
    // Si ambas son pasadas, ordenar por fecha/hora descendente (más recientes primero)
    const dateA = new Date(a.date);
    const [hoursA, minA] = a.startTime.split(':');
    dateA.setHours(parseInt(hoursA), parseInt(minA), 0, 0);
    
    const dateB = new Date(b.date);
    const [hoursB, minB] = b.startTime.split(':');
    dateB.setHours(parseInt(hoursB), parseInt(minB), 0, 0);
    
    return dateB - dateA;
  });

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* --- ADMIN VIEW --- */}
      {user && user.role === 'admin' && (
        <div className="mb-12">
          {/* Header con filtros mejorados */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">🗓️ Calendario de Reservas</h3>
                <p className="text-green-100 text-sm">Filtra y navega por todas las reservas del sistema</p>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Filtro por cancha */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-green-100 mb-1">🏟️ Cancha</label>
                  <select
                    value={selectedFieldFilter}
                    onChange={(e) => setSelectedFieldFilter(e.target.value)}
                    className="px-4 py-2.5 border-2 border-green-500 rounded-lg focus:border-white focus:outline-none bg-white text-gray-700 font-medium min-w-[180px]"
                  >
                    <option value="all">📊 Todas las canchas</option>
                    {fields.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por fecha específica */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-green-100 mb-1">📅 Ir a fecha</label>
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="px-4 py-2.5 border-2 border-green-500 rounded-lg focus:border-white focus:outline-none bg-white text-gray-700 font-medium"
                  />
                </div>

                {/* Botón limpiar filtros */}
                {(selectedFieldFilter !== 'all' || selectedDateFilter) && (
                  <button
                    onClick={() => {
                      setSelectedFieldFilter('all');
                      setSelectedDateFilter('');
                    }}
                    className="self-end px-4 py-2.5 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium"
                  >
                    🔄 Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Cargando reservas...</p>
            </div>
          ) : allReservations.length === 0 ? (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-yellow-800 mb-2">No hay reservas registradas</h3>
              <p className="text-yellow-600">Cuando se realicen reservas, aparecerán aquí</p>
            </div>
          ) : (
            <div>
              {(() => {
                // Filtrar por cancha
                let filteredReservations = selectedFieldFilter === 'all'
                  ? allReservations
                  : allReservations.filter(res => res.fieldId?._id === selectedFieldFilter);

                // Filtrar por fecha específica si se seleccionó
                if (selectedDateFilter) {
                  filteredReservations = filteredReservations.filter(res => {
                    const resDate = typeof res.date === 'string' 
                      ? res.date.slice(0, 10) 
                      : new Date(res.date).toISOString().slice(0, 10);
                    return resDate === selectedDateFilter;
                  });
                }

                if (filteredReservations.length === 0) {
                  return (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-8 text-center">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-bold text-blue-800 mb-2">No hay reservas con estos filtros</h3>
                      <p className="text-blue-600">Prueba con otros criterios de búsqueda</p>
                    </div>
                  );
                }

                const grouped = groupByDate(filteredReservations);
                const dates = sortedDates(grouped);

                // Estadísticas rápidas
                const totalReservations = filteredReservations.length;
                const confirmedCount = filteredReservations.filter(r => r.status === 'confirmado').length;
                const canceledCount = filteredReservations.filter(r => r.status === 'cancelado').length;
                
                return (
                  <>
                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Total Reservas</p>
                            <p className="text-3xl font-bold text-gray-800">{totalReservations}</p>
                          </div>
                          <div className="text-4xl">📊</div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Confirmadas</p>
                            <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
                          </div>
                          <div className="text-4xl">✅</div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Canceladas</p>
                            <p className="text-3xl font-bold text-red-600">{canceledCount}</p>
                          </div>
                          <div className="text-4xl">❌</div>
                        </div>
                      </div>
                    </div>

                    {/* Lista de días */}
                    <div className="space-y-6">
                      {dates.map((date, index) => {
                        const [year, month, day] = date.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day);
                        const formattedDate = dateObj.toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });

                        const dayReservations = grouped[date];
                        const dayConfirmed = dayReservations.filter(r => r.status === 'confirmado').length;
                        const dayCanceled = dayReservations.filter(r => r.status === 'cancelado').length;

                        return (
                          <div 
                            key={date} 
                            id={`date-${date}`}
                            className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-all"
                          >
                            {/* Header del día */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                                    {day}
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-800 capitalize">
                                      {formattedDate}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {dayReservations.length} reserva{dayReservations.length !== 1 ? 's' : ''} • 
                                      <span className="text-green-600 font-medium"> {dayConfirmed} confirmada{dayConfirmed !== 1 ? 's' : ''}</span> • 
                                      <span className="text-red-600 font-medium"> {dayCanceled} cancelada{dayCanceled !== 1 ? 's' : ''}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-2xl">
                                  {index === 0 ? '📍' : '📅'}
                                </div>
                              </div>
                            </div>

                            {/* Grid de reservas del día */}
                            <div className="p-6">
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dayReservations
                                  .sort((a, b) => {
                                    const [ha, ma] = a.startTime.split(':');
                                    const [hb, mb] = b.startTime.split(':');
                                    return (parseInt(ha) * 60 + parseInt(ma)) - (parseInt(hb) * 60 + parseInt(mb));
                                  })
                                  .map(res => {
                                    const isPast = isPastReservation(res.date, res.startTime);
                                    let colorClasses = 'bg-yellow-50 border-yellow-400 shadow-yellow-200';
                                    let statusText = 'Pendiente';
                                    
                                    if (res.status === 'cancelado') {
                                      colorClasses = 'bg-red-50 border-red-400 shadow-red-200';
                                      statusText = 'Cancelada';
                                    } else if (isPast && res.status === 'confirmado') {
                                      colorClasses = 'bg-green-50 border-green-400 shadow-green-200';
                                      statusText = 'Completada';
                                    } else if (res.status === 'confirmado') {
                                      colorClasses = 'bg-blue-50 border-blue-400 shadow-blue-200';
                                      statusText = 'Confirmada';
                                    }

                                    return (
                                      <div
                                        key={res._id}
                                        className={`group relative overflow-hidden rounded-2xl shadow-lg border ${
                                          res.status === 'cancelado'
                                            ? 'border-red-300'
                                            : res.status === 'confirmado'
                                            ? 'border-green-300'
                                            : 'border-yellow-300'
                                        } bg-gradient-to-br from-white via-white to-green-50 hover:shadow-2xl transition-all`}
                                      >
                                        {/* Header */}
                                        <div className="flex items-start justify-between px-5 pt-5 pb-4 rounded-t-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                                          <div className="flex flex-col">
                                            <span className="text-xs tracking-wider font-semibold opacity-80">RESERVA</span>
                                            <span className="text-xl font-bold flex items-center gap-2">
                                              ⚽ {res.fieldId?.name || 'Sin cancha'}
                                            </span>
                                            <span className="text-sm flex items-center gap-1 mt-1">
                                              ⏰ {res.startTime} • 📅 {typeof res.date === 'string' ? res.date.slice(0,10) : new Date(res.date).toISOString().slice(0,10)}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <span
                                              className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                                                res.status === 'cancelado'
                                                  ? 'bg-red-100 text-red-700'
                                                  : res.status === 'confirmado'
                                                  ? (isPast ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')
                                                  : 'bg-yellow-100 text-yellow-700'
                                              }`}
                                            >
                                              {statusText}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Body */}
                                        <div className="px-5 pt-4 pb-6 space-y-3">
                                          <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                              👤 <span className="font-semibold text-gray-800">{res.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              📱 <span className="text-gray-700">{res.userPhone}</span>
                                            </div>
                                            <div className="flex items-center gap-2 col-span-2">
                                              📧 <span className="text-gray-700 truncate">{res.userEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              💳 <span className="capitalize text-gray-700">{res.paymentMethod}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              🆔 <span className="font-mono text-[11px] text-gray-600 truncate">{res._id}</span>
                                            </div>
                                          </div>

                                          {/* QR Section - clickable (sin botón) */}
                                          <div className="mt-4 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-green-100 p-4 shadow-inner">
                                            {res.status === 'cancelado' ? (
                                              <div className="flex items-center justify-between">
                                                <h6 className="text-sm font-bold text-red-600 flex items-center gap-2">🚫 Reserva cancelada - sin QR</h6>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex items-center justify-between">
                                                  <h6 className="text-sm font-bold text-green-700 flex items-center gap-2">🎫 Código QR</h6>
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleQr(res._id)}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all
                                                      ${qrOpen[res._id]
                                                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow'
                                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow hover:brightness-110'}`}
                                                  >
                                                    {qrOpen[res._id] ? 'Ocultar' : 'Ver'}
                                                  </button>
                                                </div>

                                                {qrOpen[res._id] && (
                                                  <div className="mt-3 text-center">
                                                    {res.qrCode ? (
                                                      <>
                                                        <div className="inline-block p-2 bg-white rounded-lg border border-green-300 shadow-sm">
                                                          <QRCode
                                                            value={JSON.stringify({
                                                              id: res._id,
                                                              code: res.qrCode,
                                                              field: res.fieldId?.name,
                                                              date: typeof res.date === 'string' ? res.date.slice(0,10) : res.date,
                                                              time: res.startTime,
                                                              user: res.userName
                                                            })}
                                                            size={120}
                                                            level="M"
                                                          />
                                                        </div>
                                                        <p className="mt-2 text-[11px] font-mono text-gray-600 break-all">{res.qrCode}</p>
                                                      </>
                                                    ) : (
                                                      <p className="text-xs text-gray-500 italic">QR eliminado</p>
                                                    )}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* --- USER VIEW --- */}
      {user && user.role !== 'admin' && (
        <div className="grid gap-4">
          {sortedReservations.map(res => {
            const isPast = isPastReservation(res.date, res.startTime);
            const canCancel = canCancelReservation(res);
            const timeUntil = getTimeUntilReservation(res.date, res.startTime);
            const hoursUntil = getHoursUntilReservation(res.date, res.startTime);

            return (
              <div
                key={res._id}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-green-50 to-emerald-50 p-5 shadow-lg hover:shadow-2xl transition-all border border-green-200"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h3 className="text-2xl font-extrabold flex items-center gap-2 text-gray-800">
                    ⚽ {res.fieldId?.name || 'Cancha'}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                      res.status === 'cancelado'
                        ? 'bg-red-100 text-red-700'
                        : res.status === 'confirmado'
                        ? (isPast ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {getStatusText(res.status)}
                  </span>
                  {!isPast && res.status === 'confirmado' && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        hoursUntil <= 24 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      ⏳ {timeUntil}
                    </span>
                  )}
                  {isPast && res.status === 'confirmado' && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      ✓ Completada
                    </span>
                  )}
                </div>

                {/* Datos */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                  <div className="flex items-center gap-2">📅 <span className="font-semibold">{formatDate(res.date)}</span></div>
                  <div className="flex items-center gap-2">⏰ <span className="font-semibold">{res.startTime}</span></div>
                  <div className="flex items-center gap-2">👤 <span className="font-semibold">{res.userName}</span></div>
                  <div className="flex items-center gap-2">📱 <span className="font-semibold">{res.userPhone}</span></div>
                  <div className="flex items-center gap-2 col-span-2">💳
                    <span className="font-semibold">
                      {res.paymentMethod === 'tarjeta'
                        ? 'Tarjeta crédito/débito'
                        : res.paymentMethod === 'transferencia'
                        ? 'Transferencia bancaria'
                        : 'Método desconocido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 col-span-2 text-[11px] font-mono text-gray-500">
                    🆔 {res._id}
                  </div>
                </div>

                {/* QR */}
                <div className="rounded-xl border border-green-300 bg-gradient-to-br from-green-50 via-white to-green-100 p-5 shadow-inner mb-5">
                  {res.status === 'cancelado' ? (
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-red-600 flex items-center gap-2">🚫 Reserva cancelada - sin QR</h4>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-green-700 flex items-center gap-2">🎫 Código QR de la Reserva</h4>
                        <button
                          type="button"
                          onClick={() => toggleQr(res._id)}
                          className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                            ${qrOpen[res._id]
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow'
                              : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow hover:brightness-110'}`}
                        >
                          {qrOpen[res._id] ? 'Ocultar QR' : 'Ver QR'}
                        </button>
                      </div>

                      {qrOpen[res._id] && (
                        <div className="mt-3 text-center">
                          {res.qrCode ? (
                            <>
                              <div className="inline-block p-3 bg-white rounded-lg border border-green-300 shadow-sm">
                                <QRCode
                                  value={JSON.stringify({
                                    id: res._id,
                                    qrCode: res.qrCode,
                                    field: res.fieldId?.name,
                                    date: typeof res.date === 'string' ? res.date.slice(0,10) : res.date,
                                    time: res.startTime,
                                    user: res.userName
                                  })}
                                  size={160}
                                  level="M"
                                />
                              </div>
                              <p className="mt-2 text-[11px] font-mono text-gray-700 break-all">{res.qrCode}</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-500 italic">QR eliminado</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Avisos */}
                {!canCancel && res.status === 'confirmado' && !isPast && hoursUntil <= 24 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    ⚠️ No se puede cancelar (menos de 24h restantes)
                  </div>
                )}
                {!isPast && res.status === 'confirmado' && canCancel && hoursUntil > 24 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
                    ℹ️ Puedes cancelar hasta 24h antes del horario reservado.
                  </div>
                )}

                {/* Botón cancelar */}
                <div className="mt-5 flex justify-end">
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(res._id)}
                      disabled={cancelling === res._id}
                      className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:bg-gray-400"
                    >
                      {cancelling === res._id ? '⏳ Cancelando...' : '🗑️ Cancelar reserva'}
                    </button>
                  )}
                  {res.status === 'cancelado' && (
                    <span className="px-4 py-2 rounded-full bg-red-100 text-red-700 text-xs font-bold">✖ Cancelada</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
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

export default UserHistory;

// --- Añadir pequeña animación CSS (opcional si tailwind no incluye) ---
// Puedes agregar en index.css:
// .animate-fade-in { animation: fade-in .25s ease-in-out; }
// @keyframes fade-in { from { opacity:0; transform: translateY(8px) } to { opacity:1, transform: translateY(0) } }
