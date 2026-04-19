-- Esquema app sueño bebé. Sustituye tablas anteriores si existían en la misma D1.

DROP TABLE IF EXISTS sleep_episodes;

CREATE TABLE sleep_episodes (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  try_start_at INTEGER NOT NULL,
  asleep_at INTEGER,
  wake_at INTEGER,
  location TEXT NOT NULL CHECK (location IN ('cuna', 'acunada')),
  source TEXT NOT NULL CHECK (source IN ('timer', 'manual')),
  cancelled INTEGER NOT NULL DEFAULT 0 CHECK (cancelled IN (0, 1))
);

CREATE INDEX idx_sleep_episodes_try_start ON sleep_episodes(try_start_at);
CREATE INDEX idx_sleep_episodes_wake ON sleep_episodes(wake_at);
