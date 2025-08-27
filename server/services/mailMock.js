import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

export async function sendOtpEmail(email, code) {
  const dir = path.join(__dirname, '..', '..', 'emails', 'otp');
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `${email}.txt`), `OTP: ${code}`);
}

export async function sendTicketEmail(email, html) {
  const dir = path.join(__dirname, '..', '..', 'emails', 'confirmations');
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `${email}.html`), html);
}
