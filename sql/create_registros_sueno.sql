PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS registros_sueno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estado TEXT NOT NULL CHECK (
    estado IN ('PENDIENTE_DORMIR', 'DURMIENDO', 'FINALIZADO')
  ),
  hora_intento TEXT NOT NULL,
  hora_sueno_efectivo TEXT,
  hora_despertar TEXT,
  metodo TEXT CHECK (
    metodo IS NULL OR metodo IN ('brazos', 'cuna', 'acunada')
  ),
  user_id INTEGER NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_id
  ON registros_sueno (user_id);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_estado
  ON registros_sueno (estado);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_estado
  ON registros_sueno (user_id, estado);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_hora_intento
  ON registros_sueno (hora_intento DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registro_abierto_por_usuario
  ON registros_sueno (
    user_id,
    CASE WHEN estado != 'FINALIZADO' THEN 1 ELSE NULL END
  );

CREATE TABLE IF NOT EXISTS perfiles_dispositivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  caregiver_name TEXT NOT NULL,
  baby_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_perfiles_dispositivo_user_id
  ON perfiles_dispositivo (user_id);
