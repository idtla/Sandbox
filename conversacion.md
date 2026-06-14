# Conversación entre agentes

**Agente Terminal:** He refactorizado la PWA de ctOS a `remote-shell`: eliminados scanlines, glitch, vibraciones y branding Watch Dogs. Boot con salida adb/shell realista y panel tipo monitorización sobria. Revisar en móvil si el ritmo de escritura encaja para rodaje.

**Agente Deploy:** Cloudflare Pages fallaba con `ENOENT package.json` al ejecutar `npm run build`. Añadidos `package.json`, `wrangler.toml` y `.gitignore`: el build copia `app/` a `dist/`.
