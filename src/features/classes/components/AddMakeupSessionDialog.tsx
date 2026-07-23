import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/common/DateInput";
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
  onAdd: (session: MakeupSessionInput) => Promise<string | null>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const regularSessions = useMemo(
    () => sessions.filter((session) => !session.isMakeup && session.status !== "cancelled"),
    [sessions],
  );
  const timeConflict = useMemo(() => {
    if (!form.date || !isValidTimeRange(form.startTime, form.endTime)) {
      return null;
    }

    return findOneTimeScheduleConflict({
      date: parseLocalDate(form.date),
      startTime: form.startTime,
      endTime: form.endTime,
      classes: existingClasses,
    });
  }, [existingClasses, form.date, form.endTime, form.startTime]);
  const shouldShowTimeAvailability = Boolean(form.date);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setForm(initialForm);
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.date) {
      setErrorMessage("Vui lòng chọn ngày học bù.");
      return;
    }

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

    setIsSubmitting(true);
    const error = await onAdd({
      classId: String(classId),
      date: form.date,
      startTime: form.startTime || "18:00",
      endTime: form.endTime || "20:00",
      makeupForSessionId: form.makeupForSessionId,
    });
    setIsSubmitting(false);

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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="makeup-date">Ngày học bù</Label>
              <DateInput
                id="makeup-date"
                min={toDateKey(addDays(new Date(), 1))}
                required
                value={form.date}
                onValueChange={(value) => updateField("date", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-start-time">Bắt đầu</Label>
              <Input
                id="makeup-start-time"
                type="time"
                required
                value={form.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-end-time">Kết thúc</Label>
              <Input
                id="makeup-end-time"
                type="time"
                required
                value={form.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
              />
            </div>
            {shouldShowTimeAvailability ? (
              <div className="sm:col-span-2">
                <OneTimeAvailabilityHint
                  hasValidRange={isValidTimeRange(form.startTime, form.endTime)}
                  conflict={timeConflict}
                />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label>Bù cho buổi nào</Label>
              {regularSessions.length > 0 ? (
                <div className="max-h-48 min-w-0 space-y-2 overflow-y-auto pr-1">
                  {regularSessions.map((session, index) => {
                    const isSelected = session.id === form.makeupForSessionId;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => updateField("makeupForSessionId", session.id)}
                        className={[
                          "w-full min-w-0 rounded-lg border px-3 py-2 text-left transition-colors",
                          "hover:border-emerald-200 hover:bg-emerald-50/60",
                          isSelected
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <span className="flex min-w-0 items-start justify-between gap-3">
                          <span className="min-w-0 truncate font-medium text-slate-950">
                            Buổi {index + 1}
                          </span>
                          {isSelected ? (
                            <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                          ) : null}
                        </span>
                        <span className="mt-1 block min-w-0 text-sm text-slate-600">
                          {weekdayLabel(session.date)} {formatDayMonth(session.date)} -{" "}
                          {session.startTime} đến {session.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Tuần này chưa có buổi học cố định để chọn học bù.
                </p>
              )}
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
            <Button
              type="submit"
              disabled={isSubmitting || !form.makeupForSessionId}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu buổi bù"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OneTimeAvailabilityHint({
  hasValidRange,
  conflict,
}: {
  hasValidRange: boolean;
  conflict: ReturnType<typeof findOneTimeScheduleConflict>;
}) {
  if (!hasValidRange) {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        <AlertTriangle className="size-4 shrink-0" />
        Giờ kết thúc phải sau giờ bắt đầu.
      </p>
    );
  }

  if (conflict) {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
        <AlertTriangle className="size-4 shrink-0" />
        Trùng {conflict.className}: {conflict.startTime} - {conflict.endTime}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
      <CheckCircle2 className="size-4 shrink-0" />
      Khung giờ học bù đang trống.
    </p>
  );
}
