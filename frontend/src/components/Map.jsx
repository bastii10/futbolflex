import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Map = () => {
  const mapRef = useRef(null);
  const location = [-33.4489, -70.6693]; // Santiago, Chile

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current).setView(location, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker(location).addTo(map);
    marker.bindPopup("<b>FutbolFlex</b><br>Av Pazuzu 1254").openPopup();

    return () => map.remove();
  }, []);

  return (
    <div className="w-full">
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg shadow-lg"
      />
      <div className="mt-4 text-center text-gray-600">
        <p className="font-semibold">Encuéntranos en:</p>
        <p>Av Pazuzu 1254, Santiago</p>
        <p className="text-sm mt-2">
          <a 
            href="https://www.openstreetmap.org/directions?to=--33.5066,-70.6057"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700"
          >
            ¿Cómo llegar? →
          </a>
        </p>
      </div>
    </div>
  );
};

export default Map;
