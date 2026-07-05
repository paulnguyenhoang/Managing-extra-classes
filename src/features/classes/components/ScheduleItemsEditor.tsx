import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekdayOptions } from "@/features/classes/utils/classSchedule";
import type { ClassScheduleItem, WeekdayIndex } from "@/types/class";

type ScheduleItemsEditorProps = {
  items: ClassScheduleItem[];
  onChange: (items: ClassScheduleItem[]) => void;
  idPrefix?: string;
};

export function ScheduleItemsEditor({
  items,
  onChange,
  idPrefix = "schedule",
}: ScheduleItemsEditorProps) {
  const selectedWeekdays = new Set(items.map((item) => item.weekday));

  function toggleWeekday(weekday: WeekdayIndex) {
    if (items.some((item) => item.weekday === weekday)) {
      onChange(items.filter((item) => item.weekday !== weekday));
      return;
    }

    onChange([...items, { weekday, startTime: "18:00", endTime: "20:00" }]);
  }

  function updateTime(weekday: WeekdayIndex, field: "startTime" | "endTime", value: string) {
    onChange(items.map((item) => (item.weekday === weekday ? { ...item, [field]: value } : item)));
  }

  return (
    <div className="space-y-3">
      {weekdayOptions.map((option) => {
        const scheduleItem = items.find((item) => item.weekday === option.value);
        const checked = selectedWeekdays.has(option.value);

        return (
          <div
            key={option.value}
            className="grid gap-3 rounded-lg border bg-white p-3 sm:grid-cols-[140px_1fr_1fr]"
          >
            <label className="flex items-center gap-2 font-medium text-slate-950">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleWeekday(option.value)}
                className="size-4 accent-slate-950"
              />
              {option.label}
            </label>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-start-${option.value}`}>Bắt đầu</Label>
              <Input
                id={`${idPrefix}-start-${option.value}`}
                type="time"
                value={scheduleItem?.startTime ?? "18:00"}
                disabled={!checked}
                onChange={(event) => updateTime(option.value, "startTime", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-end-${option.value}`}>Kết thúc</Label>
              <Input
                id={`${idPrefix}-end-${option.value}`}
                type="time"
                value={scheduleItem?.endTime ?? "20:00"}
                disabled={!checked}
                onChange={(event) => updateTime(option.value, "endTime", event.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
