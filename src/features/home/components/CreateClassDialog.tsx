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
import { sortScheduleItems } from "@/features/classes/utils/classSchedule";
import {
  classGradeOptions,
  type ClassGrade,
  type ClassScheduleItem,
  type CreateClassInput,
} from "@/types/class";

type CreateClassDialogProps = {
  academicYearId: number | null;
  defaultGrade?: ClassGrade;
  disabled?: boolean;
  onCreate: (input: CreateClassInput) => void | Promise<void>;
};

const initialForm = {
  name: "",
  monthlyFee: "",
};

export function CreateClassDialog({
  academicYearId,
  defaultGrade = 9,
  disabled = false,
  onCreate,
}: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [grade, setGrade] = useState<ClassGrade>(defaultGrade);
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

    if (!Number.isInteger(monthlyFee) || monthlyFee < 0) {
      setErrorMessage("Học phí tháng phải là số nguyên không âm.");
      return;
    }

    if (scheduleItems.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một buổi học trong tuần.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate({
        academicYearId: academicYearId ?? 0,
        name,
        grade,
        monthlyFee,
        scheduleItems: sortScheduleItems(scheduleItems),
      });

      setForm(initialForm);
      setScheduleItems([]);
      setOpen(false);
    } catch (error) {
      console.warn("[create-class] failed", error);
      setErrorMessage("Không lưu được lớp học mới. Thầy thử lại giúp em nhé.");
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
