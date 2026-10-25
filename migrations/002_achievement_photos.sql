CREATE TABLE IF NOT EXISTS achievement_photos (
  id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 2097152),
  uploaded_at BIGINT NOT NULL,
  PRIMARY KEY(session_id, user_id),
  FOREIGN KEY(session_id, user_id) REFERENCES participants(session_id, user_id)
);
-- Unfinished activities must confirm again after adding their newly required photos.
-- Already completed history and its streak credit remain unchanged.
UPDATE participants SET completed_at = NULL
WHERE session_id IN (SELECT id FROM quest_sessions WHERE status = 'active');
