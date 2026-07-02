import { useMemo, useState } from "react";

import type { AttendanceStatus } from "@/types/attendance";
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

export function useMockAttendance(weekStart: Date) {
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [cancelledSessionIds, setCancelledSessionIds] = useState<string[]>([]);
  const [makeupSessions, setMakeupSessions] = useState<WeeklySession[]>([]);

  const sessions = useMemo(() => {
    const regularSessions = getRegularSessionsForWeek(weekStart);
    const visibleMakeupSessions = makeupSessions.filter((session) =>
      isDateInWeek(session.date, weekStart),
    );

    return [...regularSessions, ...visibleMakeupSessions].sort(
      (first, second) => first.date.getTime() - second.date.getTime(),
    );
  }, [makeupSessions, weekStart]);

  function getStatus(sessionId: string, studentId: string) {
    return attendance[attendanceCellKey(sessionId, studentId)];
  }

  function cycleStatus(sessionId: string, studentId: string) {
    if (cancelledSessionIds.includes(sessionId)) {
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
  }

  function unlockSession(sessionId: string) {
    setCancelledSessionIds((current) => current.filter((id) => id !== sessionId));
  }

  function addMakeupSession(input: MakeupSessionInput) {
    const date = parseLocalDate(input.date);

    setMakeupSessions((current) => [
      ...current,
      {
        id: `makeup-${Date.now()}`,
        date,
        time: input.time || "18:00",
        isMakeup: true,
        makeupForSessionId: input.makeupForSessionId,
      },
    ]);
  }

  return {
    sessions,
    cancelledSessionIds,
    getStatus,
    cycleStatus,
    markSessionForStudents,
    cancelSession,
    unlockSession,
    addMakeupSession,
  };
}
