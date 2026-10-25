-- New account credentials only; existing users, evidence and external datasets stay intact.
CREATE TABLE IF NOT EXISTS questgo_password_accounts (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS questgo_login_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS questgo_sessions_user ON questgo_login_sessions(user_id);
