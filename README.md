# Suenolytics PWA

Aplicación **PWA independiente** para registrar el sueño de un bebé en **Cloudflare Pages + Pages Functions + D1**, diseñada para **uso móvil** y pensada para instalarse en pantalla de inicio como si fuera una app nativa.

## Qué incluye

- Interfaz táctil responsive optimizada para móvil vertical.
- Instalación PWA con:
  - `manifest.webmanifest`
  - `service worker`
  - modo standalone
- Persistencia en **Cloudflare D1**.
- Seguimiento de:
  - intento de sueño
  - latencia para dormirse
  - sueño efectivo
  - despertar
- Registro manual dentro de la propia app.
- Perfil local en el dispositivo para funcionar de forma autónoma, sin Telegram y sin chat.
- Resumen del día y lista de registros recientes.

## Arquitectura

- `public/`
  - `index.html`
  - `styles.css`
  - `app.js`
  - `manifest.webmanifest`
  - `sw.js`
  - `icons/icon.svg`
- `functions/api/`
  - `profile.js`
  - `status.js`
  - `action.js`
- `functions/_shared/sleep-core.js`
- `sql/create_registros_sueno.sql`
- `wrangler.jsonc`
- `conversacion.md`
- `.cursor/plans/plan-baby-sleep-bot.md`

## Base de datos D1

La app queda conectada a la base existente:

- `database_name = "suenolytics"`
- `database_id = "1c847099-1450-4ea0-a511-0085defcb24f"`

Binding usado en Pages Functions:

- `context.env.DB`

## Configuración de Cloudflare Pages

El proyecto usa `wrangler.jsonc` con:

- `pages_build_output_dir = "./public"`
- `compatibility_date = "2026-04-18"`
- `APP_TIMEZONE = "Europe/Madrid"`

Para desarrollo local con Pages y D1, se incluye:

- `preview_database_id = "DB"`

## Crear la tabla en D1

```bash
npm run d1:apply:remote
```

O manualmente:

```bash
npx wrangler d1 execute suenolytics --remote --file=./sql/create_registros_sueno.sql
```

## Validar el proyecto

```bash
npm run pages:build:functions
npm run check
```

## Desplegar en Pages

Si ya existe el proyecto en Cloudflare Pages:

```bash
npm run deploy
```

Si no existe todavía, crea primero el proyecto en Cloudflare Pages y usa como salida estática la carpeta:

- `public`

## Rutas principales

- `GET /` -> interfaz PWA principal.
- `POST /api/profile` -> crea o recupera perfil.
- `GET /api/status?user_id=<id>` -> estado actual, métricas y registros recientes.
- `POST /api/action` -> acciones de sueño y registro manual.
- `GET /app.webmanifest` -> manifest dinámico servido por Pages Functions.

## Flujo principal

### 1. Perfil local

La primera vez, la app pide:

- nombre del bebé
- nombre del cuidador

Ese perfil se guarda:

- en D1
- en `localStorage` del dispositivo

### 2. Bebé despierto

Pulsa:

- `Iniciar intento`

La app crea un registro con:

- `estado = PENDIENTE_DORMIR`
- `hora_intento = ahora`

### 3. Intentando dormir

Pulsa:

- `Ya se ha dormido`

La app:

- guarda `hora_sueno_efectivo`
- cambia a `DURMIENDO`
- calcula la latencia

### 4. Durmiendo

Pulsa:

- `Se ha despertado`

La app:

- guarda `hora_despertar`
- cambia a `FINALIZADO`
- calcula la duración del sueño efectivo

### 5. Registro manual

Desde la propia interfaz se puede crear un registro cerrado manualmente indicando:

- hora de intento
- hora de sueño
- hora de despertar
- método

## Métodos soportados

- `brazos`
- `cuna`
- `acunada`

## Nota de UX móvil

La app está pensada para móvil desde el principio:

- layout centrado de una sola columna
- botones grandes
- tarjetas con contraste alto
- barra fija inferior con acciones principales
- timer visible en tiempo real
- instalación como app en pantalla de inicio

## Extensibilidad prevista

La lógica compartida está separada para permitir añadir más eventos sin rehacer la base:

- tomas
- pañales
- medicación
- notas
- etiquetas de siesta/nocturno
