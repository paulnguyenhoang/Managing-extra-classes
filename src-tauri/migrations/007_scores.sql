CREATE TABLE IF NOT EXISTS score_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE INDEX IF NOT EXISTS idx_score_columns_class_month
ON score_columns (class_id, month, sort_order);

CREATE TABLE IF NOT EXISTS score_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id INTEGER NOT NULL,
  membership_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  value REAL CHECK (value IS NULL OR (value >= 0 AND value <= 10)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (column_id) REFERENCES score_columns(id),
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_score_values_column_membership
ON score_values (column_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_score_values_membership
ON score_values (membership_id);
