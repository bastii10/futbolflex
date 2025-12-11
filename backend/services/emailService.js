const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

let transporter;
let ready = false;

async function init() {
  if (ready) return transporter;
  const {
    EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_DEBUG
  } = process.env;

  const pass = (EMAIL_PASS || '').replace(/\s+/g, '');
  const isPlaceholder = !EMAIL_USER || /tu_email@/i.test(EMAIL_USER);
  try {
    if (!EMAIL_HOST || !EMAIL_USER || !pass || isPlaceholder) {
      throw new Error('config incompleta o EMAIL_USER placeholder');
    }
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: false,
      auth: { user: EMAIL_USER, pass },
      logger: EMAIL_DEBUG === '1',
      debug: EMAIL_DEBUG === '1',
    }, {
      from: EMAIL_FROM || EMAIL_USER
    });
    await transporter.verify();
    console.log('✅ SMTP principal verificado');
  } catch (err) {
    console.warn('⚠️ SMTP principal falló:', err.message, '→ usando Ethereal');
    const test = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: test.smtp.host,
      port: test.smtp.port,
      secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
      logger: EMAIL_DEBUG === '1',
      debug: EMAIL_DEBUG === '1',
    }, {
      from: `FutbolFlex TEST <${test.user}>`
    });
  }
  ready = true;
  return transporter;
}

function isAuthFailure(err) {
  return /535|BadCredentials/i.test(err?.message || '');
}

/**
 * Envía email de confirmación con QR (PNG en adjunto).
 * @param {Object} reservation - Documento reserva poblado.
 * @param {String} fieldName - Nombre cancha.
 * @returns {Promise<{success:boolean, info?:any, previewUrl?:string, error?:string}>}
 */
