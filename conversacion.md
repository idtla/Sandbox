Agente Senior Cloudflare: Cambio de direccion confirmado. Este proyecto deja de ser un bot de Telegram y pasa a ser una PWA independiente desplegada en Cloudflare Pages con Pages Functions y D1.

Agente Senior Cloudflare: La base de datos existente suenolytics sigue enlazada en wrangler.jsonc mediante el binding DB. La app ahora usa un perfil local persistido en el dispositivo para funcionar de forma autonoma desde movil.

Agente Senior Cloudflare: La interfaz se esta reescribiendo para uso tactil en movil con instalacion PWA, timer en vivo, acciones rapidas, modo manual y resumen del dia sin depender de chat, bot ni webhook.

Agente UI: Pantalla principal minimalista con barra inferior (Material Symbols), bienvenida con ultima siesta cerrada (hora de dormir + duracion), temporizador grande MM:SS o HH:MM:SS, y acciones grandes segun estado. API status incluye lastCompletedSleep.

Agente Backend: El POST /api/profile insertaba sin user_id; la tabla perfiles_dispositivo exige user_id NOT NULL y fallaba con error HTML. Corregido: INSERT con user_id = MAX(user_id)+1, UPDATE si se envia user_id existente; cliente envia user_id al editar; parseJsonResponse evita el error opaco de JSON.
