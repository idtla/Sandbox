# Project Timer (Glass)

Cronómetro por proyectos con temas de color, pestañas Timer / Proyectos / Estadísticas y exportación a JSON.

## Uso local

Abre `index.html` en el navegador (o sirve la carpeta con cualquier servidor estático). Los datos se guardan en `localStorage` y puedes exportar todo con **Guardar todo en JSON** (pestaña Estadísticas o botón "Exportar JSON" en Timer).

## Estructura

- **index.html** – estructura y pestañas
- **styles.css** – estilos
- **app.js** – lógica del timer, proyectos y guardado

## Pestañas

1. **Timer** – Selección de proyecto, Work/Break, start/stop, totales de hoy y log.
2. **Proyectos** – Añadir proyectos con nombre y dos colores (principal y secundario). Listado con opción de eliminar.
3. **Estadísticas** – Resumen de todos los días registrados y botón **Guardar todo en JSON** para llevarte los datos.

## Conexión con Supabase (solo HTML, CSS y JS)

**Sí, puedes conectarte a una tabla de Supabase usando solo HTML, CSS y JS**, sin subir la app a ningún sitio. Supabase ofrece un cliente JavaScript que funciona en el navegador.

1. **Incluir el cliente** en tu HTML:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```

2. **Inicializar** con la URL de tu proyecto y la clave anónima (anon key) que te da el dashboard de Supabase:
   ```javascript
   const { createClient } = supabase;
   const supabaseClient = createClient('https://TU_PROYECTO.supabase.co', 'TU_ANON_KEY');
   ```

3. **Leer/escribir** en tu tabla:
   ```javascript
   // Leer
   const { data } = await supabaseClient.from('nombre_tabla').select('*');
   // Escribir
   await supabaseClient.from('nombre_tabla').insert({ columna: 'valor' });
   ```

**Importante:** Si abres el HTML con `file://`, el navegador puede bloquear las peticiones por CORS. Para evitarlo:
- Sirve los archivos con un servidor local (por ejemplo `npx serve .` o Live Server en VS Code), o
- En el dashboard de Supabase, en Authentication → URL Configuration, añade tu origen (ej. `http://localhost:3000`) si usas autenticación.

Con eso, tu HTML/CSS/JS local puede leer y escribir en Supabase sin desplegar la app en ningún lado.

## Sincronizar datos con un JSON estático

Puedes usar un script para **descargar/salvar los datos en un JSON** y que la página estática los cargue:

1. **Exportar desde la app**: En Estadísticas, "Guardar todo en JSON" y guarda el archivo donde quieras.
2. **Llevar ese JSON al proyecto**: ejecuta (reemplaza la ruta por tu archivo):
   ```bash
   node scripts/sync-to-json.js ruta/a/project-timer-2025-02-26.json
   ```
   Eso escribe `data/store.json`.
3. **Servir la carpeta** (necesario para que `fetch('data/store.json')` funcione):
   ```bash
   npx serve .
   ```
4. En la app, pestaña **Estadísticas** → **Importar desde data/store.json**. Los datos del JSON sustituyen a los del navegador y la página se recarga.

**Opciones del script** (ver ayuda con `node scripts/sync-to-json.js --help`):
- `node scripts/sync-to-json.js <archivo.json>` — copia ese archivo a `data/store.json`.
- `node scripts/sync-to-json.js --stdin` — lee JSON por stdin y escribe en `data/store.json`.
- Con variables `SUPABASE_URL` y `SUPABASE_ANON_KEY`, el script puede descargar desde una tabla de Supabase y guardar en `data/store.json`.
