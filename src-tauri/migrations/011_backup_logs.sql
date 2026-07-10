CREATE TABLE backup_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('backup', 'restore')),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_backup_logs_action_status
ON backup_logs (action, status, id);
