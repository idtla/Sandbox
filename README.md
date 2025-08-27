# Landing de Preestreno (Esqueleto)

Repositorio inicial para una landing de reservas con Sendy y panel de administración.

## Instalación

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

## Modo MOCK y REAL

El proyecto está preparado para soportar servicios reales o mocks mediante variables de entorno `MOCK_SENDY` y `MOCK_SMTP`.

## Sendy y SMTP

Configurar las variables de entorno `SENDY_URL`, `SENDY_API_KEY` y credenciales SMTP en `.env` para el modo real.

## Captcha y Redis

Soporta Turnstile o hCaptcha según `CAPTCHA_PROVIDER`. Redis es opcional mediante `REDIS_URL`.

## Semillas y pruebas

`scripts/seed_event.js` crea un evento de demostración. `npm test` ejecuta comprobaciones mínimas.

## Seguridad

El servidor usa Express con Helmet y rate limiting. Este es un esqueleto inicial, se requieren más validaciones antes de producción.
