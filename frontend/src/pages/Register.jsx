import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Register = () => {
  const { login } = useAuth();
  const API = '/api'; // uso de proxy en vite.config.js
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const hasError = (field) => submitted && !formData[field].trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setToast({ type: 'error', message: 'Completa todos los campos obligatorios' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (err) { /* ignore */ }

      if (!res.ok) {
        const serverMsg = data && data.message ? data.message : text || `Error ${res.status}`;
        throw new Error(serverMsg);
      }

      if (data && data.token) localStorage.setItem('token', data.token);
      if (data && data.user) login(data.user);
      
      setToast({ type: 'success', message: '¡Registro exitoso! Redirigiendo...' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      const message = err.message === 'Failed to fetch'
        ? 'No se pudo conectar al servidor. Verifica backend.'
        : err.message;
      setToast({ type: 'error', message });
      console.error('Register error (frontend):', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-green-600">Crear Cuenta</h2>
          <p className="text-gray-600">Únete a FutbolFlex</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${hasError('name') ? 'border-red-400' : ''}`}
              required
            />
            {hasError('name') && <p className="text-xs text-red-500 mt-1">Nombre es obligatorio</p>}
          </div>

          <div>
            <input
              name="email"
              type="email"
              placeholder="Correo"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${hasError('email') ? 'border-red-400' : ''}`}
              required
            />
            {hasError('email') && <p className="text-xs text-red-500 mt-1">Email es obligatorio</p>}
          </div>

          <div>
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${hasError('password') ? 'border-red-400' : ''}`}
              required
            />
            {hasError('password') && <p className="text-xs text-red-500 mt-1">Contraseña es obligatoria</p>}
          </div>

          <div>
            <input
              name="phone"
              type="tel"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${hasError('phone') ? 'border-red-400' : ''}`}
              required
            />
            {hasError('phone') && <p className="text-xs text-red-500 mt-1">Teléfono es obligatorio</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
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

export default Register;
