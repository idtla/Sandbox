# remote-shell — PWA de atrezzo (película)

App **de ficción** que simula una **sesión adb/shell remota** sobre un móvil Android.
Pensada como atrezzo en rodaje: parece una terminal real, no un HUD de videojuego.
**No accede a nada real del dispositivo**: todos los datos son simulados.

## Qué hace en cámara
1. Pantalla de arranque con prompt `adb connect …` → un toque inicia la sesión (pantalla completa).
2. Secuencia de boot tipo terminal: `adb shell`, `getprop`, `dumpsys`, `content query`…
   sin flashes, glitches ni vibraciones.
3. Mensaje breve de sesión establecida (`session id: …`) y transición al panel.
4. Panel de monitorización sobrio: GPS, cámara, audio, contadores… con consola
   `tail -f` de logs con timestamps.
5. Botón **detach session (background)** → widget flotante mínimo con badge `rec`.

## Cómo usarla en rodaje
- **Directo (sin instalar nada):** abre `index.html` en el navegador del móvil.
- **Como app instalada (opcional):** servir por HTTPS y "Añadir a pantalla de inicio".
  PWA con service worker → funciona **sin conexión** una vez cargada.

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
  host: '192.168.43.127',
  port: 5555,
  device: 'SM-G991B',
  serial: 'R5CR90XXXX',
  android: '14',
  imei: '357782012345678',
  name: 'u0_a142',
  lat: 40.4168, lon: -3.7038,
};
```
También puedes cambiar las líneas de boot en el array `BOOT`.

> Software de ficción / atrezzo audiovisual. Sin funcionalidad real de acceso a
> dispositivos. Úsalo solo para producción audiovisual.
