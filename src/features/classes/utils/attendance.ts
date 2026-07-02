import type { AttendanceStatus } from "@/types/attendance";

export type WeeklySession = {
  id: string;
  date: Date;
  time: string;
  isMakeup?: boolean;
  makeupForSessionId?: string;
};

export type MakeupSessionInput = {
  date: string;
  time: string;
  makeupForSessionId: string;
};

const studyDayIndexes = [2, 4];

export const attendanceCycle: Array<AttendanceStatus | undefined> = [
  undefined,
  "present",
  "absent",
  "excused",
  "makeup",
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

export function isStudyDay(date: Date) {
  return studyDayIndexes.includes(date.getDay());
}

export function getRegularSessionsForWeek(weekStart: Date): WeeklySession[] {
  return studyDayIndexes.map((dayIndex) => {
    const date = addDays(weekStart, dayIndex - 1);

    return {
      id: `regular-${toDateKey(date)}`,
      date,
      time: "18:00",
    };
  });
}

export function getNextAttendanceStatus(status: AttendanceStatus | undefined) {
  const currentIndex = attendanceCycle.indexOf(status);
  const nextIndex = (currentIndex + 1) % attendanceCycle.length;

  return attendanceCycle[nextIndex];
}

export function attendanceCellKey(sessionId: string, studentId: string) {
  return `${sessionId}:${studentId}`;
}
