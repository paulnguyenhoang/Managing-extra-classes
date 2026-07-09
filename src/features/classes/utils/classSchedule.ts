import type { ClassOverview, ClassScheduleItem, WeekdayIndex } from "@/types/class";

export const weekdayOptions: Array<{ value: WeekdayIndex; label: string }> = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

export const defaultScheduleItems: ClassScheduleItem[] = [
  { weekday: 2, startTime: "18:00", endTime: "20:00" },
  { weekday: 5, startTime: "18:00", endTime: "20:00" },
];

export function weekdayName(weekday: WeekdayIndex) {
  return weekdayOptions.find((option) => option.value === weekday)?.label ?? "Thứ ?";
}

export function formatScheduleLines(items: ClassScheduleItem[]) {
  const sortedItems = sortScheduleItems(items);
  const groupedItems = sortedItems.reduce<Record<string, ClassScheduleItem[]>>((result, item) => {
    const key = `${item.startTime}-${item.endTime}`;
    result[key] = [...(result[key] ?? []), item];
    return result;
  }, {});

  return Object.values(groupedItems).map((group) => {
    const days = group.map((item) => weekdayName(item.weekday)).join(", ");
    const { startTime, endTime } = group[0];
    return `${days} - ${startTime} đến ${endTime}`;
  });
}

export function parseScheduleText(schedule: string): ClassScheduleItem[] {
  const scheduleParts = schedule
    .split(/\s*\/\s*|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parsedItems = scheduleParts.flatMap((part) => {
    const timeMatch = part.match(/(\d{1,2}:\d{2})(?:\s*đến\s*(\d{1,2}:\d{2}))?/);
    const startTime = timeMatch?.[1] ?? "18:00";
    const endTime = timeMatch?.[2] ?? defaultEndTime(startTime);
    const dayItems = weekdayOptions.filter((option) => part.includes(option.label));

    return dayItems.map((day) => ({
      weekday: day.value,
      startTime,
      endTime,
    }));
  });

  if (parsedItems.length === 0) {
    return defaultScheduleItems;
  }

  return parsedItems;
}

export function sortScheduleItems(items: ClassScheduleItem[]) {
  return [...items].sort((first, second) => {
    const firstOrder = first.weekday === 0 ? 7 : first.weekday;
    const secondOrder = second.weekday === 0 ? 7 : second.weekday;
    return firstOrder - secondOrder;
  });
}

export function findScheduleConflict({
  scheduleItems,
  classes,
  ignoreClassId,
}: {
  scheduleItems: ClassScheduleItem[];
  classes: ClassOverview[];
  ignoreClassId?: number;
}) {
  for (const item of scheduleItems) {
    for (const classItem of classes) {
      if (classItem.id === ignoreClassId) {
        continue;
      }

      const conflictItem = classItem.scheduleItems.find(
        (existingItem) =>
          existingItem.weekday === item.weekday &&
          timeRangesOverlap(
            item.startTime,
            item.endTime,
            existingItem.startTime,
            existingItem.endTime,
          ),
      );

      if (conflictItem) {
        return {
          className: classItem.name,
          weekday: item.weekday,
          startTime: conflictItem.startTime,
          endTime: conflictItem.endTime,
        };
      }
    }
  }

  return null;
}

export type ScheduleConflict = {
  className: string;
  weekday: WeekdayIndex;
  startTime: string;
  endTime: string;
};

export function findScheduleConflicts({
  scheduleItem,
  classes,
  ignoreClassId,
}: {
  scheduleItem: ClassScheduleItem;
  classes: ClassOverview[];
  ignoreClassId?: number;
}): ScheduleConflict[] {
  return classes.flatMap((classItem) => {
    if (classItem.id === ignoreClassId) {
      return [];
    }

    return classItem.scheduleItems
      .filter(
        (existingItem) =>
          existingItem.weekday === scheduleItem.weekday &&
          timeRangesOverlap(
            scheduleItem.startTime,
            scheduleItem.endTime,
            existingItem.startTime,
            existingItem.endTime,
          ),
      )
      .map((existingItem) => ({
        className: classItem.name,
        weekday: scheduleItem.weekday,
        startTime: existingItem.startTime,
        endTime: existingItem.endTime,
      }));
  });
}

export function findOneTimeScheduleConflict({
  date,
  startTime,
  endTime,
  classes,
}: {
  date: Date;
  startTime: string;
  endTime: string;
  classes: ClassOverview[];
}) {
  const weekday = date.getDay() as WeekdayIndex;

  return findScheduleConflict({
    scheduleItems: [{ weekday, startTime, endTime }],
    classes,
  });
}

export function formatScheduleConflictMessage(conflict: {
  className: string;
  weekday: WeekdayIndex;
  startTime: string;
  endTime: string;
}) {
  return `Lịch học bị trùng với ${conflict.className} (${weekdayName(conflict.weekday)} ${conflict.startTime} đến ${conflict.endTime}).`;
}

export function timeRangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  const firstStartMinute = timeToMinutes(firstStart);
  const firstEndMinute = timeToMinutes(firstEnd);
  const secondStartMinute = timeToMinutes(secondStart);
  const secondEndMinute = timeToMinutes(secondEnd);

  if (
    firstStartMinute === null ||
    firstEndMinute === null ||
    secondStartMinute === null ||
    secondEndMinute === null
  ) {
    return false;
  }

  return firstStartMinute < secondEndMinute && secondStartMinute < firstEndMinute;
}

export function isValidTimeRange(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  return start !== null && end !== null && start < end;
}

function defaultEndTime(startTime: string) {
  const [hour, minute] = startTime.split(":").map(Number);
  const endHour = Number.isFinite(hour) ? Math.min(hour + 2, 23) : 20;
  const endMinute = Number.isFinite(minute) ? minute : 0;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}
