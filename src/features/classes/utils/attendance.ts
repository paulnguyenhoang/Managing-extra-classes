import type { ClassScheduleItem } from "@/types/class";

export type WeeklySession = {
  id: string;
  classId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  isMakeup?: boolean;
  makeupForSessionId?: string;
};

export type MakeupSessionInput = {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  makeupForSessionId: string;
};

export type StudentMakeupRecord = {
  id: string;
  studentId: string;
  studentName?: string;
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

export function getMakeupSessionInputError({
  date,
  startTime,
  endTime,
  makeupForSessionId,
  existingMakeupSessions,
  classId,
  today,
}: {
  date: string;
  startTime: string;
  endTime: string;
  makeupForSessionId: string;
  existingMakeupSessions: WeeklySession[];
  classId: string;
  today: Date;
}): string | null {
  if (!makeupForSessionId) {
    return "Vui lòng chọn buổi cần học bù.";
  }

  if (!date) {
    return "Vui lòng chọn ngày học bù.";
  }

  if (!startTime || !endTime || startTime >= endTime) {
    return "Giờ kết thúc phải sau giờ bắt đầu.";
  }

  const parsedDate = parseLocalDate(date);

  if (parsedDate.getTime() <= startOfDay(today).getTime()) {
    return "Ngày học bù phải sau ngày hôm nay.";
  }

  if (
    existingMakeupSessions.some(
      (session) =>
        session.classId === classId &&
        isSameDay(session.date, parsedDate) &&
        timeRangesOverlap(startTime, endTime, session.startTime, session.endTime),
    )
  ) {
    return "Đã có buổi học bù trùng giờ vào ngày này.";
  }

  return null;
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

function timeRangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

