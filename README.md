# Instagantt PMO

Plataforma web minimalista (estilo Google/Material) para planificar proyectos por epics → tareas → subtareas, controlar roles (PMO vs. responsables de equipo) y visualizar costes, dependencias, exportaciones CSV/XLSX y dashboard semanal/mensual.

## Estructura

```
apps/
  backend/   → API Express + Prisma + PostgreSQL
  frontend/  → SPA React + Vite + Material UI
```

## Backend

- Node 20+, Express 5, TypeScript, Prisma + adapter `@prisma/adapter-pg`.
- Roles `PMO` y `LEAD`, autenticación JWT vía cookies httpOnly.
- Entidades: proyectos, equipos, miembros, epics, tareas, subtareas, dependencias, snapshots de avance, ledger de costes y budgets históricos.
- Endpoints clave (`/api`):
  - `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
  - `GET /projects`, `POST /projects` (PMO), `POST /projects/:id/teams`, `POST /projects/:id/epics`, `POST /epics/:id/tasks`, `POST /tasks/:id/subtasks`, `PATCH /subtasks/:id`, `POST /subtasks/:id/assignments`, `POST /dependencies`.
  - `GET /projects/:id/dashboard`, `GET /projects/:id/plan`, `GET /projects/:id/export?format=csv|xlsx`.
- Exportación plana apta para Excel, dashboard con últimos snapshots y KPIs de coste/avance.

### Configuración

1. Copia `.env.example` dentro de `apps/backend` → `.env` y define:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/instagantt?schema=public"
   JWT_SECRET="cambia_esto"
   ```
2. Instala dependencias y genera Prisma Client:
   ```bash
   cd apps/backend
   npm install
   npm run prisma
   ```
3. Ejecuta migraciones/`db push` y crea usuario PMO semilla:
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```
4. Inicia el API:
   ```bash
   npm run dev
   ```

> **Nota**: Prisma usa el adaptador oficial de `pg`, por lo que necesitas PostgreSQL en marcha (puedes usar Docker Compose o servicios locales tipo Supabase).

## Frontend

- React 18 + Vite + TypeScript.
- Material UI custom (paleta neutra con acentos azul/verde) y estado global con Zustand + React Query.
- Componentes principales: login PMO, sidebar de proyectos con exportación, dashboard de KPIs, visualización Gantt (epic → tareas → subtareas con barras y colores por usuario/estado).

### Configuración

```bash
cd apps/frontend
npm install
npm run dev # Vite en http://localhost:5173
```

Define `VITE_API_URL` si el backend corre en otro host/puerto (por defecto `http://localhost:4000/api`).

## Scripts útiles

| Ruta | Comando | Descripción |
|------|---------|-------------|
| apps/backend | `npm run dev` | API con `ts-node-dev`. |
| apps/backend | `npm run build` | Compila a `dist/`. |
| apps/backend | `npm run seed` | Crea usuario PMO (`pmo@example.com / changeme`). |
| apps/frontend | `npm run dev` | SPA en modo desarrollo. |
| apps/frontend | `npm run build` | Build de producción. |

## Próximos pasos sugeridos

- Añadir migrations iniciales (`prisma migrate dev`) y datos seed para equipos/personas.
- Conectar Vista Gantt a endpoints reales y permitir CRUD completo desde UI.
- Implementar importador CSV de horas imputadas (fase 2) y cálculo automático de EV/budget burn.
- Añadir tests (Jest/Vitest) y linting consistente.
- Docker Compose para levantar `api + web + postgres` con un solo comando.
