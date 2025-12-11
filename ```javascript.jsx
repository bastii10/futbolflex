```javascript
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user }) => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-lg font-bold">
          <Link to="/">FutbolFlex</Link>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-white hover:text-green-200 font-medium">Inicio</Link>
          <Link to="/reservas" className="text-white hover:text-green-200 font-medium">Reservas</Link>
          <Link to="/canchas" className="text-white hover:text-green-200 font-medium">Canchas</Link>
          <Link to="/pagos" className="text-white hover:text-green-200 font-medium">Pagos</Link>
          <Link to="/contact" className="text-white hover:text-green-200 font-medium">Contacto</Link>
          <Link to="/faq" className="text-white hover:text-green-200 font-medium">FAQ</Link>
          {user && (
            <Link to="/historial" className="text-white hover:text-green-200 font-medium">Mi Historial</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" className="text-white hover:text-green-200 font-medium">Admin</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
```