export async function verifyCaptcha(token) {
  if (process.env.MOCK_SENDY === '1') return true;
  // TODO: Integrar con hCaptcha o Turnstile
  return true;
}
