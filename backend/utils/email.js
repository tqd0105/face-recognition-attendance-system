const nodemailer = require('nodemailer');

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function isEmailEnabled() {
  return toBoolean(process.env.EMAIL_ENABLED, false);
}

function getFromAddress() {
  const address = String(process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || '').trim();
  const name = String(process.env.EMAIL_FROM_NAME || 'Face Recognition Attendance System').trim();
  return name ? `"${name.replace(/"/g, '')}" <${address}>` : address;
}

function createTransporter() {
  const host = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = toBoolean(process.env.SMTP_SECURE, port === 465);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials are not configured.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    throw new Error('Recipient email is required.');
  }

  if (!isEmailEnabled()) {
    return {
      skipped: true,
      message: 'Email sending is disabled by EMAIL_ENABLED=false.',
    };
  }

  const transporter = createTransporter();
  return transporter.sendMail({
    from: getFromAddress(),
    to: recipient,
    subject,
    html,
    text,
  });
}

module.exports = {
  isEmailEnabled,
  sendEmail,
};
