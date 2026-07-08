import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";

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
import { ScheduleItemsEditor } from "@/features/classes/components/ScheduleItemsEditor";
import {
  findScheduleConflict,
  formatScheduleConflictMessage,
  isValidTimeRange,
  sortScheduleItems,
} from "@/features/classes/utils/classSchedule";
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  isValidMonthKey,
  monthsInRange,
} from "@/lib/months";
import type { AcademicYear } from "@/types/academic-year";
import {
  classGradeOptions,
  type ClassGrade,
  type ClassOverview,
  type ClassScheduleItem,
  type CreateClassInput,
} from "@/types/class";

type CreateClassDialogProps = {
  academicYearId: number | null;
  academicYear?: AcademicYear | null;
  defaultGrade?: ClassGrade;
  disabled?: boolean;
  existingClasses: ClassOverview[];
  onCreate: (input: CreateClassInput) => void | Promise<void>;
};

const initialForm = {
  name: "",
  monthlyFee: "",
};

export function CreateClassDialog({
  academicYearId,
  academicYear = null,
  defaultGrade = 9,
  disabled = false,
  existingClasses,
  onCreate,
}: CreateClassDialogProps) {
  const yearStartMonth = academicYear?.startsAt?.slice(0, 7) ?? currentMonthKey();
  const yearEndMonth = academicYear?.endsAt?.slice(0, 7) ?? addMonths(currentMonthKey(), 9);
  const monthOptions = monthsInRange(yearStartMonth, yearEndMonth);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [grade, setGrade] = useState<ClassGrade>(defaultGrade);
  const [startMonth, setStartMonth] = useState(yearStartMonth);
  const [endMonth, setEndMonth] = useState(yearEndMonth);
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setForm(initialForm);
      setGrade(defaultGrade);
      setStartMonth(yearStartMonth);
      setEndMonth(yearEndMonth);
      setScheduleItems([]);
      setErrorMessage("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const monthlyFee = Number(form.monthlyFee);

    if (!name) {
      setErrorMessage("Vui lòng nhập tên lớp.");
      return;
    }

    if (grade !== 8 && grade !== 9) {
      setErrorMessage("Khối lớp phải là Khối 8 hoặc Khối 9.");
      return;
    }

    if (!isValidMonthKey(startMonth) || !isValidMonthKey(endMonth)) {
      setErrorMessage("Vui lòng chọn tháng bắt đầu và tháng kết thúc.");
      return;
    }

    if (startMonth > endMonth) {
      setErrorMessage("Tháng bắt đầu phải trước hoặc bằng tháng kết thúc.");
      return;
    }

    if (!Number.isInteger(monthlyFee) || monthlyFee < 0) {
      setErrorMessage("Học phí tháng phải là số nguyên không âm.");
      return;
    }

    if (scheduleItems.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một buổi học trong tuần.");
      return;
    }

    if (scheduleItems.some((item) => !isValidTimeRange(item.startTime, item.endTime))) {
      setErrorMessage("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    const conflict = findScheduleConflict({
      scheduleItems,
      classes: existingClasses,
    });

    if (conflict) {
      setErrorMessage(formatScheduleConflictMessage(conflict));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate({
        academicYearId: academicYearId ?? 0,
        name,
        grade,
        startMonth,
        endMonth,
        monthlyFee,
        scheduleItems: sortScheduleItems(scheduleItems),
      });

      setForm(initialForm);
      setScheduleItems([]);
      setOpen(false);
    } catch (error) {
      console.warn("[create-class] failed", error);
      setErrorMessage(
        typeof error === "string" ? error : "Không lưu được lớp học mới. Thầy thử lại giúp em nhé.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="h-10 w-full gap-2 sm:w-auto">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Tạo lớp mới</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>Tạo lớp mới</DialogTitle>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="class-name">Tên lớp</Label>
                <Input
                  id="class-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Ví dụ: Văn 9 - Ôn thi vào 10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-grade">Khối</Label>
                <Select
                  value={String(grade)}
                  onValueChange={(value) => setGrade(Number(value) as ClassGrade)}
                >
                  <SelectTrigger id="class-grade" className="w-full bg-white">
                    <SelectValue placeholder="Chọn khối" />
                  </SelectTrigger>
                  <SelectContent>
                    {classGradeOptions.map((gradeOption) => (
                      <SelectItem key={gradeOption} value={String(gradeOption)}>
                        Khối {gradeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-fee">Học phí tháng</Label>
                <Input
                  id="class-fee"
                  inputMode="numeric"
                  value={form.monthlyFee}
                  onChange={(event) => updateField("monthlyFee", event.target.value)}
                  placeholder="700000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-start-month">Tháng bắt đầu</Label>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger id="class-start-month" className="w-full bg-white">
                    <SelectValue placeholder="Chọn tháng bắt đầu" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        Tháng {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-end-month">Tháng kết thúc</Label>
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger id="class-end-month" className="w-full bg-white">
                    <SelectValue placeholder="Chọn tháng kết thúc" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        Tháng {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lịch học</Label>
              <ScheduleItemsEditor
                items={scheduleItems}
                onChange={setScheduleItems}
                idPrefix="create-schedule"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-4 py-3">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
