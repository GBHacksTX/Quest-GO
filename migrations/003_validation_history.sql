-- Additive evidence tables: existing photo rows and completed activities are preserved.
CREATE TABLE IF NOT EXISTS questgo_photo_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  content TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 2097152),
  criteria_json TEXT NOT NULL,
  uploaded_at BIGINT NOT NULL,
  UNIQUE(session_id, user_id, revision),
  FOREIGN KEY(session_id, user_id) REFERENCES participants(session_id, user_id)
);
CREATE TABLE IF NOT EXISTS questgo_photo_validations (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES questgo_photo_submissions(id),
  ordinal INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','error')),
  checked_at BIGINT NOT NULL,
  data TEXT NOT NULL,
  UNIQUE(photo_id, ordinal)
);
CREATE TABLE IF NOT EXISTS questgo_achievements (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL REFERENCES quest_sessions(id),
  completed_at BIGINT NOT NULL,
  evidence_json TEXT NOT NULL
);
