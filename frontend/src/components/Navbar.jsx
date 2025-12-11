import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo y marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/images/b1.png"
                alt="FutbolFlex"
                className="h-12 md:h-14 w-auto object-contain filter brightness-0 invert transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl md:text-3xl tracking-tight leading-none">
                FutbolFlex
              </span>
              <span className="text-green-200 text-xs font-medium tracking-wide hidden sm:block">
                Reserva tu cancha ideal
              </span>
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavLink to="/" icon="🏠" active={isActive('/')}>Inicio</NavLink>
            <NavLink to="/canchas" icon="⚽" active={isActive('/canchas')}>Canchas</NavLink>
            <NavLink to="/reservas" icon="📅" active={isActive('/reservas')}>Reservar</NavLink>
            <NavLink to="/contact" icon="📧" active={isActive('/contact')}>Contacto</NavLink>
            <NavLink to="/faq" icon="❓" active={isActive('/faq')}>FAQ</NavLink>
            {user && <NavLink to="/historial" icon="📋" active={isActive('/historial')}>Historial</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" icon="⚙️" active={isActive('/admin')}>Admin</NavLink>}
          </div>

          {/* Auth + Mobile toggle */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-white px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? '✖' : '☰'}
            </button>
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-medium text-sm">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white/90 backdrop-blur-md text-green-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-white hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-white hover:bg-white/10 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex bg-white text-green-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-green-50 hover:shadow-xl transition-all duration-300 items-center gap-2"
                >
                  <span>✨</span>
                  <span>Registrarse</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation (colapsable) */}
        {mobileOpen && (
          <div className="mt-4 flex flex-col gap-2 lg:hidden animate-fade-in">
            <MobileNavLink to="/" active={isActive('/')} onClick={() => setMobileOpen(false)}>🏠 Inicio</MobileNavLink>
            <MobileNavLink to="/canchas" active={isActive('/canchas')} onClick={() => setMobileOpen(false)}>⚽ Canchas</MobileNavLink>
            <MobileNavLink to="/reservas" active={isActive('/reservas')} onClick={() => setMobileOpen(false)}>📅 Reservar</MobileNavLink>
            <MobileNavLink to="/contact" active={isActive('/contact')} onClick={() => setMobileOpen(false)}>📧 Contacto</MobileNavLink>
            <MobileNavLink to="/faq" active={isActive('/faq')} onClick={() => setMobileOpen(false)}>❓ FAQ</MobileNavLink>
            {user && <MobileNavLink to="/historial" active={isActive('/historial')} onClick={() => setMobileOpen(false)}>📋 Historial</MobileNavLink>}
            {user?.role === 'admin' && <MobileNavLink to="/admin" active={isActive('/admin')} onClick={() => setMobileOpen(false)}>⚙️ Admin</MobileNavLink>}
            
            {/* Botones auth dentro del menú móvil */}
            {!user && (
              <div className="pt-2 border-t border-white/20 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition"
                >
                  🔑 Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-3 py-2 rounded-lg text-sm font-medium bg-white text-green-700 hover:bg-green-50 transition"
                >
                  ✨ Registrarse
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// Componente auxiliar para links de navegación desktop
const NavLink = ({ to, icon, children, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 relative group ${
      active ? 'bg-white/20 shadow-inner' : 'text-white hover:bg-white/10'
    }`}
  >
    <span className="text-base">{icon}</span>
    <span>{children}</span>
    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-white transition-all duration-300 ${
      active ? 'w-3/4' : 'w-0 group-hover:w-3/4'
    }`}></div>
  </Link>
);

// Componente auxiliar para links móviles
const MobileNavLink = ({ to, children, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
      active ? 'bg-green-600 text-white border-green-500' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
