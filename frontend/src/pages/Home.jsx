import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '../components/SmartImage';
import Map from '../components/Map';

const Home = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch('/api/fields');
        const data = await res.json();
        if (res.ok && data.length > 0) {
          // Tomar solo las primeras 3 canchas para mostrar en home
          setFields(data.slice(0, 3));
        } else {
          setFields([]);
        }
      } catch (err) {
        console.error('Error cargando canchas:', err);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-green-600 text-white py-12">
        <div className="container mx-auto px-4 flex items-center gap-6">
          <div>
            <p className="mt-2 text-green-100 max-w-lg">Encuentra y reserva las mejores canchas de fútbol en tu zona. Fácil, rápido y seguro.</p>
            <div className="mt-6 flex gap-3">
              <Link to="/reservas" className="bg-white text-green-600 px-6 py-3 rounded-lg font-bold hover:bg-green-100">Reservar Ahora</Link>
              <Link to="/canchas" className="bg-green-800 text-white px-6 py-3 rounded-lg hover:bg-green-900">Ver Canchas</Link>
            </div>
          </div>

          {!loading && fields.length > 0 && (
            <div className="hidden lg:block flex-1">
              <div className="grid grid-cols-3 gap-3">
                {fields.map(f => (
                  <div key={f._id} className="rounded overflow-hidden shadow-lg">
                    <SmartImage 
                      name={f.image || 'cancha1'} 
                      alt={f.name} 
                      className="w-48 h-28 object-cover" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6 text-center">Nuestras Canchas</h2>
        
        {loading ? (
          <div className="text-center text-gray-600">⏳ Cargando canchas...</div>
        ) : fields.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">🏟️</div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">No hay canchas disponibles</h3>
            <p className="text-blue-600">Las canchas estarán disponibles pronto</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fields.map(f => (
              <div key={f._id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition-shadow">
                <SmartImage 
                  name={f.image || 'cancha1'} 
                  alt={f.name} 
                  className="w-full h-52 object-cover" 
                />
                <div className="p-4">
                  <h3 className="text-xl font-bold">{f.name}</h3>
                  <p className="text-sm text-gray-600">{f.surfaceType}</p>
                  <p className="text-green-600 font-bold mt-2">${f.price.toLocaleString()}/hora</p>
                  <Link 
                    to="/canchas" 
                    className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Ver todas las canchas
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sección del Mapa */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Nuestra Ubicación</h2>
          <Map />
        </section>
      </main>
    </div>
  );
};

export default Home;
