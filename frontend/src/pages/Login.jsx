import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const API = '/api';

  // origen al que volver después del login
  const origin = location.state?.from || '/';
  const originPrefill = location.state?.prefillFieldId || null;

  // Mostrar mensaje si la sesión expiró
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session') === 'expired') {
      setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    }
  }, [location]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
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
      if (data && data.user) {
        login(data.user);
      }

      setToast({ type: 'success', message: '¡Inicio de sesión exitoso!' });

      setTimeout(() => {
        if (origin && origin !== '/') {
          if (originPrefill) navigate(origin, { state: { prefillFieldId: originPrefill } });
          else navigate(origin);
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (err) {
      const message = err.message === 'Failed to fetch'
        ? 'No se pudo conectar al servidor. Verifica backend.'
        : err.message || 'Error en el inicio de sesión';
      setToast({ type: 'error', message });
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Iniciar Sesión</h2>
        {error && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            error.includes('expirado') 
              ? 'bg-yellow-50 border border-yellow-300 text-yellow-800' 
              : 'bg-red-50 border border-red-300 text-red-700'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              name="email"
              type="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
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

export default Login;
