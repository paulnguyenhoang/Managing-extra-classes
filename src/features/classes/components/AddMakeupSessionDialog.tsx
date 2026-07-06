import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDays,
  formatDayMonth,
  parseLocalDate,
  toDateKey,
  weekdayLabel,
  type MakeupSessionInput,
  type WeeklySession,
} from "@/features/classes/utils/attendance";
import {
  findOneTimeScheduleConflict,
  formatScheduleConflictMessage,
  isValidTimeRange,
} from "@/features/classes/utils/classSchedule";
import type { ClassOverview } from "@/types/class";

type AddMakeupSessionDialogProps = {
  classId: number;
  sessions: WeeklySession[];
  existingClasses: ClassOverview[];
  onAdd: (session: MakeupSessionInput) => string | null;
};

const initialForm = {
  date: "",
  startTime: "18:00",
  endTime: "20:00",
  makeupForSessionId: "",
};

export function AddMakeupSessionDialog({
  classId,
  sessions,
  existingClasses,
  onAdd,
}: AddMakeupSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const regularSessions = useMemo(
    () => sessions.filter((session) => !session.isMakeup),
    [sessions],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setForm(initialForm);
      setErrorMessage("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidTimeRange(form.startTime, form.endTime)) {
      setErrorMessage("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    if (form.date) {
      const conflict = findOneTimeScheduleConflict({
        date: parseLocalDate(form.date),
        startTime: form.startTime,
        endTime: form.endTime,
        classes: existingClasses,
      });

      if (conflict) {
        setErrorMessage(formatScheduleConflictMessage(conflict));
        return;
      }
    }

    const error = onAdd({
      classId: String(classId),
      date: form.date,
      startTime: form.startTime || "18:00",
      endTime: form.endTime || "20:00",
      makeupForSessionId: form.makeupForSessionId,
    });

    if (error) {
      setErrorMessage(error);
      return;
    }

    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">Thêm buổi học bù</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm buổi học bù</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="makeup-date">Ngày học bù</Label>
              <Input
                id="makeup-date"
                type="date"
                min={toDateKey(addDays(new Date(), 1))}
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-start-time">Bắt đầu</Label>
              <Input
                id="makeup-start-time"
                type="time"
                value={form.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-end-time">Kết thúc</Label>
              <Input
                id="makeup-end-time"
                type="time"
                value={form.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Bù cho buổi nào</Label>
              <Select
                value={form.makeupForSessionId}
                onValueChange={(value) => updateField("makeupForSessionId", value)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn buổi cần học bù" />
                </SelectTrigger>
                <SelectContent>
                  {regularSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {weekdayLabel(session.date)} - {formatDayMonth(session.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Buổi gốc được chọn sẽ chuyển sang nghỉ và toàn bộ học sinh buổi đó được đánh dấu Nghỉ.
          </p>
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit">Lưu buổi bù</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
