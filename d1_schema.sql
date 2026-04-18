CREATE TABLE IF NOT EXISTS registros_sueno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE_DORMIR', 'DURMIENDO', 'FINALIZADO')),
  hora_intento TEXT NOT NULL,
  hora_sueno_efectivo TEXT,
  hora_despertar TEXT,
  metodo TEXT CHECK (metodo IN ('brazos', 'cuna', 'acunada')),
  user_id TEXT NOT NULL CHECK (user_id IN ('PAPA', 'MAMA'))
);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_estado ON registros_sueno (user_id, estado);
CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_hora_intento ON registros_sueno (user_id, hora_intento);

CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  father_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  baby_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens (expires_at);
