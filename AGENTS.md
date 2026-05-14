# AGENTS.md

## Cursor Cloud specific instructions

### Modelo del repositorio

Este es un **sandbox con rama-por-proyecto**. La rama `main` es solo plantilla/documentación. El código de cada proyecto vive en su propia rama (p. ej. `bebe-sueno`, `pomodoro`). **Los PRs de código deben apuntar a la rama del proyecto, nunca a `main`.**

### Proyecto principal: `bebe-sueno`

Stack: React 19 + Vite 6 + Tailwind CSS 4 + Cloudflare Pages Functions + D1 (SQLite).

#### Comandos estándar (ver `package.json`)

| Acción | Comando |
|--------|---------|
| Instalar deps | `npm install` |
| Lint | `npm run lint` |
| Build (tsc + vite) | `npm run build` |
| Dev frontend-only | `npm run dev` |
| Dev full-stack | Ver abajo |

#### Servidor de desarrollo full-stack

El script `npm run dev:cf` (`wrangler pages dev -- vite`) **no funciona** con wrangler >= 4.83 porque `pages_build_output_dir` en `wrangler.toml` y el comando proxy entran en conflicto. Workaround:

1. `npm run build` (genera `dist/`)
2. `npx wrangler pages dev dist --port 8788` (sirve estáticos + Pages Functions + D1 local)

Para obtener HMR en frontend, ejecutar además `npx vite --port 5173 --host` en otra terminal y usar puerto 5173 para desarrollo visual. El puerto 8788 (wrangler) es necesario para probar llamadas a `/api/*`.

#### Base de datos D1 local

- Inicializar (una sola vez): `npx wrangler d1 execute sueno --local --file=./schema.sql`
- Los datos se persisten en `.wrangler/state/v3/d1/`.
- Si la BD ya existe, el comando anterior fallará con "table already exists". Es seguro ignorar ese error o borrar `.wrangler/state/` para resetear.

#### Variables de entorno locales

Copiar `.dev.vars.example` a `.dev.vars`. El valor `OTP_DEBUG_CODE=123456` permite usar `123456` como código OTP en desarrollo. Si no se define, se genera uno aleatorio visible en la cabecera `X-Debug-Otp` de la respuesta.

#### Flujo de autenticación en desarrollo

1. `POST /api/auth/request-otp` con `{"email":"...", "fullName":"...", "otpCase":"register"}` (primera vez) o `"otpCase":"login"`.
2. La respuesta incluye `challengeId` y cabecera `X-Debug-Otp` con el código.
3. `POST /api/auth/verify-otp` con `{"challengeId":"...", "code":"123456"}` → devuelve `token`.
4. Usar `Authorization: Bearer <token>` para las demás llamadas API.

#### ESLint

La configuración ignora `functions/**` (backend) y solo lint-ea `src/**` (frontend React/TS).
