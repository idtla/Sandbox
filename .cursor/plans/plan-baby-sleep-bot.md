# Plan único - PWA de sueño para bebé

## Visión

Construir una PWA desplegable en Cloudflare Pages que registre intentos de sueño, calcule latencia para dormirse, cierre sesiones de sueño efectivas y permita correcciones manuales. El sistema debe usar Cloudflare D1 como persistencia principal, funcionar de forma autónoma desde móvil, permitir instalación en pantalla de inicio y ofrecer temporizador visible, acciones rápidas y resumen del día.

## Objetivo funcional

- Registrar un intento de dormir.
- Marcar cuándo el bebé se duerme de verdad.
- Calcular latencia de sueño en minutos.
- Marcar despertar y calcular duración total del sueño efectivo.
- Permitir corrección manual cuando falten datos o el usuario pulse opciones fuera de secuencia.
- Preparar una arquitectura extensible para futuras variables como tomas de leche o cambio de pañal.

## Arquitectura propuesta

- `public/`: frontend PWA instalable.
- `functions/api/`: Pages Functions conectadas a D1.
- `functions/_shared/`: lógica reutilizable del sueño.
- `wrangler.jsonc`: configuración de Pages, binding D1 y variables no sensibles.
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
- [x] Implementar frontend PWA en `public/` con:
  - interfaz móvil
  - temporizador en vivo
  - acciones rápidas
  - instalación PWA
  - resumen del día
- [x] Implementar Pages Functions con:
  - acceso a D1
  - máquinas de estado del sueño
  - alta de perfil
  - edición manual
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
Eres JP y evaluador técnico. Tu función es leer README.md, conversacion.md y este plan único. Debes mantener el alcance centrado en una PWA sobre Cloudflare Pages con D1. Si detectas dudas de arquitectura o del flujo de estados, responde en conversacion.md con instrucciones claras y prioriza simplicidad, robustez y facilidad de uso desde móvil.
```

### Prompt - Agente Implementador Cloudflare

```text
Eres desarrollador Senior de Cloudflare Pages, Pages Functions y D1. Lee este plan, luego conversacion.md y el Tablón antes de tocar código. Implementa una PWA modular en JavaScript con frontend estático en `public/` y backend en `functions/`. Debe manejar alta de perfil local, estado actual, cálculo de latencia de sueño, cierre de sesión de sueño, corrección manual guiada, instalación PWA, vista responsive para móvil y persistencia en D1. Al terminar, deja un traspaso detallado en el Tablón.
```

### Prompt - Agente Base de Datos

```text
Eres especialista en D1/SQLite. Lee este plan y el Tablón antes de actuar. Debes crear el SQL de la tabla registros_sueno con los campos exigidos y proponer índices y restricciones útiles. El diseño debe permitir futuras ampliaciones como tomas o pañal sin romper la tabla principal. Documenta cualquier decisión importante en el Tablón y en conversacion.md si afecta al resto del sistema.
```

### Prompt - Agente QA / Verificación

```text
Eres QA técnico para Cloudflare Pages y D1. Lee este plan, conversacion.md y el Tablón. Verifica compilación de Pages Functions, consistencia de rutas API, robustez de la máquina de estados, manifest PWA, service worker y que no se filtren secretos en el código. Si detectas riesgos, descríbelos con pasos concretos y deja el traspaso final en el Tablón.
```

## Orden de ejecución recomendado

1. JP / Evaluador
2. Implementador Cloudflare
3. Base de Datos
4. QA / Verificación

## El Tablón

### Traspaso JP -> Implementador Cloudflare

- Estado: listo
- Solicitudes para el siguiente: crear una PWA Pages-first, mantener JavaScript ligero, usar D1 como binding `DB`, configurar timezone por defecto `Europe/Madrid` y dejar una interfaz móvil instalable.
- Información a heredar: el repositorio estaba vacío salvo README; se ha creado la rama de feature y el proyecto se está montando desde cero.

### Traspaso Implementador Cloudflare -> Agente Base de Datos

- Estado: completado
- Solicitudes para el siguiente: validar el SQL remoto antes de producción y confirmar si la tabla `perfiles_app` cubre bien el escenario de una app independiente con múltiples perfiles.
- Información a heredar: la app se ha implementado como PWA con frontend en `public/`, API en `functions/api/`, lógica en `functions/_shared/sleep-core.js`, binding `DB`, timezone configurable y flujo manual guiado desde la propia app.

### Traspaso Agente Base de Datos -> QA

- Estado: completado
- Solicitudes para el siguiente: validar consultas preparadas, restricciones y comportamiento con registros abiertos, especialmente el índice único de registro abierto por usuario y el alta de perfiles de la app.
- Información a heredar: el SQL final crea `perfiles_app` y `registros_sueno` con checks de estado y método, índices por usuario/estado/fecha y soporte para funcionamiento autónomo desde la PWA.

### Traspaso QA -> JP

- Estado: completado
- Solicitudes para el siguiente: revisar resultado final, aplicar el esquema SQL remoto y desplegar el proyecto de Pages.
- Información a heredar: las validaciones deben centrarse ahora en compilación de Pages Functions, ficheros estáticos de la PWA y consistencia del flujo manual desde la interfaz móvil. Riesgos residuales: el flujo manual sigue usando formato `HH:MM`, el service worker cubre shell offline pero no escritura offline en D1 y la tabla D1 debe existir en remoto antes de usar la app.
