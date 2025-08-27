import QRCode from 'qrcode';

export function generate(code) {
  return QRCode.toDataURL(code);
}
