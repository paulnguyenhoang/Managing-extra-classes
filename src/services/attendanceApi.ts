import { invoke } from "@tauri-apps/api/core";

import type {
  AttendanceSessionDto,
  AttendanceWeekDto,
  CreateClassMakeupSessionInput,
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

export function cancelAttendanceSession(sessionId: number) {
  return invoke<AttendanceSessionDto>("cancel_attendance_session", { sessionId });
}

export function restoreAttendanceSession(sessionId: number) {
  return invoke<AttendanceSessionDto>("restore_attendance_session", { sessionId });
}

export function createClassMakeupSession(input: CreateClassMakeupSessionInput) {
  return invoke<AttendanceSessionDto>("create_class_makeup_session", { request: input });
}

export function removeClassMakeupSession(makeupSessionId: number) {
  return invoke<AttendanceSessionDto>("remove_class_makeup_session", { makeupSessionId });
}
