# Despliegue: Sueño bebé (Cloudflare Pages + D1)

## Requisitos previos

- Cuenta de Cloudflare y un proyecto **Pages** enlazado a este repositorio (rama `bebe-sueno` o la que uses).
- Base **D1** creada; copia su **database ID**.

## Configuración en el repositorio

1. **`wrangler.toml`**: pon `database_id` y `database_name` de tu D1 (en este proyecto el nombre suele ser `sueno`).
2. **Esquema D1 (una vez)**: con una base vacía, crea las tablas:

   ```bash
   npx wrangler d1 execute sueno --remote --file=./schema.sql
   ```

   Sustituye `sueno` por el valor de `database_name` en tu `wrangler.toml`. Para D1 local usa `--local` en lugar de `--remote`.

3. **Si la tabla ya existía sin la columna `recorded_by`** (padre/cuidador), ejecuta una sola vez:

   ```bash
   npx wrangler d1 execute sueno --remote --file=./schema_patch_recorded_by.sql
   ```

4. **Secreto API**: en el proyecto Pages (o `wrangler secret put`), define **`API_SECRET`**. La misma cadena va en la app → **Ajustes** → clave API. Tipo **Secret** en el panel.

5. **Binding D1 en Pages**: **Settings** → **Functions** → **D1 database bindings** → binding **`DB`** apuntando a esa base.

## Build

- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Desarrollo local

1. Copia `.dev.vars.example` a `.dev.vars` y pon `API_SECRET`.
2. `npm run dev:cf` (Vite bajo `wrangler pages dev` para `/api/*`).
3. Si usas D1 local sin tablas: `npx wrangler d1 execute sueno --local --file=./schema.sql`

## PWA

Tras el despliegue, abre el sitio en HTTPS para instalar la PWA. La clave API se guarda en el dispositivo (`localStorage`).
