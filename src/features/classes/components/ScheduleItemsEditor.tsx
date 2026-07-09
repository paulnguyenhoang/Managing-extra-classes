import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findScheduleConflicts,
  isValidTimeRange,
  weekdayOptions,
} from "@/features/classes/utils/classSchedule";
import type { ClassOverview, ClassScheduleItem, WeekdayIndex } from "@/types/class";

type ScheduleItemsEditorProps = {
  items: ClassScheduleItem[];
  onChange: (items: ClassScheduleItem[]) => void;
  idPrefix?: string;
  existingClasses?: ClassOverview[];
  ignoreClassId?: number;
};

export function ScheduleItemsEditor({
  items,
  onChange,
  idPrefix = "schedule",
  existingClasses = [],
  ignoreClassId,
}: ScheduleItemsEditorProps) {
  const selectedWeekdays = new Set(items.map((item) => item.weekday));
  const selectedItems = weekdayOptions
    .map((option) => ({
      option,
      item: items.find((item) => item.weekday === option.value),
    }))
    .filter((entry): entry is { option: (typeof weekdayOptions)[number]; item: ClassScheduleItem } =>
      Boolean(entry.item),
    );

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {weekdayOptions.map((option) => {
          const checked = selectedWeekdays.has(option.value);

          return (
            <label
              key={option.value}
              className={[
                "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                checked
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleWeekday(option.value)}
                className="size-4 accent-slate-950"
              />
              {option.label}
            </label>
          );
        })}
      </div>

      {selectedItems.length > 0 ? (
        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          {selectedItems.map(({ option, item }) => {
            const hasValidRange = isValidTimeRange(item.startTime, item.endTime);
            const conflicts = hasValidRange
              ? findScheduleConflicts({
                  scheduleItem: item,
                  classes: existingClasses,
                  ignoreClassId,
                })
              : [];
            const showAvailability = existingClasses.length > 0;

            return (
              <div
                key={option.value}
                className={[
                  "rounded-md bg-white p-2",
                  conflicts.length > 0 ? "ring-1 ring-amber-200" : "",
                ].join(" ")}
              >
                <div className="grid items-end gap-2 sm:grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)]">
                  <p className="pb-2 text-sm font-medium text-slate-950">{option.label}</p>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${idPrefix}-start-${option.value}`}>
                      Bắt đầu
                    </Label>
                    <Input
                      id={`${idPrefix}-start-${option.value}`}
                      type="time"
                      value={item.startTime}
                      onChange={(event) => updateTime(option.value, "startTime", event.target.value)}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`${idPrefix}-end-${option.value}`}>
                      Kết thúc
                    </Label>
                    <Input
                      id={`${idPrefix}-end-${option.value}`}
                      type="time"
                      value={item.endTime}
                      onChange={(event) => updateTime(option.value, "endTime", event.target.value)}
                      className="h-9 bg-white"
                    />
                  </div>
                </div>
                {showAvailability ? (
                  <ScheduleAvailabilityHint
                    hasValidRange={hasValidRange}
                    conflicts={conflicts}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          Chọn ngày học trong tuần để nhập giờ bắt đầu và kết thúc.
        </div>
      )}
    </div>
  );
}

function ScheduleAvailabilityHint({
  hasValidRange,
  conflicts,
}: {
  hasValidRange: boolean;
  conflicts: Array<{ className: string; startTime: string; endTime: string }>;
}) {
  if (!hasValidRange) {
    return (
      <p className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
        <AlertTriangle className="size-3.5 shrink-0" />
        Giờ kết thúc phải sau giờ bắt đầu.
      </p>
    );
  }

  if (conflicts.length > 0) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {conflicts.map((conflict) => (
          <span
            key={`${conflict.className}-${conflict.startTime}-${conflict.endTime}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            Trùng {conflict.className}: {conflict.startTime} - {conflict.endTime}
          </span>
        ))}
      </div>
    );
  }

  return (
    <p className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
      <CheckCircle2 className="size-3.5 shrink-0" />
      Khung giờ trống.
    </p>
  );
}
