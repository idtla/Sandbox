# ctOS — PWA de atrezzo (película)

App **de ficción** estilo *Watch Dogs / ctOS* para usar como atrezzo en rodaje.
Simula que un teléfono ha sido hackeado y queda monitorizado en segundo plano.
**No accede a nada real del dispositivo**: todos los datos (ubicación, cámara,
mensajes, contactos, batería…) son simulados.

## Qué hace en cámara
1. Pantalla con el logo ctOS → un toque para conectar (entra a pantalla completa).
2. Secuencia de intrusión tipo terminal: explotación, root, cámara/mic, payload
   residente… con efectos de glitch y vibración.
3. Cartel **"DISPOSITIVO COMPROMETIDO · ACCESO TOTAL CONCEDIDO"**.
4. Panel de control en vivo: GPS moviéndose, cámara "REC", contador de mensajes,
   contactos volcados, consola de datos exfiltrándose en tiempo real.
5. Botón **"Dejar en segundo plano"** → se minimiza a un widget flotante con
   anillo pulsante y badge "REC", para vender que sigue activo de fondo.
   Tocar el widget reabre el panel.

## Cómo usarla en rodaje
- **Directo (sin instalar nada):** abre `index.html` en el navegador del móvil.
  Funciona tal cual; el primer toque pide pantalla completa.
- **Como app instalada (opcional):** al servirla por HTTPS puedes "Añadir a
  pantalla de inicio". Es una PWA con service worker, así que también funciona
  **sin conexión** una vez cargada (útil en localizaciones sin cobertura).

### Servirla rápido en local
```bash
cd app
python3 -m http.server 8000
# abre http://<IP-del-PC>:8000 en el móvil
```

## Personalizar para tu escena
Edita el objeto `TARGET` al principio de `app.js`:
```js
const TARGET = {
  name: 'OBJETIVO_01',                 // nombre que aparece en el panel
  meta: 'IMEI 35·7782·••• · Android 14',
  lat: 40.4168, lon: -3.7038,          // coordenadas de partida del GPS
};
```
También puedes cambiar las líneas de la intrusión en el array `BOOT`.

> Software de ficción / atrezzo audiovisual. Sin funcionalidad real de acceso a
> dispositivos. Úsalo solo para producción audiovisual.
