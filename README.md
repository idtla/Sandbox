# mail-mcp

Servidor MCP local (stdio) que da a Claude acceso de lectura y clasificación sobre varias cuentas de correo a la vez (Gmail + IONOS) vía IMAP, con cache en SQLite.

**Qué hace**: "resúmeme lo que ha entrado hoy y dime qué requiere respuesta", "clasifica esto como facturas" (aplica la etiqueta `AI/facturas-recibos` en Gmail de verdad), "busca los correos del banco con adjuntos".

**Qué no hace, por construcción**: enviar, borrar o crear reglas. La única superficie de escritura del código ([src/imap/actions.ts](src/imap/actions.ts)) se limita a: flag `\Seen`, etiquetas Gmail derivadas de la taxonomía, `messageMove` a carpetas de la taxonomía y creación de esas etiquetas/carpetas.

## Seguridad de credenciales

Nada sensible vive en este repo ni en Documents:

- `%LOCALAPPDATA%\mail-mcp\profiles.json` — cuentas y app passwords (revocables individualmente; solo dan acceso IMAP).
- `%LOCALAPPDATA%\mail-mcp\mail.db` — cache SQLite (contiene cuerpos de correos).

En el repo solo hay código y [imap.profiles.example.json](imap.profiles.example.json) (plantilla sin secretos).

## Puesta en marcha

1. Activa 2FA en cada cuenta Google y genera una **app password** por cuenta (myaccount.google.com → Seguridad → Contraseñas de aplicaciones). En IONOS vale la contraseña del buzón.
2. Rellena `%LOCALAPPDATA%\mail-mcp\profiles.json` (ya creado desde la plantilla).
3. Compila y registra:

```powershell
npm install
npm run build
claude mcp add mail -s user -- node --no-warnings=ExperimentalWarning C:\Users\idtla\Documents\Sandbox-2\dist\index.js
```

## Tools

| Tool | Qué hace |
|---|---|
| `mail_list_accounts` | Cuentas configuradas + contadores de cache |
| `mail_list_inbox` | Bandeja unificada (filtros: cuenta, no leídos, fechas, texto, clase). Sincroniza antes con throttle de 60 s |
| `mail_get_message` | Correo completo en texto limpio (sin firmas/citas; `raw` para verlo entero) |
| `mail_search_gmail` | Búsqueda con sintaxis nativa Gmail (`from:banco has:attachment newer_than:7d`) |
| `mail_classify` | Asigna una clase de la taxonomía; en Gmail aplica la etiqueta `AI/<clase>` sin sacar el correo del INBOX |
| `mail_mark_read` | Marca leído/no leído |

Taxonomía por defecto (editable en `profiles.json`): accion-requerida, facturas-recibos, citas-eventos, personal, newsletters, notificaciones-automaticas, promociones, spam-sospechoso.

## Desarrollo

```powershell
npx tsx scripts/smoke.ts          # tests sin credenciales (normalize + SQLite)
npx tsx scripts/try.ts config     # ver config cargada (pass ofuscada)
npx tsx scripts/try.ts connect gmail-personal   # probar conexión real
npx tsx scripts/try.ts sync                     # sync de todas las cuentas
npm run inspector                 # MCP Inspector sobre dist/
```

Alcance v1: solo INBOX, ventana de 90 días (`sync.windowDays`). Sync incremental por `UIDVALIDITY` + último UID visto, con reconciliación de leídos/borrados en cada pasada.
