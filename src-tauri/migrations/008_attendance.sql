CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  session_index_in_week INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'class_makeup')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  is_locked INTEGER NOT NULL DEFAULT 1 CHECK (is_locked IN (0, 1)),
  makeup_for_session_id INTEGER,
  content TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (makeup_for_session_id) REFERENCES attendance_sessions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_regular_identity
ON attendance_sessions (class_id, session_date, session_index_in_week, type)
WHERE type = 'regular';

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date
ON attendance_sessions (class_id, session_date);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  membership_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'makeup')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_session_membership
ON attendance_records (session_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_membership
ON attendance_records (membership_id);
