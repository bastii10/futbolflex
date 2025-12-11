import { useEffect } from 'react';

const Toast = ({ message = '', type = 'success', onClose }) => {
  useEffect(() => {
    if (!message) return; // no crear timeout si no hay mensaje
    const t = setTimeout(() => onClose && onClose(), 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  // Evitar render si no hay mensaje válido
  if (!message || typeof message !== 'string' || message.trim() === '') return null;

  const styles = type === 'error'
    ? 'bg-red-600 border-red-700'
    : type === 'warning'
    ? 'bg-yellow-600 border-yellow-700'
    : 'bg-green-600 border-green-700';

  const icon = type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : '✓';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
      <div className={`${styles} text-white px-8 py-4 rounded-xl shadow-2xl border-2 pointer-events-auto max-w-lg w-full`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <p className="text-base font-medium">{String(message)}</p>
        </div>
      </div>
    </div>
  );
};

export default Toast;
