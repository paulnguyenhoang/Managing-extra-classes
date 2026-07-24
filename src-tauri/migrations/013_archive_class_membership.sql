ALTER TABLE class_memberships ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class_memberships ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_class_memberships_class_archived
ON class_memberships (class_id, is_archived, status);
