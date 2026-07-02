-- guide_docs: the "Ultron Guides" store (D1). One row per guide.
-- Lives in the D1 database bound as VAULT_DB (database name: opencut-vault).
-- Rows are private per-user: the reader filters by owner = <better-auth user.id>.

CREATE TABLE IF NOT EXISTS guide_docs (
  id          TEXT PRIMARY KEY,   -- "guide-<slug>"
  owner       TEXT NOT NULL,      -- better-auth user.id of the owner (app-specific, see README)
  slug        TEXT NOT NULL,      -- url-safe slug, unique per owner
  title       TEXT NOT NULL,
  topic       TEXT,               -- one of: productivity, marketing, building, career, power, design, start, life, content
  tool        TEXT,               -- always "ultron" for reframed guides
  source      TEXT,               -- original source url (provenance only)
  body        TEXT NOT NULL,      -- guide markdown-subset body incl. ```embed blocks (see README)
  status      TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | rejected
  sort_order  INTEGER,            -- list order (ASC)
  created_at  INTEGER NOT NULL,   -- epoch ms
  updated_at  INTEGER             -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_guide_docs_owner ON guide_docs (owner, sort_order, created_at);
