import type { AttendanceStatus } from "@/types/attendance";
import type { ClassScheduleItem, ExtraClass } from "@/types/class";
import { parseScheduleText } from "@/features/classes/utils/classSchedule";

export type WeeklySession = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  isMakeup?: boolean;
  makeupForSessionId?: string;
};

export type MakeupSessionInput = {
  date: string;
  time: string;
  makeupForSessionId: string;
};

export type StudentMakeupRecord = {
  id: string;
  studentId: string;
  originalClassId: string;
  originalClassName: string;
  originalSessionId: string;
  originalSessionDate: string;
  originalSessionOrder: number;
  receivingClassId: string;
  receivingClassName: string;
  receivingSessionId: string;
  receivingSessionDate: string;
  receivingStartTime: string;
  receivingEndTime: string;
};

export type StudentMakeupSessionOption = {
  sessionId: string;
  classId: string;
  className: string;
  date: Date;
  startTime: string;
  endTime: string;
};

export const attendanceCycle: Array<AttendanceStatus | undefined> = [
  undefined,
  "present",
  "absent",
  "makeup",
];

export const makeupStudentAttendanceCycle: Array<AttendanceStatus | undefined> = [
  undefined,
  "present",
  "absent",
];

export function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, diff));
}

export function getWeekEnd(weekStart: Date) {
  return addDays(weekStart, 6);
}

export function isSameDay(first: Date, second: Date) {
  return startOfDay(first).getTime() === startOfDay(second).getTime();
}

export function isDateInWeek(date: Date, weekStart: Date) {
  const normalizedDate = startOfDay(date).getTime();
  const start = startOfDay(weekStart).getTime();
  const end = getWeekEnd(weekStart).getTime();

  return normalizedDate >= start && normalizedDate <= end;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateRange(start: Date, end: Date) {
  return `${formatFullDate(start)} - ${formatFullDate(end)}`;
}

export function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function weekdayLabel(date: Date) {
  const labels = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return labels[date.getDay()];
}

export function isPastDate(date: Date, today = new Date()) {
  return startOfDay(date).getTime() < startOfDay(today).getTime();
}

export function isStudyDay(date: Date, scheduleItems: ClassScheduleItem[]) {
  return scheduleItems.some((item) => item.weekday === date.getDay());
}

export function getRegularSessionsForWeek(
  weekStart: Date,
  scheduleItems: ClassScheduleItem[],
): WeeklySession[] {
  return scheduleItems
    .map((item) => {
      const dayIndex = item.weekday === 0 ? 7 : item.weekday;
      const date = addDays(weekStart, dayIndex - 1);

      return {
        id: `regular-${toDateKey(date)}-${item.startTime}-${item.endTime}`,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
      };
    })
    .sort((first, second) => first.date.getTime() - second.date.getTime());
}

export function getNextAttendanceStatus(status: AttendanceStatus | undefined) {
  const currentIndex = attendanceCycle.indexOf(status);
  const nextIndex = (currentIndex + 1) % attendanceCycle.length;

  return attendanceCycle[nextIndex];
}

export function getNextMakeupStudentAttendanceStatus(status: AttendanceStatus | undefined) {
  const currentIndex = makeupStudentAttendanceCycle.indexOf(status);
  const nextIndex = (currentIndex + 1) % makeupStudentAttendanceCycle.length;

  return makeupStudentAttendanceCycle[nextIndex];
}

export function attendanceCellKey(sessionId: string, studentId: string) {
  return `${sessionId}:${studentId}`;
}

export function getSessionOrderInWeek(session: WeeklySession, sessions: WeeklySession[]) {
  const regularSessions = sessions
    .filter((item) => !item.isMakeup)
    .sort((first, second) => first.date.getTime() - second.date.getTime());
  const index = regularSessions.findIndex((item) => item.id === session.id);

  return index >= 0 ? index + 1 : 1;
}

export function getEligibleStudentMakeupSessions({
  sourceClassId,
  sourceSession,
  sourceSessions,
  weekStart,
  classes,
}: {
  sourceClassId: string;
  sourceSession: WeeklySession;
  sourceSessions: WeeklySession[];
  weekStart: Date;
  classes: ExtraClass[];
}): StudentMakeupSessionOption[] {
  const sourceOrder = getSessionOrderInWeek(sourceSession, sourceSessions);
  const sourceClass = classes.find((classItem) => classItem.id === sourceClassId);

  return classes
    .filter(
      (classItem) =>
        classItem.id !== sourceClassId &&
        classItem.academicYearId === sourceClass?.academicYearId,
    )
    .flatMap((classItem) => {
      const classSessions = getRegularSessionsForWeek(
        weekStart,
        parseScheduleText(classItem.schedule),
      );
      const matchingSession = classSessions[sourceOrder - 1];

      if (!matchingSession) {
        return [];
      }

      return [
        {
          sessionId: matchingSession.id,
          classId: classItem.id,
          className: classItem.name,
          date: matchingSession.date,
          startTime: matchingSession.startTime,
          endTime: matchingSession.endTime,
        },
      ];
    });
}
