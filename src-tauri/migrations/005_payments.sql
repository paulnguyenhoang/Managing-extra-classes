CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid', 'waived')),
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_membership_month
ON payments (membership_id, month);

CREATE INDEX IF NOT EXISTS idx_payments_class_month
ON payments (class_id, month);
