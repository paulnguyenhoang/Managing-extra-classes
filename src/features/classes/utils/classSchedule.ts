import type { ClassScheduleItem, WeekdayIndex } from "@/types/class";

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

function defaultEndTime(startTime: string) {
  const [hour, minute] = startTime.split(":").map(Number);
  const endHour = Number.isFinite(hour) ? Math.min(hour + 2, 23) : 20;
  const endMinute = Number.isFinite(minute) ? minute : 0;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}
