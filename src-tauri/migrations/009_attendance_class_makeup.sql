CREATE INDEX IF NOT EXISTS idx_attendance_sessions_makeup_for_session
ON attendance_sessions (makeup_for_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_unique_class_makeup
ON attendance_sessions (makeup_for_session_id, type)
WHERE type = 'class_makeup';
