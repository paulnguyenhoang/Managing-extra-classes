import { invoke } from "@tauri-apps/api/core";

import type {
  AttendanceSessionDto,
  AttendanceWeekDto,
  SetAttendanceStatusInput,
} from "@/types/attendance";

export function getAttendanceWeek(classId: number, weekStart: string) {
  return invoke<AttendanceWeekDto>("get_attendance_week", { classId, weekStart });
}

export function setAttendanceStatus(input: SetAttendanceStatusInput) {
  return invoke<void>("set_attendance_status", { request: input });
}

export function toggleAttendanceLock(sessionId: number, isLocked: boolean) {
  return invoke<AttendanceSessionDto>("toggle_attendance_lock", {
    request: { sessionId, isLocked },
  });
}

export function markSessionPresent(sessionId: number) {
  return invoke<void>("mark_session_present", { sessionId });
}
