# Despliegue: Sueño bebé (Cloudflare Pages + D1)

## Requisitos previos

- Cuenta de Cloudflare y un proyecto **Pages** enlazado a este repositorio (rama `bebe-sueno` o la que uses).
- Base **D1** creada; copia su **database ID**.

## Configuración en el repositorio

1. **`wrangler.toml`**: sustituye `REPLACE_WITH_YOUR_D1_DATABASE_ID` por el ID real de tu D1 (campo `database_id`).
2. **Migraciones**: aplica el esquema a tu D1 (local o remoto):

   ```bash
   npx wrangler d1 migrations apply bebe-sueno --remote
   ```

   Usa `--local` solo si pruebas con base local. El nombre `bebe-sueno` es el valor de `database_name` en `wrangler.toml`.

3. **Secreto API**: en el proyecto Pages (o con `wrangler secret put`), define la variable **`API_SECRET`** con un valor largo y aleatorio. La misma cadena se pega en la app en **Ajustes** como clave API.

4. **Binding D1 en Pages**: en el panel del proyecto Pages → **Settings** → **Functions** → **D1 database bindings**, añade el binding **`DB`** apuntando a la misma base que en `wrangler.toml`.

## Build

- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Desarrollo local

1. Copia `.dev.vars.example` a `.dev.vars` y pon ahí `API_SECRET` (mismo valor que usarás en la app).
2. Ejecuta la app con Functions y D1:

   ```bash
   npm run dev:cf
   ```

   Esto arranca Vite bajo `wrangler pages dev` para que `/api/*` resuelva a las Pages Functions. Aplica migraciones a la D1 local si la usas:

   ```bash
   npx wrangler d1 migrations apply bebe-sueno --local
   ```

## PWA

Tras el despliegue, abre el sitio en HTTPS; en navegadores compatibles podrás **instalar** la PWA. La clave API solo se guarda en el dispositivo (`localStorage`).
