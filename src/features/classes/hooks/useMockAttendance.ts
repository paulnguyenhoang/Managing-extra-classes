import { useMemo, useState } from "react";

import type { AttendanceStatus } from "@/types/attendance";
import type { ClassScheduleItem } from "@/types/class";
import {
  attendanceCellKey,
  getRegularSessionsForWeek,
  isDateInWeek,
  parseLocalDate,
  type MakeupSessionInput,
  type StudentMakeupRecord,
  type WeeklySession,
} from "@/features/classes/utils/attendance";

type AttendanceState = Record<string, AttendanceStatus | undefined>;

let mockAttendanceState: AttendanceState = {};
let mockCancelledSessionIds: string[] = [];
let mockUnlockedSessionIds: string[] = [];
let mockMakeupSessions: WeeklySession[] = [];
const mockStudentMakeupRecords: StudentMakeupRecord[] = [];

export function useMockAttendance(weekStart: Date, scheduleItems: ClassScheduleItem[]) {
  const [attendance, setAttendance] = useState<AttendanceState>(() => ({ ...mockAttendanceState }));
  const [cancelledSessionIds, setCancelledSessionIds] = useState<string[]>(() => [
    ...mockCancelledSessionIds,
  ]);
  const [unlockedSessionIds, setUnlockedSessionIds] = useState<string[]>(() => [
    ...mockUnlockedSessionIds,
  ]);
  const [makeupSessions, setMakeupSessions] = useState<WeeklySession[]>(() => [
    ...mockMakeupSessions,
  ]);
  const [studentMakeupRecords, setStudentMakeupRecords] = useState<StudentMakeupRecord[]>(
    () => [...mockStudentMakeupRecords],
  );

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

  function setAttendanceStatus(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus | undefined,
  ) {
    if (cancelledSessionIds.includes(sessionId) || !unlockedSessionIds.includes(sessionId)) {
      return;
    }

    updateAttendance((current) => ({
      ...current,
      [attendanceCellKey(sessionId, studentId)]: status,
    }));
  }

  function getMakeupStudentStatus(sessionId: string, recordId: string) {
    return attendance[attendanceCellKey(sessionId, `makeup:${recordId}`)];
  }

  function setMakeupStudentStatus(
    sessionId: string,
    recordId: string,
    status: AttendanceStatus | undefined,
  ) {
    if (cancelledSessionIds.includes(sessionId) || !unlockedSessionIds.includes(sessionId)) {
      return;
    }

    updateAttendance((current) => ({
      ...current,
      [attendanceCellKey(sessionId, `makeup:${recordId}`)]: status,
    }));
  }

  function markSessionForStudents(
    sessionId: string,
    studentIds: string[],
    status: AttendanceStatus,
    makeupRecordIds: string[] = [],
  ) {
    if (mockCancelledSessionIds.includes(sessionId)) {
      return;
    }

    updateAttendance((current) => {
      const next = { ...current };
      studentIds.forEach((studentId) => {
        next[attendanceCellKey(sessionId, studentId)] = status;
      });
      makeupRecordIds.forEach((recordId) => {
        next[attendanceCellKey(sessionId, `makeup:${recordId}`)] = status;
      });
      return next;
    });
  }

  function cancelSession(sessionId: string) {
    updateCancelledSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );
    updateUnlockedSessionIds((current) => current.filter((id) => id !== sessionId));
  }

  function restoreCancelledSession(sessionId: string) {
    updateCancelledSessionIds((current) => current.filter((id) => id !== sessionId));
    updateUnlockedSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );
  }

  function toggleSessionLock(sessionId: string) {
    updateCancelledSessionIds((current) => current.filter((id) => id !== sessionId));
    updateUnlockedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  }

  function addMakeupSession(input: MakeupSessionInput) {
    const date = parseLocalDate(input.date);
    const sessionId = `makeup-${Date.now()}`;

    updateMakeupSessions((current) => [
      ...current,
      {
        id: sessionId,
        date,
        startTime: input.time || "18:00",
        endTime: input.time || "20:00",
        isMakeup: true,
        makeupForSessionId: input.makeupForSessionId,
      },
    ]);

    // Buổi gốc chuyển sang nghỉ và bị khóa; buổi bù mới mở khóa sẵn để điểm danh.
    updateCancelledSessionIds((current) =>
      current.includes(input.makeupForSessionId)
        ? current
        : [...current, input.makeupForSessionId],
    );
    updateUnlockedSessionIds((current) => [
      ...current.filter((id) => id !== input.makeupForSessionId),
      sessionId,
    ]);
  }

  function removeMakeupSession(sessionId: string) {
    const session = mockMakeupSessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    updateMakeupSessions((current) => current.filter((item) => item.id !== sessionId));
    updateCancelledSessionIds((current) =>
      current.filter((id) => id !== sessionId && id !== session.makeupForSessionId),
    );
    updateUnlockedSessionIds((current) => {
      const next = current.filter((id) => id !== sessionId);

      if (session.makeupForSessionId && !next.includes(session.makeupForSessionId)) {
        next.push(session.makeupForSessionId);
      }

      return next;
    });
    updateAttendance((current) => {
      const next: AttendanceState = {};

      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(`${sessionId}:`)) {
          next[key] = value;
        }
      }

      return next;
    });
  }

  function addStudentMakeupRecord(record: StudentMakeupRecord) {
    const existingIndex = mockStudentMakeupRecords.findIndex(
      (item) =>
        item.studentId === record.studentId &&
        item.originalClassId === record.originalClassId &&
        item.originalSessionId === record.originalSessionId,
    );

    if (existingIndex >= 0) {
      mockStudentMakeupRecords[existingIndex] = record;
    } else {
      mockStudentMakeupRecords.push(record);
    }

    setStudentMakeupRecords([...mockStudentMakeupRecords]);
  }

  function removeStudentMakeupRecordForOriginal({
    studentId,
    originalClassId,
    originalSessionId,
  }: {
    studentId: string;
    originalClassId: string;
    originalSessionId: string;
  }) {
    const existingRecord = mockStudentMakeupRecords.find(
      (record) =>
        record.studentId === studentId &&
        record.originalClassId === originalClassId &&
        record.originalSessionId === originalSessionId,
    );
    const nextRecords = mockStudentMakeupRecords.filter(
      (record) =>
        !(
          record.studentId === studentId &&
          record.originalClassId === originalClassId &&
          record.originalSessionId === originalSessionId
        ),
    );

    mockStudentMakeupRecords.splice(0, mockStudentMakeupRecords.length, ...nextRecords);
    setStudentMakeupRecords([...mockStudentMakeupRecords]);

    if (existingRecord) {
      updateAttendance((current) => {
        const {
          [attendanceCellKey(
            existingRecord.receivingSessionId,
            `makeup:${existingRecord.id}`,
          )]: _removed,
          ...remaining
        } = current;

        return remaining;
      });
    }
  }

  function updateAttendance(updater: (current: AttendanceState) => AttendanceState) {
    mockAttendanceState = updater(mockAttendanceState);
    setAttendance({ ...mockAttendanceState });
  }

  function updateCancelledSessionIds(updater: (current: string[]) => string[]) {
    mockCancelledSessionIds = updater(mockCancelledSessionIds);
    setCancelledSessionIds([...mockCancelledSessionIds]);
  }

  function updateUnlockedSessionIds(updater: (current: string[]) => string[]) {
    mockUnlockedSessionIds = updater(mockUnlockedSessionIds);
    setUnlockedSessionIds([...mockUnlockedSessionIds]);
  }

  function updateMakeupSessions(updater: (current: WeeklySession[]) => WeeklySession[]) {
    mockMakeupSessions = updater(mockMakeupSessions);
    setMakeupSessions([...mockMakeupSessions]);
  }

  return {
    sessions,
    allMakeupSessions: makeupSessions,
    cancelledSessionIds,
    unlockedSessionIds,
    studentMakeupRecords,
    getStatus,
    setAttendanceStatus,
    getMakeupStudentStatus,
    setMakeupStudentStatus,
    markSessionForStudents,
    cancelSession,
    restoreCancelledSession,
    toggleSessionLock,
    addMakeupSession,
    removeMakeupSession,
    addStudentMakeupRecord,
    removeStudentMakeupRecordForOriginal,
  };
}
