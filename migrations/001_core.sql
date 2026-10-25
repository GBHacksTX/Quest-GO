CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY, provider_key TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, owner_id TEXT REFERENCES app_users(id), claim_hash TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, pair_key TEXT NOT NULL, detected_at BIGINT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS encounters_pair_time ON encounters(pair_key, detected_at);
CREATE TABLE IF NOT EXISTS quests (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quest_sessions (id TEXT PRIMARY KEY, encounter_id TEXT UNIQUE NOT NULL REFERENCES encounters(id), quest_id TEXT NOT NULL REFERENCES quests(id), status TEXT NOT NULL CHECK(status IN ('offer','active','completed','cancelled','expired')), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants (session_id TEXT NOT NULL REFERENCES quest_sessions(id), user_id TEXT NOT NULL REFERENCES app_users(id), accepted_at BIGINT, completed_at BIGINT, PRIMARY KEY(session_id, user_id));
