-- Migracion para activar OTP + familia en una base ya existente.
-- Ejecuta una vez:
-- npx wrangler d1 execute sueno --remote --file=./schema_auth_family.sql

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  otp_case TEXT NOT NULL CHECK (otp_case IN ('login', 'register', 'invite')),
  invite_code TEXT,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(created_by) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS family_members (
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'caregiver')),
  status TEXT NOT NULL CHECK (status IN ('active', 'pending')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (family_id, user_id),
  FOREIGN KEY(family_id) REFERENCES families(id),
  FOREIGN KEY(user_id) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS family_invites (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  invite_email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('caregiver')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  accepted_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(family_id) REFERENCES families(id),
  FOREIGN KEY(invited_by) REFERENCES app_users(id),
  FOREIGN KEY(accepted_by) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_challenges(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
