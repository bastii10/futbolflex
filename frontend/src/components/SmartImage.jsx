import { useState, useMemo } from 'react';

const SmartImage = ({ name, src, alt = '', className = '', sizes, style }) => {
  const candidates = useMemo(() => {
    if (src) return [src];
    const base = `/images/fields/${name}`;
    return [
      `${base}.jpg`,
      `${base}.png`,
      `${base}.jpeg`,
      `${base}.webp`,
      `/images/${name}.jpg`,
      `/images/${name}.png`,
    ];
  }, [name, src]);

  const [index, setIndex] = useState(0);
  const current = candidates[index];

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex(index + 1);
    } else {
      
      setIndex(candidates.length); 
    }
  };

  if (index >= candidates.length) {
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
         <rect width='100%' height='100%' fill='#ecfdf5'/>
         <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#16a34a' font-family='Arial' font-size='20'>Imagen no disponible</text>
       </svg>`
    );
    return <img src={`data:image/svg+xml;utf8,${svg}`} alt={alt} className={className} sizes={sizes} style={style} />;
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      sizes={sizes}
      style={style}
      onError={handleError}
    />
  );
};

export default SmartImage;
