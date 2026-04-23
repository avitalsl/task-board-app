-- Gamified task board — backend schema.
--
-- Apply once to Neon via:   psql "$DATABASE_URL" -f server/storage/schema.sql
-- (or paste into the Neon SQL editor).
--
-- Single-table design: the full board state lives in a JSONB column.
-- Leaves room to normalize later (e.g. extract `tasks` to its own table) without
-- reshaping the client/server contract upstream.

CREATE TABLE IF NOT EXISTS boards (
  owner_key    TEXT PRIMARY KEY,
  share_token  TEXT UNIQUE,
  state        JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS boards_share_token_idx
  ON boards (share_token)
  WHERE share_token IS NOT NULL;
