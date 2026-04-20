-- Ejecutar una vez si tu tabla sleep_episodes ya existía sin esta columna:
-- npx wrangler d1 execute sueno --remote --file=./schema_patch_recorded_by.sql

ALTER TABLE sleep_episodes ADD COLUMN recorded_by TEXT;
