-- Migration 0001: initial schema
-- Idempotent so it stays consistent whether applied via the D1 HTTP API or
-- `wrangler d1 migrations apply opencut-web-db --remote`.

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO app_meta (key, value, updated_at)
  VALUES ('schema_version', '1', strftime('%s', 'now'));
