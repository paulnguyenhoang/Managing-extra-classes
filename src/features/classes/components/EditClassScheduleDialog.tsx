import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekdayOptions } from "@/features/classes/utils/classSchedule";
import type { ClassScheduleItem, WeekdayIndex } from "@/types/class";

type EditClassScheduleDialogProps = {
  scheduleItems: ClassScheduleItem[];
  onSave: (scheduleItems: ClassScheduleItem[]) => void;
};

export function EditClassScheduleDialog({
  scheduleItems,
  onSave,
}: EditClassScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<ClassScheduleItem[]>(scheduleItems);
  const selectedWeekdays = new Set(draftItems.map((item) => item.weekday));

  useEffect(() => {
    if (open) {
      setDraftItems(scheduleItems);
    }
  }, [open, scheduleItems]);

  function toggleWeekday(weekday: WeekdayIndex) {
    setDraftItems((current) => {
      if (current.some((item) => item.weekday === weekday)) {
        return current.filter((item) => item.weekday !== weekday);
      }

      return [...current, { weekday, startTime: "18:00", endTime: "20:00" }];
    });
  }

  function updateTime(
    weekday: WeekdayIndex,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setDraftItems((current) =>
      current.map((item) => (item.weekday === weekday ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    onSave(draftItems);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 shrink-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <CalendarDays className="size-4" />
          <span className="sr-only">Cập nhật lịch học</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cập nhật lịch học</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {weekdayOptions.map((option) => {
            const scheduleItem = draftItems.find((item) => item.weekday === option.value);
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
                  <Label htmlFor={`start-${option.value}`}>Bắt đầu</Label>
                  <Input
                    id={`start-${option.value}`}
                    type="time"
                    value={scheduleItem?.startTime ?? "18:00"}
                    disabled={!checked}
                    onChange={(event) => updateTime(option.value, "startTime", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`end-${option.value}`}>Kết thúc</Label>
                  <Input
                    id={`end-${option.value}`}
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

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" disabled={draftItems.length === 0} onClick={handleSave}>
            Lưu lịch học
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
