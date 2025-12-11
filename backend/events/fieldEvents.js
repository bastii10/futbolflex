const { EventEmitter } = require('events');
const fieldEmitter = new EventEmitter();

// Limitar posibles listeners en escenarios múltiples
fieldEmitter.setMaxListeners(50);

const emitFieldEvent = (type, data) => {
  fieldEmitter.emit('field-event', { type, data, at: Date.now() });
};

const subscribeFieldEvents = (listener) => {
  fieldEmitter.on('field-event', listener);
  return () => fieldEmitter.removeListener('field-event', listener);
};

module.exports = { emitFieldEvent, subscribeFieldEvents };
