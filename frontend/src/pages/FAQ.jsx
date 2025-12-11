const FAQ = () => {
  const faqs = [
    {
      question: "¿Cómo puedo hacer una reserva?",
      answer: "Inicia sesión, elige la cancha y horario y confirma. Recibirás un código QR."
    },
    {
      question: "¿Qué métodos de pago aceptan?",
      answer: "Transferencia bancaria, tarjetas de crédito y débito."
    },
    {
      question: "¿Puedo cancelar mi reserva?",
      answer: "Sí, puedes cancelar hasta 24 horas antes de la reserva."
    }
  ];  

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Preguntas Frecuentes</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Tarifas generales</h2>
          <ul className="list-disc pl-5 text-gray-700">
            <li>Cancha estándar: $30.000 / hora</li>
            <li>Ofertas para equipos y reservas recurrentes</li>
          </ul>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold mb-2">{f.question}</h3>
              <p className="text-gray-600">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
