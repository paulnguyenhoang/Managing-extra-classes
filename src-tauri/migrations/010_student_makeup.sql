CREATE TABLE IF NOT EXISTS student_makeup_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  original_membership_id INTEGER NOT NULL,
  original_class_id INTEGER NOT NULL,
  original_session_id INTEGER NOT NULL,
  receiving_class_id INTEGER NOT NULL,
  receiving_session_id INTEGER NOT NULL,
  session_index_in_week INTEGER NOT NULL,
  receiving_attendance_status TEXT CHECK (
    receiving_attendance_status IS NULL OR receiving_attendance_status IN ('present', 'absent')
  ),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (original_membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (original_class_id) REFERENCES classes(id),
  FOREIGN KEY (original_session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (receiving_class_id) REFERENCES classes(id),
  FOREIGN KEY (receiving_session_id) REFERENCES attendance_sessions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_makeup_student_original_session
ON student_makeup_records (student_id, original_session_id);

CREATE INDEX IF NOT EXISTS idx_student_makeup_receiving
ON student_makeup_records (receiving_class_id, receiving_session_id);

CREATE INDEX IF NOT EXISTS idx_student_makeup_original_session
ON student_makeup_records (original_session_id);

CREATE INDEX IF NOT EXISTS idx_student_makeup_original_membership
ON student_makeup_records (original_membership_id);
