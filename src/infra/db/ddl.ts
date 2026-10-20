export { DDL };

/**
 * Idempotent schema bootstrap, mirrors `@/infra/db/tables`.
 * Next step: generate versioned migrations with drizzle-kit (and a pg-core copy for Postgres).
 */
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_credentials (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trivias (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous', 'user')),
  owner_user_id TEXT,
  author_name TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  CHECK ((owner_type = 'user') = (owner_user_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS trivias_owner_play_idx ON trivias (owner_type, play_count);
CREATE INDEX IF NOT EXISTS trivias_owner_created_idx ON trivias (owner_type, created_at);
CREATE INDEX IF NOT EXISTS trivias_owner_user_idx ON trivias (owner_user_id);
CREATE INDEX IF NOT EXISTS trivias_activity_idx ON trivias (owner_type, last_activity_at);
CREATE TABLE IF NOT EXISTS trivia_claims (
  trivia_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  trivia_id TEXT NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  played_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plays_trivia_idx ON plays (trivia_id);
`;
