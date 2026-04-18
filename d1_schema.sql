CREATE TABLE IF NOT EXISTS registros_sueno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE_DORMIR', 'DURMIENDO', 'FINALIZADO')),
  hora_intento TEXT NOT NULL,
  hora_sueno_efectivo TEXT,
  hora_despertar TEXT,
  metodo TEXT CHECK (metodo IN ('brazos', 'cuna', 'acunada')),
  user_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_estado
  ON registros_sueno (user_id, estado);

CREATE INDEX IF NOT EXISTS idx_registros_sueno_user_hora_intento
  ON registros_sueno (user_id, hora_intento);