async function sendReservationConfirmation(reservation, fieldName) {
  try {
    const t = await init();

    const escapeHtml = (str = '') =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const qrPayload = {
      id: reservation._id,
      field: fieldName,
      date: reservation.date,
      time: reservation.startTime,
      code: reservation.qrCode
    };

    const png = await QRCode.toBuffer(JSON.stringify(qrPayload), {
      type: 'png', width: 300, errorCorrectionLevel: 'M'
    });

    const fechaLocal = new Date(reservation.date).toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const hora = escapeHtml(reservation.startTime);
    const codigo = escapeHtml(reservation.qrCode);
    const cancha = escapeHtml(fieldName);
    const emailDestino = escapeHtml(reservation.userEmail);
    const siteUrl = process.env.SITE_URL || 'https://futbolflex.local';

    // — HTML ULTRA MEJORADO con colores vibrantes, sombras intensas, bordes brillantes —
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reserva Confirmada</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    padding: 20px;
    line-height: 1.6;
  }
  .wrap {
    max-width: 650px;
    margin: 0 auto;
    background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.2);
  }
  .header {
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    padding: 32px 28px;
    text-align: center;
    position: relative;
    box-shadow: 0 8px 24px rgba(16,185,129,.5);
  }
  .header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at top right, rgba(255,255,255,.15), transparent 60%);
    pointer-events: none;
  }
  .header-icon {
    font-size: 56px;
    margin-bottom: 12px;
    display: inline-block;
    filter: drop-shadow(0 6px 12px rgba(0,0,0,.3));
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  .header-title {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -.5px;
    text-shadow: 0 4px 12px rgba(0,0,0,.3);
    margin-bottom: 8px;
  }
  .header-sub {
    font-size: 15px;
    color: rgba(255,255,255,.95);
    font-weight: 600;
    text-shadow: 0 2px 8px rgba(0,0,0,.2);
  }
  .hero-banner {
    background: linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #10b981 100%);
    padding: 20px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    box-shadow: inset 0 2px 4px rgba(0,0,0,.1);
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #ffffff, #f0fdfa);
    border: 2px solid rgba(16,185,129,.3);
    border-radius: 50px;
    font-size: 13px;
    font-weight: 800;
    color: #065f46;
    box-shadow: 0 4px 12px rgba(16,185,129,.25), inset 0 1px 2px rgba(255,255,255,.8);
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .badge .ico { font-size: 18px; }
  .content {
    padding: 32px 28px;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 24px;
    justify-content: center;
  }
  .chip {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    padding: 8px 16px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(16,185,129,.4);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .ticket-box {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%);
    border: 3px solid #f59e0b;
    border-radius: 20px;
    padding: 20px;
    margin: 20px 0;
    text-align: center;
    box-shadow: 0 8px 24px rgba(245,158,11,.4), inset 0 2px 4px rgba(255,255,255,.6);
    position: relative;
    overflow: hidden;
  }
  .ticket-box::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,.3), transparent 70%);
    animation: shimmer 3s linear infinite;
  }
  @keyframes shimmer {
    0% { transform: translate(-50%,-50%) rotate(0deg); }
    100% { transform: translate(-50%,-50%) rotate(360deg); }
  }
  .ticket-label {
    font-size: 11px;
    font-weight: 900;
    color: #92400e;
    letter-spacing: 1px;
    margin-bottom: 10px;
    text-transform: uppercase;
    text-shadow: 0 1px 2px rgba(255,255,255,.8);
  }
  .ticket-code {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    border: 2px dashed #f59e0b;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: 900;
    color: #92400e;
    box-shadow: 0 4px 12px rgba(0,0,0,.15);
    letter-spacing: 1px;
    position: relative;
    z-index: 1;
  }
  .section-title {
    font-size: 18px;
    font-weight: 900;
    color: #065f46;
    margin: 24px 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::before {
    content: '';
    width: 6px;
    height: 24px;
    background: linear-gradient(180deg, #10b981, #059669);
    border-radius: 3px;
    box-shadow: 0 2px 8px rgba(16,185,129,.5);
  }
  .meta-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 10px;
    margin: 10px 0;
  }
  .meta-table td {
    padding: 14px 16px;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border: 2px solid #d1fae5;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(16,185,129,.1);
  }
  .meta-table td:first-child {
    width: 140px;
    font-weight: 800;
    color: #047857;
    border-radius: 12px 0 0 12px;
  }
  .meta-table td:last-child {
    color: #064e3b;
    font-weight: 600;
    border-radius: 0 12px 12px 0;
  }
  .qr-section {
    text-align: center;
    margin: 28px 0;
    padding: 24px;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 3px solid #10b981;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(16,185,129,.3), inset 0 2px 4px rgba(255,255,255,.7);
  }
  .qr-section img {
    width: 220px;
    height: 220px;
    border-radius: 20px;
    border: 6px solid #fff;
    box-shadow: 0 12px 36px rgba(0,0,0,.25), 0 0 0 2px #10b981;
    background: #fff;
  }
  .qr-caption {
    margin-top: 14px;
    font-size: 13px;
    color: #065f46;
    font-weight: 700;
  }
  .cta-wrap {
    text-align: center;
    margin: 28px 0;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    color: #fff !important;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: .5px;
    box-shadow: 0 10px 30px rgba(16,185,129,.5), inset 0 1px 2px rgba(255,255,255,.3);
    transition: transform .2s, box-shadow .2s;
  }
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 40px rgba(16,185,129,.6);
  }
  .alert-box {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 2px solid #f59e0b;
    border-radius: 16px;
    padding: 16px 20px;
    margin: 20px 0;
    font-size: 14px;
    color: #92400e;
    font-weight: 600;
    box-shadow: 0 6px 18px rgba(245,158,11,.3);
    display: flex;
    align-items: start;
    gap: 12px;
  }
  .alert-icon {
    font-size: 22px;
    flex-shrink: 0;
  }
  .footer {
    background: linear-gradient(135deg, #065f46, #047857);
    color: rgba(255,255,255,.9);
    padding: 24px 20px;
    text-align: center;
    font-size: 13px;
  }
  .footer-year {
    font-weight: 700;
    margin-bottom: 12px;
  }
  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, #10b981 50%, transparent);
    margin: 24px 0;
    opacity: .4;
  }
  @media (max-width: 600px) {
    .header { padding: 28px 20px; }
    .content { padding: 24px 18px; }
    .header-title { font-size: 24px; }
    .qr-section img { width: 180px; height: 180px; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <!-- Header con gradiente vibrante y animación -->
    <div class="header">
      <div class="header-icon">⚽</div>
      <h1 class="header-title">FutbolFlex</h1>
      <p class="header-sub">¡Tu Reserva Está Confirmada!</p>
    </div>

    <!-- Hero banner con badges destacados -->
    <div class="hero-banner">
      <div class="badge">
        <span class="ico">🏟️</span>
        <span>${cancha}</span>
      </div>
      <div class="badge">
        <span class="ico">📅</span>
        <span>${escapeHtml(fechaLocal)}</span>
      </div>
      <div class="badge">
        <span class="ico">⏰</span>
        <span>${hora}</span>
      </div>
    </div>

    <!-- Contenido principal -->
    <div class="content">
      <!-- Pills informativos -->
      <div class="pills">
        <div class="chip">📧 ${emailDestino}</div>
        <div class="chip">🔐 Código Seguro</div>
        <div class="chip">🎟️ Entrada Digital</div>
      </div>

      <!-- Ticket del código con efecto shimmer -->
      <div class="ticket-box">
        <div class="ticket-label">🎫 Código de Reserva</div>
        <div class="ticket-code">
          <span>🎟️</span>
          <span>${codigo}</span>
        </div>
      </div>

      <!-- Detalles -->
      <h3 class="section-title">Detalles de tu Reserva</h3>
      <table class="meta-table" role="presentation">
        <tr>
          <td>Estado</td>
          <td>✅ Confirmada</td>
        </tr>
        <tr>
          <td>Ingreso</td>
          <td>Presenta el QR en recepción para validar tu entrada</td>
        </tr>
        <tr>
          <td>Recomendación</td>
          <td>Llega 10 minutos antes ⏳ y trae hidratación 💧</td>
        </tr>
      </table>

      <div class="divider"></div>

      <!-- QR con borde brillante -->
      <div class="qr-section">
        <img src="cid:qrImage" alt="Código QR de la reserva" />
        <p class="qr-caption"> Escanéalo al ingresar </p>
      </div>

      <!-- Alerta de cancelación -->
      <div class="alert-box">
        <span class="alert-icon">⚠️</span>
        <div>
          Puedes cancelar hasta <strong>24 horas antes</strong> desde tu historial.
        </div>
      </div>
    </div>

    <!-- Footer vibrante -->
    <div class="footer">
      <div class="footer-year">
        © ${new Date().getFullYear()} <strong>FutbolFlex</strong> · Arriendo de Canchas de Fútbol
      </div>
      <div>Reserva fácil, rápido y seguro 🚀</div>
    </div>
  </div>
</body>
</html>
    `;

    const info = await t.sendMail({
      to: reservation.userEmail,
      subject: `✅⚽ Reserva Confirmada - ${fieldName}`,
      html,
      text: `Reserva confirmada:
Cancha: ${fieldName}
Fecha: ${fechaLocal}
Hora: ${reservation.startTime}
Código: ${reservation.qrCode}

Presenta el QR adjunto al ingresar.
Ver historial: ${siteUrl}/historial`,
      attachments: [
        { filename: 'qr_reserva.png', content: png, contentType: 'image/png' },
        { filename: 'qr_inline.png', content: png, contentType: 'image/png', cid: 'qrImage' }
      ]
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    return {
      success: true,
      info: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      },
      previewUrl
    };
  } catch (err) {
    if (isAuthFailure(err)) {
      return { success: false, authError: true, error: 'Credenciales inválidas (verifica Gmail App Password).' };
    }
    return { success: false, error: err.message };
  }
}

module.exports = { sendReservationConfirmation };
