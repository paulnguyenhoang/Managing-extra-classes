CREATE TABLE IF NOT EXISTS student_makeup_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  original_membership_id INTEGER NOT NULL,
  original_class_id INTEGER NOT NULL,
  receiving_class_id INTEGER NOT NULL,
  start_original_session_id INTEGER NOT NULL,
  start_receiving_session_id INTEGER NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'weekly' CHECK (recurrence = 'weekly'),
  ended_before_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (original_membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (original_class_id) REFERENCES classes(id),
  FOREIGN KEY (receiving_class_id) REFERENCES classes(id),
  FOREIGN KEY (start_original_session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (start_receiving_session_id) REFERENCES attendance_sessions(id)
);

ALTER TABLE student_makeup_records ADD COLUMN series_id INTEGER
  REFERENCES student_makeup_series(id);

CREATE INDEX IF NOT EXISTS idx_student_makeup_series_occurrences
ON student_makeup_records (series_id, original_session_id);

CREATE INDEX IF NOT EXISTS idx_student_makeup_series_membership
ON student_makeup_series (original_membership_id, created_at);
