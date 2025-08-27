import nodemailer from 'nodemailer';

export async function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendOtpEmail(email, code) {
  const transport = await createTransport();
  await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'OTP', text: `Código: ${code}` });
}

export async function sendTicketEmail(email, html) {
  const transport = await createTransport();
  await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Entradas', html });
}
