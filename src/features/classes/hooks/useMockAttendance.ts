import { useMemo, useState } from "react";

import type { AttendanceStatus } from "@/types/attendance";
import type { ClassScheduleItem } from "@/types/class";
import {
  attendanceCellKey,
  getNextAttendanceStatus,
  getRegularSessionsForWeek,
  isDateInWeek,
  parseLocalDate,
  type MakeupSessionInput,
  type WeeklySession,
} from "@/features/classes/utils/attendance";

type AttendanceState = Record<string, AttendanceStatus | undefined>;

export function useMockAttendance(weekStart: Date, scheduleItems: ClassScheduleItem[]) {
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [cancelledSessionIds, setCancelledSessionIds] = useState<string[]>([]);
  const [unlockedSessionIds, setUnlockedSessionIds] = useState<string[]>([]);
  const [makeupSessions, setMakeupSessions] = useState<WeeklySession[]>([]);

  const sessions = useMemo(() => {
    const regularSessions = getRegularSessionsForWeek(weekStart, scheduleItems);
    const visibleMakeupSessions = makeupSessions.filter((session) =>
      isDateInWeek(session.date, weekStart),
    );

    return [...regularSessions, ...visibleMakeupSessions].sort(
      (first, second) => first.date.getTime() - second.date.getTime(),
    );
  }, [makeupSessions, scheduleItems, weekStart]);

  function getStatus(sessionId: string, studentId: string) {
    return attendance[attendanceCellKey(sessionId, studentId)];
  }

  function cycleStatus(sessionId: string, studentId: string) {
    if (cancelledSessionIds.includes(sessionId) || !unlockedSessionIds.includes(sessionId)) {
      return;
    }

    setAttendance((current) => ({
      ...current,
      [attendanceCellKey(sessionId, studentId)]: getNextAttendanceStatus(
        current[attendanceCellKey(sessionId, studentId)],
      ),
    }));
  }

  function markSessionForStudents(
    sessionId: string,
    studentIds: string[],
    status: AttendanceStatus,
  ) {
    setCancelledSessionIds((current) => current.filter((id) => id !== sessionId));
    setAttendance((current) => {
      const next = { ...current };
      studentIds.forEach((studentId) => {
        next[attendanceCellKey(sessionId, studentId)] = status;
      });
      return next;
    });
  }

  function cancelSession(sessionId: string) {
    setCancelledSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );
    setUnlockedSessionIds((current) => current.filter((id) => id !== sessionId));
  }

  function toggleSessionLock(sessionId: string) {
    setCancelledSessionIds((current) => current.filter((id) => id !== sessionId));
    setUnlockedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  }

  function addMakeupSession(input: MakeupSessionInput) {
    const date = parseLocalDate(input.date);

    setMakeupSessions((current) => [
      ...current,
      {
        id: `makeup-${Date.now()}`,
        date,
        startTime: input.time || "18:00",
        endTime: input.time || "20:00",
        isMakeup: true,
        makeupForSessionId: input.makeupForSessionId,
      },
    ]);
  }

  return {
    sessions,
    cancelledSessionIds,
    unlockedSessionIds,
    getStatus,
    cycleStatus,
    markSessionForStudents,
    cancelSession,
    toggleSessionLock,
    addMakeupSession,
  };
}
