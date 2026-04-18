# Baby Sleep Tracker Bot

Bot de Telegram para registrar el sueño de un bebé sobre **Cloudflare Workers + D1**, con foco en **latencia de sueño**, cierres rápidos desde teclado dinámico y una **vista web responsive** para móvil.

## Qué incluye

- Webhook de Telegram con `fetch` nativo.
- Teclado dinámico por estado:
  - **En espera**: `🚀 Iniciar Intento`, `📝 Manual/Editar`, `📊 Resumen hoy`
  - **Intentando dormir**: `💤 ¡Ya se durmió!`, `❌ Cancelar Intento`
  - **Durmiendo**: `☀️ ¡Se despertó!`, `📝 Corregir hora inicio`
- Persistencia en **Cloudflare D1**.
- Cálculo de:
  - minutos que tarda en dormirse
  - duración total de sueño efectivo
- Flujo manual guiado paso a paso si falta un registro abierto.
- Mini interfaz web responsive para móviles tipo Pixel 9 con temporizador y resumen del día.

## Estructura

- `worker.js`: Worker principal, webhook de Telegram y vista web.
- `wrangler.jsonc`: configuración de Cloudflare Worker y binding a D1.
- `sql/create_registros_sueno.sql`: SQL para crear la tabla `registros_sueno`.
- `conversacion.md`: hilo de trabajo entre agentes.
- `.cursor/plans/plan-baby-sleep-bot.md`: plan único con prompts y tablón.

## Base de datos D1

La base ya existente queda enlazada así en `wrangler.jsonc`:

- `database_name = "suenolytics"`
- `database_id = "1c847099-1450-4ea0-a511-0085defcb24f"`

Binding usado en el código:

- `env.DB`

## Secretos necesarios

No están versionados. Hay que cargarlos antes de desplegar:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

### Para qué sirve cada secreto

- `TELEGRAM_BOT_TOKEN`: token del bot de BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: valor que Telegram enviará en la cabecera definida por `WEBHOOK_SECRET_HEADER`.

## Configuración de zona horaria

El proyecto usa por defecto:

- `Europe/Madrid`

Se configura en `wrangler.jsonc` mediante `APP_TIMEZONE`.

## Crear la tabla en D1

```bash
npm run d1:apply:remote
```

Si prefieres ejecutar el SQL manualmente:

```bash
npx wrangler d1 execute suenolytics --remote --file=./sql/create_registros_sueno.sql
```

## Validar el proyecto

```bash
npm run syntax
npm run check
```

## Desplegar

```bash
npm run deploy
```

## Configurar el webhook de Telegram

Tras desplegar, registra el webhook contra la URL pública del Worker:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://TU-WORKER.workers.dev/telegram/webhook",
    "secret_token": "TU_TELEGRAM_WEBHOOK_SECRET"
  }'
```

## Rutas del Worker

- `GET /` -> vista web responsive del tracker.
- `GET /api/status?user_id=<id>` -> estado actual y métricas del día.
- `POST /api/action` -> acciones simples desde la UI web.
- `POST /telegram/webhook` -> webhook de Telegram.

## Cómo funciona el flujo principal

### 1. Bebé despierto

El usuario pulsa `🚀 Iniciar Intento`.

Se crea un registro con:

- `estado = PENDIENTE_DORMIR`
- `hora_intento = ahora`

### 2. Intentando dormir

El usuario pulsa `💤 ¡Ya se durmió!`.

El sistema:

- guarda `hora_sueno_efectivo`
- cambia a `DURMIENDO`
- calcula la latencia en minutos desde `hora_intento`

### 3. Durmiendo

El usuario pulsa `☀️ ¡Se despertó!`.

El sistema:

- guarda `hora_despertar`
- cambia a `FINALIZADO`
- calcula la duración total de sueño efectivo

### 4. Validación de ausencia de registro abierto

Si el usuario pulsa `☀️ ¡Se despertó!` y no hay un registro abierto, el bot entra en flujo manual guiado:

1. pide hora de inicio del sueño efectivo
2. pide hora de despertar
3. pide método
4. guarda el registro ya finalizado

## Métodos soportados

- `brazos`
- `cuna`
- `acunada`

## Extensibilidad prevista

La lógica se ha separado para poder añadir en el futuro:

- tomas de leche
- cambio de pañal
- notas
- clasificaciones por siesta/nocturno

sin rehacer el flujo principal del sueño.

## Nota sobre UX responsive

Telegram ya ofrece una interfaz móvil responsive por defecto para el teclado dinámico, que es el canal principal de uso rápido. Además, este proyecto expone una vista web ligera, táctil y adaptada a pantallas móviles modernas, con tarjetas grandes, temporizador visible y acciones directas.
