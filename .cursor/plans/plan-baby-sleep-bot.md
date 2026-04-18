# Plan único - Bot de sueño para bebé

## Visión

Construir un bot de Telegram desplegable en Cloudflare Workers que registre intentos de sueño, calcule latencia para dormirse, cierre sesiones de sueño efectivas y permita correcciones manuales. El sistema debe usar Cloudflare D1 como persistencia principal, responder rápido desde el webhook y ofrecer además una vista web responsive para móvil con temporizador visible y resumen del día.

## Objetivo funcional

- Registrar un intento de dormir.
- Marcar cuándo el bebé se duerme de verdad.
- Calcular latencia de sueño en minutos.
- Marcar despertar y calcular duración total del sueño efectivo.
- Permitir corrección manual cuando falten datos o el usuario pulse opciones fuera de secuencia.
- Preparar una arquitectura extensible para futuras variables como tomas de leche o cambio de pañal.

## Arquitectura propuesta

- `worker.js`: único entrypoint del Worker.
- `wrangler.jsonc`: configuración del Worker, binding D1 y variables no sensibles.
- `sql/create_registros_sueno.sql`: esquema SQL de la tabla principal y sus índices.
- `conversacion.md`: hilo de trabajo entre agentes.
- `README.md`: guía de despliegue, secretos y uso.

## Tareas por agente

### Agente Evaluador / JP

- [x] Leer el contexto del repositorio.
- [x] Crear este plan único.
- [x] Crear `conversacion.md`.
- [x] Definir la arquitectura y el alcance.
- [ ] Revisar el tablón tras el trabajo técnico si hubiera relevo.

### Agente Implementador Cloudflare

- [x] Leer este plan.
- [x] Leer `conversacion.md`.
- [x] Implementar `worker.js` con:
  - webhook de Telegram
  - rutas web responsive
  - acceso a D1
  - máquinas de estado del sueño
  - flujo manual guiado
- [x] Añadir validaciones y respuestas de error seguras.
- [x] Rellenar el tablón al terminar.

### Agente Base de Datos

- [x] Leer este plan.
- [x] Leer el tablón antes de actuar.
- [x] Crear el SQL de `registros_sueno`.
- [x] Garantizar índices útiles para consultas por usuario y registros abiertos.
- [x] Dejar observaciones de extensibilidad para futuras tablas relacionadas.
- [x] Rellenar el tablón al terminar.

### Agente QA / Verificación

- [x] Leer este plan.
- [x] Leer `conversacion.md`.
- [x] Ejecutar validaciones no destructivas (`wrangler deploy --dry-run` y revisión de sintaxis).
- [x] Verificar mensajes y transiciones clave.
- [x] Anotar límites o riesgos operativos.
- [x] Rellenar el tablón al terminar.

## Prompts embebidos

### Prompt - Agente Evaluador / JP

```text
Eres JP y evaluador técnico. Tu función es leer README.md, conversacion.md y este plan único. Debes mantener el alcance centrado en un bot de Telegram sobre Cloudflare Workers con D1. Si detectas dudas de arquitectura o del flujo de estados, responde en conversacion.md con instrucciones claras y prioriza simplicidad, robustez y facilidad de uso desde móvil.
```

### Prompt - Agente Implementador Cloudflare

```text
Eres desarrollador Senior de Cloudflare Workers y Telegram API. Lee este plan, luego conversacion.md y el Tablón antes de tocar código. Implementa un Worker modular en JavaScript con fetch nativo, sin dependencias pesadas de bot framework. Debe manejar webhook de Telegram, ReplyKeyboardMarkup dinámica por estado, cálculo de latencia de sueño, cierre de sesión de sueño, corrección manual guiada, vista web responsive para móvil y persistencia en D1. Al terminar, deja un traspaso detallado en el Tablón.
```

### Prompt - Agente Base de Datos

```text
Eres especialista en D1/SQLite. Lee este plan y el Tablón antes de actuar. Debes crear el SQL de la tabla registros_sueno con los campos exigidos y proponer índices y restricciones útiles. El diseño debe permitir futuras ampliaciones como tomas o pañal sin romper la tabla principal. Documenta cualquier decisión importante en el Tablón y en conversacion.md si afecta al resto del sistema.
```

### Prompt - Agente QA / Verificación

```text
Eres QA técnico para Cloudflare Workers. Lee este plan, conversacion.md y el Tablón. Verifica despliegue en seco, consistencia de rutas, respuestas del webhook, robustez de la máquina de estados y que no se filtren secretos en el código. Si detectas riesgos, descríbelos con pasos concretos y deja el traspaso final en el Tablón.
```

## Orden de ejecución recomendado

1. JP / Evaluador
2. Implementador Cloudflare
3. Base de Datos
4. QA / Verificación

## El Tablón

### Traspaso JP -> Implementador Cloudflare

- Estado: listo
- Solicitudes para el siguiente: crear el Worker desde cero, mantener fetch nativo, usar D1 como binding `DB`, configurar timezone por defecto `Europe/Madrid` y dejar una vista web responsive mínima.
- Información a heredar: el repositorio estaba vacío salvo README; se ha creado la rama de feature y el proyecto se está montando desde cero.

### Traspaso Implementador Cloudflare -> Agente Base de Datos

- Estado: completado
- Solicitudes para el siguiente: validar el SQL remoto antes de producción y confirmar si el tipo definitivo de `user_id` debe mantenerse como INTEGER para alinearlo con Telegram a largo plazo.
- Información a heredar: el Worker se ha implementado en `worker.js` con rutas `POST /telegram/webhook`, `GET /`, `GET /api/status` y `POST /api/action`; se usa `fetch` nativo, D1 binding `DB`, timezone configurable y flujo manual guiado persistido en `bot_contexto_usuario`.

### Traspaso Agente Base de Datos -> QA

- Estado: completado
- Solicitudes para el siguiente: validar consultas preparadas, restricciones y comportamiento con registros abiertos, especialmente el índice único de registro abierto por usuario y la tabla auxiliar de contexto del bot.
- Información a heredar: el SQL final crea `registros_sueno` con checks de estado y método, índices por usuario/estado/fecha y `bot_contexto_usuario` para sostener el flujo manual y las correcciones paso a paso.

### Traspaso QA -> JP

- Estado: completado
- Solicitudes para el siguiente: revisar resultado final, aplicar secretos reales y registrar el webhook de Telegram en Cloudflare una vez desplegado.
- Información a heredar: las validaciones han pasado con `node --check worker.js` y `wrangler deploy --dry-run`; no se han arrancado servidores locales. Riesgos residuales: el flujo manual asume formato `HH:MM`, la vista web requiere `user_id` conocido y la tabla D1 debe existir en remoto antes de usar el bot.
